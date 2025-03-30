// src/utils/PlatformTabUtils.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';
import * as StorageService from '../services/StorageService';

/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) return '';
  
  try {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return date.toString();
  }
};

/**
 * Format time remaining for display
 */
export const formatTimeRemaining = (seconds) => {
  if (seconds < 60) {
    return `${seconds} seconds`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
};

/**
 * Load platform data (emails and configurations)
 */
export const loadPlatformData = async (platform, setPlatformData) => {
  try {
    // Get current main account
    const account = await AccountService.getCurrentAccount();
    if (!account) {
      throw new Error("No account found. Please add an account first.");
    }
    
    // Get platform configurations
    const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
    if (!platformsConfig || !platformsConfig[platform]) {
      throw new Error(`No configuration found for ${platform}`);
    }
    
    // Set account to use for this platform
    const platformAccount = platformsConfig[platform].accountEmail || account.email;
    
    // Load saved emails if any
    const savedEmails = await GmailService.getPlatformEmails(platform, platformAccount);
    
    // Get last fetched timestamp
    const lastFetchedTimestamp = await GmailService.getLastFetchedTimestamp(platform, platformAccount);
    const lastFetched = lastFetchedTimestamp ? new Date(lastFetchedTimestamp) : null;
    
    // Update the state with all loaded data
    setPlatformData({
      accountEmail: platformAccount,
      emails: savedEmails || [],
      lastFetched
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Error loading platform data for ${platform}:`, error);
    return { 
      success: false, 
      error: error.message || `Error loading data for ${platform}`
    };
  }
};

/**
 * Fetch all emails for the platform
 */
export const fetchAllEmails = async (platform, accountEmail, platformInfo, progressCallback, setShowAiTerminal,
  setShowProgress) => {
  try {
    if (!accountEmail) {
      throw new Error('No account found. Please add an account first.');
    }
    
    // Simple query for the platform - no date filters
    const query = platformInfo.emailQuery || `from:${platform}.com`;
    
    // Use the optimized function from GmailService
    const newEmails = await GmailService.fetchAllPlatformEmails(
      platform, 
      accountEmail, 
      query,
      progressCallback,
      setShowAiTerminal,
  setShowProgress
    );
    
    // Update last fetched timestamp
    const now = new Date();
    
    return {
      success: true,
      emails: newEmails,
      lastFetched: now
    };
  } catch (error) {
    console.error(`Error fetching emails for ${platform}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch data for ${platform}`
    };
  }
};

/**
 * Fetch only latest emails since last fetch
 */
export const fetchLatestEmails = async (platform, accountEmail, lastFetched, platformInfo, progressCallback) => {
  try {
    if (!accountEmail || !lastFetched) {
      throw new Error('Missing account or last fetched timestamp');
    }
    
    // Use the optimized function from GmailService
    const updatedEmails = await GmailService.fetchLatestEmails(
      platform, 
      accountEmail, 
      lastFetched,
      progressCallback
    );
    
    // Update last fetched timestamp
    const now = new Date();
    
    // Determine if any new emails were found
    return {
      success: true,
      emails: updatedEmails,
      lastFetched: now
    };
  } catch (error) {
    console.error(`Error fetching latest emails for ${platform}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch latest data for ${platform}`
    };
  }
};

/**
 * Clear all emails for a platform
 */
export const clearEmails = async (platform, accountEmail) => {
  try {
    await GmailService.clearPlatformEmails(platform, accountEmail);
    return { success: true };
  } catch (error) {
    console.error(`Error clearing ${platform} emails:`, error);
    return { 
      success: false, 
      error: error.message || `Failed to clear data for ${platform}`
    };
  }
};

/**
 * Update platform account
 */
export const updatePlatformAccount = async (platform, accountEmail, mainAccount) => {
  try {
    if (!mainAccount) {
      throw new Error('No main account found');
    }
    
    // Get platform configurations
    const platformsConfig = await StorageService.getPlatformsForAccount(mainAccount.email) || {};
    
    // Update account for this platform
    platformsConfig[platform] = { accountEmail };
    
    // Save updated config
    await StorageService.savePlatformsForAccount(mainAccount.email, platformsConfig);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating platform account:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to update account'
    };
  }
};

export default {
  formatDate,
  formatTimeRemaining,
  loadPlatformData,
  fetchAllEmails,
  fetchLatestEmails,
  clearEmails,
  updatePlatformAccount
};