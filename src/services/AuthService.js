// src/services/AuthService.js
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AccountService from './AccountService';
import { GOOGLE_WEB_CLIENT_ID } from '../config/env';
// Constants
const TOKEN_EXPIRY_KEY = 'token_expiry';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_REFRESH_LOCK = 'token_refresh_lock';
const TOKEN_REFRESH_TIMEOUT = 30000; // 30 seconds timeout for refresh operations

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    webClientId: GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true, // This is crucial for getting refresh token
  });
};

export const signIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    
    // Extract user data from the nested structure
    const user = response.data?.user || response.user;
    
    if (!user || !user.email) {
      throw new Error('Invalid user data received from Google Sign-In');
    }
    
    // Create a simplified user object with only necessary fields
    const account = {
      id: user.id || String(Date.now()),
      email: user.email,
      name: user.name || `${user.givenName || ''} ${user.familyName || ''}`.trim(),
      photo: user.photo,
      accessToken: tokens.accessToken
    };
    
    // Save refresh token if available
    if (tokens.refreshToken) {
      await AsyncStorage.setItem(`${REFRESH_TOKEN_KEY}_${account.email}`, tokens.refreshToken);
      
      // Calculate and store expiry time (typically 1 hour from now for Google tokens)
      const expiryTime = Date.now() + (3600 * 1000); // 1 hour from now
      await AsyncStorage.setItem(`${TOKEN_EXPIRY_KEY}_${account.email}`, expiryTime.toString());
    }
    
    // Save account
    const accounts = await AsyncStorage.getItem('accounts');
    const accountsList = accounts ? JSON.parse(accounts) : [];
    
    const existingIndex = accountsList.findIndex(a => a.email === account.email);
    if (existingIndex >= 0) {
      accountsList[existingIndex] = account;
    } else {
      accountsList.push(account);
    }
    
    await AsyncStorage.setItem('accounts', JSON.stringify(accountsList));
    await AsyncStorage.setItem('currentAccount', account.email);
    
    return account;
  } catch (error) {
    console.error('SignIn error:', error);
    throw error;
  }
};

// Helper function to acquire a lock for token refresh
const acquireTokenRefreshLock = async (email) => {
  const lockKey = `${TOKEN_REFRESH_LOCK}_${email}`;
  const currentLock = await AsyncStorage.getItem(lockKey);
  
  if (currentLock) {
    const lockTime = parseInt(currentLock, 10);
    const now = Date.now();
    
    // If the lock is older than the timeout, we can override it
    if (now - lockTime > TOKEN_REFRESH_TIMEOUT) {
      await AsyncStorage.setItem(lockKey, now.toString());
      return true;
    }
    
    // Lock is still active
    return false;
  }
  
  // No lock exists, create one
  await AsyncStorage.setItem(lockKey, Date.now().toString());
  return true;
};

// Helper function to release a token refresh lock
const releaseTokenRefreshLock = async (email) => {
  const lockKey = `${TOKEN_REFRESH_LOCK}_${email}`;
  await AsyncStorage.removeItem(lockKey);
};

export const refreshTokenIfNeeded = async (email) => {
  try {
    // Check if token is expired
    const expiryTimeStr = await AsyncStorage.getItem(`token_expiry_${email}`);
    
    if (!expiryTimeStr) {
      console.log('No expiry time found, need to refresh token');
    } else {
      const expiryTime = parseInt(expiryTimeStr, 10);
      const currentTime = Date.now();
      
      // If token is still valid (with 5 minute buffer)
      if (expiryTime > currentTime + 5 * 60 * 1000) {
        console.log('Token still valid, no refresh needed');
        return true;
      }
      
      console.log('Token expired or about to expire, refreshing...');
    }
    
    // Try direct refresh first
    const newToken = await directRefreshToken(email);
    if (newToken) {
      console.log('Token refreshed successfully via direct API');
      return true;
    }
    
    // Fall back to GoogleSignin if direct refresh fails
    try {
      await GoogleSignin.signInSilently();
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens && tokens.accessToken) {
        // Update token in account
        const accounts = await AsyncStorage.getItem('accounts');
        const accountsList = accounts ? JSON.parse(accounts) : [];
        
        const existingIndex = accountsList.findIndex(a => a.email === email);
        if (existingIndex >= 0) {
          accountsList[existingIndex].accessToken = tokens.accessToken;
          
          // Update expiry time
          const newExpiryTime = Date.now() + (3600 * 1000);
          await AsyncStorage.setItem(`token_expiry_${email}`, newExpiryTime.toString());
          
          // Save updated accounts
          await AsyncStorage.setItem('accounts', JSON.stringify(accountsList));
          
          console.log('Token refreshed successfully via GoogleSignin');
          return true;
        }
      }
    } catch (silentSignInError) {
      console.error('Silent sign-in failed:', silentSignInError);
    }
    
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return false;
  }
};
export const signOut = async () => {
  try {
    // Get current user email before signing out
    const currentAccount = await AccountService.getCurrentAccount();
    const email = currentAccount ? currentAccount.email : null;
    
    await GoogleSignin.signOut();
    
    // Clear specific tokens for the user
    if (email) {
      await AsyncStorage.removeItem(`${REFRESH_TOKEN_KEY}_${email}`);
      await AsyncStorage.removeItem(`${TOKEN_EXPIRY_KEY}_${email}`);
      await AsyncStorage.removeItem(`${TOKEN_REFRESH_LOCK}_${email}`);
    }
    
    await AsyncStorage.removeItem('userInfo');
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('selectedPlatforms');
    await AsyncStorage.removeItem('currentAccount');
    
    // Clear all platform emails from storage
    const platforms = ['swiggy', 'zomato', 'flipkart', 'amazon'];
    for (const platform of platforms) {
      await AsyncStorage.removeItem(`emails_${platform}`);
    }
  } catch (error) {
    console.error('SignOut error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await GoogleSignin.getCurrentUser();
    if (user) {
      return user.user;
    }
    return null;
  } catch (error) {
    console.error('GetCurrentUser error:', error);
    return null;
  }
};

export const isUserSignedIn = async () => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (!isSignedIn) {
      return false;
    }
    
    // Also verify we have a current account
    const currentAccount = await AccountService.getCurrentAccount();
    return !!currentAccount;
  } catch (error) {
    console.error('Check sign-in status error:', error);
    return false;
  }
};

// Add this function to your AuthService.js
export const directRefreshToken = async (email) => {
  try {
    const refreshToken = await AsyncStorage.getItem(`refresh_token_${email}`);
    if (!refreshToken) {
      console.error(`No refresh token found for ${email}`);
      return null;
    }
    
    // Direct OAuth token refresh
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_WEB_CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });
    
    if (!response.ok) {
      console.error('Token refresh API error:', await response.text());
      return null;
    }
    
    const data = await response.json();
    
    if (data.access_token) {
      // Update the account with the new token
      const accounts = await AsyncStorage.getItem('accounts');
      const accountsList = accounts ? JSON.parse(accounts) : [];
      
      const existingIndex = accountsList.findIndex(a => a.email === email);
      if (existingIndex >= 0) {
        accountsList[existingIndex].accessToken = data.access_token;
        
        // Update expiry time
        const expiresIn = data.expires_in || 3600;
        const newExpiryTime = Date.now() + (expiresIn * 1000);
        await AsyncStorage.setItem(`token_expiry_${email}`, newExpiryTime.toString());
        
        // Save updated accounts
        await AsyncStorage.setItem('accounts', JSON.stringify(accountsList));
        
        return data.access_token;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Direct token refresh error:', error);
    return null;
  }
};