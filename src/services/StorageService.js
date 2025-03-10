// src/services/StorageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save emails for a specific platform
export const saveEmails = async (platform, emails) => {
  try {
    await AsyncStorage.setItem(`emails_${platform}`, JSON.stringify(emails));
    return true;
  } catch (error) {
    console.error(`Error saving ${platform} emails:`, error);
    return false;
  }
};

// Get emails for a specific platform
export const getEmails = async (platform) => {
  try {
    const emails = await AsyncStorage.getItem(`emails_${platform}`);
    return emails ? JSON.parse(emails) : [];
  } catch (error) {
    console.error(`Error getting ${platform} emails:`, error);
    return [];
  }
};

// Save selected platforms
export const savePlatforms = async (platforms, accountEmail) => {
    try {
      await AsyncStorage.setItem(`platforms_${accountEmail}`, JSON.stringify(platforms));
      return true;
    } catch (error) {
      console.error('Error saving platforms:', error);
      return false;
    }
  };
  
  export const getPlatforms = async (accountEmail) => {
    try {
      const platforms = await AsyncStorage.getItem(`platforms_${accountEmail}`);
      return platforms ? JSON.parse(platforms) : [];
    } catch (error) {
      console.error('Error getting platforms:', error);
      return [];
    }
  };

// Clear all data (for sign out)
export const clearAllData = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

// Check these functions in StorageService.js
// In StorageService.js
export const getPlatformsForAccount = async (accountEmail) => {
    try {
      if (!accountEmail) {
        console.log('No account email provided');
        return {};
      }
      
      console.log('Getting platforms for:', accountEmail);
      const platforms = await AsyncStorage.getItem(`platforms_${accountEmail}`);
      console.log('Raw platforms data:', platforms);
      
      // If no data exists yet, return empty object instead of null
      if (!platforms) {
        console.log('No platforms found, returning empty object');
        return {};
      }
      
      return JSON.parse(platforms);
    } catch (error) {
      console.error('Error getting platforms for account:', error);
      return {};
    }
  };
  
  export const savePlatformsForAccount = async (accountEmail, platformSelections) => {
    try {
      if (!accountEmail) {
        console.log('No account email provided');
        return false;
      }
      
      if (!platformSelections || Object.keys(platformSelections).length === 0) {
        console.log('No platform selections to save');
        return false;
      }
      
      console.log('Saving platforms for:', accountEmail);
      console.log('Platform selections:', JSON.stringify(platformSelections));
      
      await AsyncStorage.setItem(`platforms_${accountEmail}`, JSON.stringify(platformSelections));
      
      // Verify save was successful
      const savedData = await AsyncStorage.getItem(`platforms_${accountEmail}`);
      console.log('Verification - saved data:', savedData);
      
      return true;
    } catch (error) {
      console.error('Error saving platforms for account:', error);
      return false;
    }
  };