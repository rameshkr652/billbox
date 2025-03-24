// src/services/PermissionService.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenCache } from './GmailService';

// The Gmail scope we require for the app
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Directly check Gmail API access with a test call
 * This is the most reliable way to determine if we have proper permissions
 */
const testGmailApiAccess = async (accessToken) => {
  if (!accessToken) return false;
  
  try {
    console.log('Testing Gmail API access with token');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      console.log('Gmail API access test: PASS');
      return true;
    } else {
      const errorData = await response.text();
      console.log(`Gmail API access test: FAIL (${response.status}) - ${errorData}`);
      return false;
    }
  } catch (error) {
    console.error('Error testing Gmail API access:', error);
    return false;
  }
};

/**
 * Check if the user has granted the required Gmail scope
 * @returns {Promise<boolean>} True if Gmail API is accessible
 */
export const hasRequiredGmailPermissions = async () => {
  try {
    console.log('Checking required Gmail permissions...');
    
    // Get the current user
    const userInfo = await GoogleSignin.getCurrentUser();
    if (!userInfo || !userInfo.user || !userInfo.user.email) {
      console.log('No user is signed in');
      await AsyncStorage.setItem('hasGmailPermission', 'false');
      return false;
    }
    
    const userEmail = userInfo.user.email;
    console.log(`Current user: ${userEmail}`);
    
    // Try to use a fresh token from the GmailService tokenCache
    // This bypasses potentially stale tokens from GoogleSignin.getTokens()
    let accessToken;
    
    try {
      // First try to get a fresh token
      const refreshResponse = await fetch(
        'https://www.googleapis.com/oauth2/v4/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
            refresh_token: await AsyncStorage.getItem(`refresh_token_${userEmail}`),
            grant_type: 'refresh_token',
          }).toString(),
        }
      );
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.access_token) {
          console.log('Successfully refreshed token directly');
          accessToken = refreshData.access_token;
          
          // Update the token cache with new token
          tokenCache.setToken(userEmail, accessToken);
          
          // Update expiry time
          const expiresIn = refreshData.expires_in || 3600;
          const newExpiryTime = Date.now() + (expiresIn * 1000);
          await AsyncStorage.setItem(`token_expiry_${userEmail}`, newExpiryTime.toString());
        }
      } else {
        console.log('Direct token refresh failed, trying GoogleSignin');
      }
    } catch (refreshError) {
      console.log('Error refreshing token directly:', refreshError.message);
      // Continue to try other methods
    }
    
    // If we couldn't refresh directly, try GoogleSignin
    if (!accessToken) {
      try {
        // Force a fresh token from GoogleSignin
        await GoogleSignin.clearCachedAccessToken(
          (await GoogleSignin.getTokens()).accessToken
        );
        const tokens = await GoogleSignin.getTokens();
        
        if (tokens && tokens.accessToken) {
          console.log('Got fresh token from GoogleSignin');
          accessToken = tokens.accessToken;
          
          // Update the token cache
          tokenCache.setToken(userEmail, accessToken);
        } else {
          console.log('No access token available from GoogleSignin');
        }
      } catch (googleError) {
        console.log('Error getting token from GoogleSignin:', googleError.message);
      }
    }
    
    // If we still don't have a token, check if one is cached in the service
    if (!accessToken) {
      accessToken = tokenCache.getToken(userEmail);
      if (accessToken) {
        console.log('Using cached token from tokenCache');
      } else {
        console.log('No token available at all, permissions denied');
        await AsyncStorage.setItem('hasGmailPermission', 'false');
        return false;
      }
    }
    
    // Now test with our best token
    console.log('Testing API with best available token');
    const hasAccess = await testGmailApiAccess(accessToken);
    
    // Cache the result
    await AsyncStorage.setItem('hasGmailPermission', String(hasAccess));
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking Gmail permissions:', error);
    await AsyncStorage.setItem('hasGmailPermission', 'false');
    return false;
  }
};

/**
 * Re-authenticate the user with specific Gmail scope
 * This forces a fresh OAuth screen with the required permissions
 */
export const reAuthenticateWithGmailScope = async () => {
  try {
    console.log('Starting Gmail re-authentication flow...');
    
    // Force clean state
    try {
      await GoogleSignin.revokeAccess();
      console.log('Successfully revoked previous access');
    } catch (error) {
      console.log('Revoke access failed (this is usually OK):', error.message);
    }
    
    // Sign out to clear state
    await GoogleSignin.signOut();
    console.log('Signed out current user');
    
    // Configure with required scopes
    GoogleSignin.configure({
      scopes: [REQUIRED_SCOPE],
      webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    console.log('Configured GoogleSignin with required scopes');
    
    // Start fresh sign-in
    const userInfo = await GoogleSignin.signIn();
    if (!userInfo) {
      console.log('Sign-in failed - no user info returned');
      return false;
    }
    
    console.log('User signed in successfully');
    
    // Get fresh tokens
    const tokens = await GoogleSignin.getTokens();
    if (!tokens || !tokens.accessToken) {
      console.log('Failed to get access token');
      return false;
    }
    
    console.log('Got fresh access token');
    
    // Clean up any token caches
    if (userInfo.user && userInfo.user.email) {
      tokenCache.clearToken(userInfo.user.email);
      console.log('Cleared token cache for', userInfo.user.email);
    }
    
    // Test access with the new token
    const hasAccess = await testGmailApiAccess(tokens.accessToken);
    
    // Store the result
    await AsyncStorage.setItem('hasGmailPermission', String(hasAccess));
    
    // Store refresh token if available
    if (tokens.refreshToken && userInfo.user && userInfo.user.email) {
      await AsyncStorage.setItem(`refresh_token_${userInfo.user.email}`, tokens.refreshToken);
      console.log('Saved refresh token');
      
      // Set expiry (1 hour from now)
      const expiryTime = Date.now() + (3600 * 1000);
      await AsyncStorage.setItem(`token_expiry_${userInfo.user.email}`, expiryTime.toString());
    }
    
    if (hasAccess) {
      console.log('Re-authentication successful: Gmail access GRANTED');
    } else {
      console.log('Re-authentication failed: Gmail access DENIED');
    }
    
    return hasAccess;
  } catch (error) {
    console.error('Error during re-authentication:', error);
    await AsyncStorage.setItem('hasGmailPermission', 'false');
    return false;
  }
};

/**
 * Check cached permission state
 * @returns {Promise<boolean|null>} True/false if cached, null if not cached
 */
export const getCachedPermissionState = async () => {
  try {
    const hasPermission = await AsyncStorage.getItem('hasGmailPermission');
    if (hasPermission === 'true') return true;
    if (hasPermission === 'false') return false;
    return null; // No cached state
  } catch (error) {
    console.error('Error getting cached permission state:', error);
    return null;
  }
};

/**
 * Clear cached permission state - useful when troubleshooting
 */
export const clearCachedPermissionState = async () => {
  try {
    await AsyncStorage.removeItem('hasGmailPermission');
    console.log('Cleared cached permission state');
    return true;
  } catch (error) {
    console.error('Error clearing cached permission state:', error);
    return false;
  }
};

export default {
  hasRequiredGmailPermissions,
  reAuthenticateWithGmailScope,
  getCachedPermissionState,
  clearCachedPermissionState,
  REQUIRED_SCOPE
};