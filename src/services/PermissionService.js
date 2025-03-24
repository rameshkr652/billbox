// src/services/PermissionService.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The Gmail scope we require for the app
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Check if the user has granted the required Gmail scope
 * @returns {Promise<boolean>} True if the required scope is present
 */
export const hasRequiredGmailPermissions = async () => {
  try {
    // Get the currently signed-in user
    const userInfo = await GoogleSignin.getCurrentUser();
    
    if (!userInfo) {
      console.log('No user is currently signed in');
      return false;
    }
    
    // Get the granted scopes for the user
    const tokens = await GoogleSignin.getTokens();
    
    // Check if the tokens have a scopes property
    if (!tokens || !tokens.accessToken) {
      console.log('No tokens available, user might need to re-authenticate');
      return false;
    }
    
    // Use direct API call to get token info including scopes
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${tokens.accessToken}`);
    const tokenInfo = await response.json();
    
    if (!response.ok) {
      console.error('Error getting token info:', tokenInfo);
      return false;
    }
    
    // Check if the required scope is in the granted scopes
    const grantedScopes = tokenInfo.scope ? tokenInfo.scope.split(' ') : [];
    const hasGmailScope = grantedScopes.includes(REQUIRED_SCOPE);
    
    console.log('Gmail scope granted:', hasGmailScope);
    
    // Store the permission state
    await AsyncStorage.setItem('hasGmailPermission', String(hasGmailScope));
    
    return hasGmailScope;
  } catch (error) {
    console.error('Error checking Gmail permissions:', error);
    return false;
  }
};

/**
 * Re-authenticate the user to request the Gmail scope
 * @returns {Promise<boolean>} True if authentication was successful
 */
export const reAuthenticateWithGmailScope = async () => {
  try {
    // Sign out first to ensure the permission screen shows
    await GoogleSignin.signOut();
    
    // Configure GoogleSignin to request Gmail scope
    GoogleSignin.configure({
      scopes: [REQUIRED_SCOPE],
      webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true, // Forces a fresh token with consent screen
    });
    
    // Start sign in process
    const userInfo = await GoogleSignin.signIn();
    const tokens = await GoogleSignin.getTokens();
    
    if (!userInfo || !tokens.accessToken) {
      console.log('Re-authentication failed');
      return false;
    }
    
    // Verify the required scope is granted
    const hasGmailScope = await hasRequiredGmailPermissions();
    
    return hasGmailScope;
  } catch (error) {
    console.error('Error during re-authentication:', error);
    return false;
  }
};

/**
 * Check cached permission state to avoid frequent API calls
 * @returns {Promise<boolean>} True if the cached state indicates permission was granted
 */
export const getCachedPermissionState = async () => {
  try {
    const hasPermission = await AsyncStorage.getItem('hasGmailPermission');
    return hasPermission === 'true';
  } catch (error) {
    console.error('Error getting cached permission state:', error);
    return false;
  }
};

export default {
  hasRequiredGmailPermissions,
  reAuthenticateWithGmailScope,
  getCachedPermissionState,
  REQUIRED_SCOPE
};