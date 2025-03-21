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

// Enhanced bank-related methods for StorageService.js

// Get banks for a specific account
export const getBanksForAccount = async (accountEmail) => {
  try {
    if (!accountEmail) {
      console.error('getBanksForAccount: No account email provided');
      return [];
    }
    
    const storageKey = `banks_${accountEmail}`;
    const banks = await AsyncStorage.getItem(storageKey);
    
    if (!banks) {
      console.log(`No banks found for ${accountEmail}, returning empty array`);
      return [];
    }
    
    const parsedBanks = JSON.parse(banks);
    console.log(`Retrieved ${parsedBanks.length} banks for ${accountEmail}`);
    return parsedBanks;
  } catch (error) {
    console.error(`Error getting banks for account ${accountEmail}:`, error);
    return [];
  }
};

// Save banks for a specific account
export const saveBanksForAccount = async (accountEmail, banks) => {
  try {
    if (!accountEmail) {
      console.error('saveBanksForAccount: No account email provided');
      return false;
    }
    
    const storageKey = `banks_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(banks));
    console.log(`Saved ${banks.length} banks for ${accountEmail}`);
    
    // Verify the save was successful
    const savedBanks = await AsyncStorage.getItem(storageKey);
    if (!savedBanks) {
      console.error(`Failed to verify saved banks for ${accountEmail}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error saving banks for account ${accountEmail}:`, error);
    return false;
  }
};

// Add a bank to an account
export const addBankToAccount = async (accountEmail, bank) => {
  try {
    if (!accountEmail || !bank) {
      return false;
    }
    
    // Get existing banks
    const banks = await getBanksForAccount(accountEmail);
    
    // Check if bank already exists
    const existingIndex = banks.findIndex(b => b.id === bank.id);
    if (existingIndex >= 0) {
      // Update existing bank
      banks[existingIndex] = {...banks[existingIndex], ...bank};
    } else {
      // Add new bank
      banks.push(bank);
    }
    
    // Save updated banks
    return await saveBanksForAccount(accountEmail, banks);
  } catch (error) {
    console.error(`Error adding bank for account ${accountEmail}:`, error);
    return false;
  }
};

// Remove a bank from an account
export const removeBankFromAccount = async (accountEmail, bankId) => {
  try {
    if (!accountEmail || !bankId) {
      return false;
    }
    
    // Get existing banks
    const banks = await getBanksForAccount(accountEmail);
    
    // Filter out the bank
    const updatedBanks = banks.filter(bank => bank.id !== bankId);
    
    // Save updated banks
    const saved = await saveBanksForAccount(accountEmail, updatedBanks);
    
    if (saved) {
      // Also clean up any transaction data
      await clearBankData(accountEmail, bankId);
    }
    
    return saved;
  } catch (error) {
    console.error(`Error removing bank for account ${accountEmail}:`, error);
    return false;
  }
};

// Clear bank data for a specific bank and account
export const clearBankData = async (accountEmail, bankId) => {
  try {
    if (!accountEmail || !bankId) {
      return false;
    }
    
    const transactionsKey = `bank_transactions_${bankId}_${accountEmail}`;
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    
    await AsyncStorage.removeItem(transactionsKey);
    await AsyncStorage.removeItem(timestampKey);
    
    console.log(`Cleared data for bank ${bankId} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error clearing bank data for ${bankId} with ${accountEmail}:`, error);
    return false;
  }
};

// Clear all bank data for an account
export const clearAllBankData = async (accountEmail) => {
  try {
    if (!accountEmail) {
      return false;
    }
    
    // Get all banks for this account
    const banks = await getBanksForAccount(accountEmail);
    
    // Clear data for each bank
    for (const bank of banks) {
      await clearBankData(accountEmail, bank.id);
    }
    
    // Remove the banks list
    const storageKey = `banks_${accountEmail}`;
    await AsyncStorage.removeItem(storageKey);
    
    console.log(`Cleared all bank data for account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error clearing all bank data for account ${accountEmail}:`, error);
    return false;
  }
};

// Get transactions for a specific bank and account
export const getBankTransactions = async (accountEmail, bankId) => {
  try {
    if (!accountEmail || !bankId) {
      return [];
    }
    
    const storageKey = `bank_transactions_${bankId}_${accountEmail}`;
    const transactions = await AsyncStorage.getItem(storageKey);
    
    if (!transactions) {
      return [];
    }
    
    return JSON.parse(transactions);
  } catch (error) {
    console.error(`Error getting transactions for ${bankId} with ${accountEmail}:`, error);
    return [];
  }
};

// Save transactions for a specific bank and account
export const saveBankTransactions = async (accountEmail, bankId, transactions) => {
  try {
    if (!accountEmail || !bankId) {
      return false;
    }
    
    const storageKey = `bank_transactions_${bankId}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(transactions));
    
    // Update last updated timestamp
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    await AsyncStorage.setItem(timestampKey, Date.now().toString());
    
    return true;
  } catch (error) {
    console.error(`Error saving transactions for ${bankId} with ${accountEmail}:`, error);
    return false;
  }
};

// Get last updated timestamp for bank transactions
export const getBankLastUpdated = async (accountEmail, bankId) => {
  try {
    if (!accountEmail || !bankId) {
      return null;
    }
    
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    const timestamp = await AsyncStorage.getItem(timestampKey);
    
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error(`Error getting last updated timestamp for ${bankId} with ${accountEmail}:`, error);
    return null;
  }
};