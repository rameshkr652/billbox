// src/services/StorageService.js - Improved with better error handling and logging
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save emails for a specific platform and account
export const saveEmails = async (platform, emails, accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('saveEmails: No account email provided');
      return false;
    }
    
    const storageKey = `emails_${platform}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(emails));
    console.log(`Saved ${emails.length} emails for ${platform} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error saving ${platform} emails for ${accountEmail}:`, error);
    return false;
  }
};

// Get emails for a specific platform and account
export const getEmails = async (platform, accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('getEmails: No account email provided');
      return [];
    }
    
    const storageKey = `emails_${platform}_${accountEmail}`;
    const emails = await AsyncStorage.getItem(storageKey);
    const parsedEmails = emails ? JSON.parse(emails) : [];
    console.log(`Retrieved ${parsedEmails.length} emails for ${platform} with account ${accountEmail}`);
    return parsedEmails;
  } catch (error) {
    console.error(`Error getting ${platform} emails for ${accountEmail}:`, error);
    return [];
  }
};

// Save platform configuration for a specific account
export const savePlatformsForAccount = async (accountEmail, platformSelections) => {
  try {
    if (!accountEmail) {
      console.error('savePlatformsForAccount: No account email provided');
      return false;
    }
    
    if (!platformSelections || Object.keys(platformSelections).length === 0) {
      console.warn('No platform selections to save');
      return false;
    }
    
    const storageKey = `platforms_${accountEmail}`;
    
    console.log(`Saving platforms for ${accountEmail}:`, JSON.stringify(platformSelections));
    await AsyncStorage.setItem(storageKey, JSON.stringify(platformSelections));
    
    // Verify save was successful
    const savedData = await AsyncStorage.getItem(storageKey);
    const verified = savedData ? JSON.parse(savedData) : null;
    
    if (verified) {
      console.log(`Successfully saved and verified platforms for ${accountEmail}`);
      return true;
    } else {
      console.error(`Failed to verify saved platforms for ${accountEmail}`);
      return false;
    }
  } catch (error) {
    console.error(`Error saving platforms for account ${accountEmail}:`, error);
    return false;
  }
};

// Get platform configuration for a specific account
export const getPlatformsForAccount = async (accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('getPlatformsForAccount: No account email provided');
      return {};
    }
    
    const storageKey = `platforms_${accountEmail}`;
    const platforms = await AsyncStorage.getItem(storageKey);
    
    if (!platforms) {
      console.log(`No platforms found for ${accountEmail}, returning empty object`);
      return {};
    }
    
    const parsedPlatforms = JSON.parse(platforms);
    console.log(`Retrieved platforms for ${accountEmail}:`, Object.keys(parsedPlatforms));
    return parsedPlatforms;
  } catch (error) {
    console.error(`Error getting platforms for account ${accountEmail}:`, error);
    return {};
  }
};

// Clear platform data for a specific platform and account
export const clearPlatformData = async (platform, accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('clearPlatformData: No account email provided');
      return false;
    }
    
    const emailsKey = `emails_${platform}_${accountEmail}`;
    const timestampKey = `lastFetched_${platform}_${accountEmail}`;
    
    await AsyncStorage.removeItem(emailsKey);
    await AsyncStorage.removeItem(timestampKey);
    
    console.log(`Cleared data for ${platform} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error clearing data for ${platform} with account ${accountEmail}:`, error);
    return false;
  }
};

// Utility function to debug AsyncStorage contents
export const debugAsyncStorage = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    console.log('All AsyncStorage keys:', keys);
    
    // Get all platform configurations
    const platformKeys = keys.filter(key => key.startsWith('platforms_'));
    
    for (const key of platformKeys) {
      const value = await AsyncStorage.getItem(key);
      try {
        const parsed = JSON.parse(value);
        console.log(`${key}:`, parsed);
      } catch (e) {
        console.log(`${key} (raw):`, value);
      }
    }
    
    // Get all account information
    const accountData = await AsyncStorage.getItem('accounts');
    if (accountData) {
      try {
        const accounts = JSON.parse(accountData);
        console.log('All accounts:', accounts.map(acc => acc.email));
      } catch (e) {
        console.log('Accounts (raw):', accountData);
      }
    }
    
    return keys;
  } catch (error) {
    console.error('Error debugging AsyncStorage:', error);
    return [];
  }
};

// Clear all data for a specific account
export const clearAccountData = async (accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('clearAccountData: No account email provided');
      return false;
    }
    
    const keys = await AsyncStorage.getAllKeys();
    
    // Find all keys related to this account
    const accountKeys = keys.filter(key => 
      key.includes(`_${accountEmail}`) || 
      key === `platforms_${accountEmail}`
    );
    
    if (accountKeys.length > 0) {
      await AsyncStorage.multiRemove(accountKeys);
      console.log(`Cleared ${accountKeys.length} items for account ${accountEmail}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error clearing data for account ${accountEmail}:`, error);
    return false;
  }
};

// Clear all data (for sign out)
export const clearAllData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    console.log('All data cleared from AsyncStorage');
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

// Verify if a platform configuration exists for an account
export const verifyPlatformConfig = async (accountEmail, platform) => {
  try {
    if (!accountEmail || !platform) {
      return false;
    }
    
    const platformsConfig = await getPlatformsForAccount(accountEmail);
    return platformsConfig && platformsConfig[platform] !== undefined;
  } catch (error) {
    console.error(`Error verifying platform config for ${platform} with ${accountEmail}:`, error);
    return false;
  }
};

// Add a platform to an account's configuration
export const addPlatformToAccount = async (accountEmail, platform, platformAccount = null) => {
  try {
    if (!accountEmail || !platform) {
      return false;
    }
    
    const platformsConfig = await getPlatformsForAccount(accountEmail) || {};
    
    // Set the platform account to use (default to the main account if not specified)
    platformsConfig[platform] = { accountEmail: platformAccount || accountEmail };
    
    return await savePlatformsForAccount(accountEmail, platformsConfig);
  } catch (error) {
    console.error(`Error adding platform ${platform} to account ${accountEmail}:`, error);
    return false;
  }
};

// Remove a platform from an account's configuration
export const removePlatformFromAccount = async (accountEmail, platform) => {
  try {
    if (!accountEmail || !platform) {
      return false;
    }
    
    const platformsConfig = await getPlatformsForAccount(accountEmail);
    
    if (platformsConfig && platformsConfig[platform]) {
      // Remove the platform
      delete platformsConfig[platform];
      
      // Save the updated configuration
      await savePlatformsForAccount(accountEmail, platformsConfig);
      
      // Clean up related data
      await clearPlatformData(platform, accountEmail);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error removing platform ${platform} from account ${accountEmail}:`, error);
    return false;
  }
};