// src/services/BankService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as GmailService from './GmailService';
import banks from '../constants/banks';
import * as AccountService from './AccountService';

// src/services/BankService.js - Enhanced with improved transaction storage

/**
 * Fetch bank transactions with optimized storage
 */
export const fetchBankTransactions = async (
  bankId,
  accountEmail,
  timeFrame = 'THIS_MONTH',
  customRange = null,
  progressCallback = () => {}
) => {
  try {
    // Validate inputs
    if (!bankId || !accountEmail) {
      throw new Error('Missing required parameters');
    }

    // Get bank info
    const bankInfo = banks.find(bank => bank.id === bankId);
    if (!bankInfo) {
      throw new Error(`Bank information not found for ${bankId}`);
    }

    // Helper function to format dates for Gmail API queries
    const formatGmailDate = (date) => {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };

    // Build time-based query
    let timeQuery = '';
    const now = new Date();

    switch (timeFrame) {
      case 'THIS_MONTH':
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        timeQuery = `after:${formatGmailDate(firstOfMonth)}`;
        break;
        
      case 'LAST_MONTH':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        timeQuery = `after:${formatGmailDate(lastMonthStart)} before:${formatGmailDate(lastMonthEnd)}`;
        break;
        
      case 'LAST_3_MONTHS':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(now.getMonth() - 3);
        timeQuery = `after:${formatGmailDate(threeMonthsAgo)}`;
        break;
        
      case 'LAST_6_MONTHS':
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        timeQuery = `after:${formatGmailDate(sixMonthsAgo)}`;
        break;
        
      case 'CUSTOM':
        if (!customRange || !customRange.startDate || !customRange.endDate) {
          throw new Error('Custom range requires startDate and endDate');
        }
        timeQuery = `after:${formatGmailDate(customRange.startDate)} before:${formatGmailDate(customRange.endDate)}`;
        break;
        
      default:
        throw new Error('Invalid time frame');
    }

    // Construct the full query
    const fullQuery = `${bankInfo.emailQuery} ${timeQuery}`.trim();
    console.log(`Bank query: ${fullQuery}`);

    // Step 1: Fetch emails based on the query (with progress callback)
    const emails = await GmailService.fetchAllPlatformEmails(
      `bank_${bankId}`,
      accountEmail,
      fullQuery,
      (current, total, message, estimatedTimeRemaining) => {
        if (message === 'COMPLETE_SIGNAL') {
          progressCallback(current, total, message, estimatedTimeRemaining);
          return;
        }
        
        progressCallback(
          current,
          total,
          message || `Processing ${bankInfo.name} transactions (${current}/${total})...`,
          estimatedTimeRemaining
        );
      }
    );

    // Step 2: Parse transactions 
    progressCallback(emails.length, emails.length, 'Processing transaction data...');
    
    const transactions = emails.map(email => {
      return {
        id: email.id,
        date: email.date,
        bankId: bankId,
        rawEmailData: email,
        bankName: bankInfo.name,
        // Add parsed transaction details if available
        ...(email.orderDetails || {})
      };
    });

    // Step 3: Save transactions with improved storage
    progressCallback(emails.length, emails.length, 'Saving transactions...');
    
    // Implement enhanced storage with retry mechanism
    await saveTransactionsWithRetry(bankId, accountEmail, transactions, timeFrame, customRange);

    // Set last updated timestamp
    await setLastUpdatedTimestamp(bankId, accountEmail);
    
    // Signal complete
    progressCallback(emails.length, emails.length, 'COMPLETE_SIGNAL');

    return {
      success: true,
      transactions,
      lastFetched: new Date(),
      timeFrame
    };
  } catch (error) {
    console.error(`Error fetching bank transactions for ${bankId}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch transactions for ${bankId}`
    };
  }
};

/**
 * Improved transaction storage with retry mechanism
 */
export const saveTransactionsWithRetry = async (bankId, accountEmail, transactions, timeFrame, customRange) => {
  if (!transactions || transactions.length === 0) {
    return true;
  }
  
  const MAX_CHUNK_SIZE = 25; // Smaller chunks for better reliability
  const MAX_RETRIES = 3;
  
  try {
    // Prepare metadata
    const metadataKey = `bank_metadata_${bankId}_${accountEmail}`;
    const metadata = {
      lastUpdated: Date.now(),
      timeFrame,
      customRange: customRange || null,
      totalTransactions: transactions.length,
      chunksCount: Math.ceil(transactions.length / MAX_CHUNK_SIZE)
    };
    
    // Save metadata first
    await AsyncStorage.setItem(metadataKey, JSON.stringify(metadata));
    
    // Create chunks
    const chunks = [];
    for (let i = 0; i < transactions.length; i += MAX_CHUNK_SIZE) {
      chunks.push(transactions.slice(i, i + MAX_CHUNK_SIZE));
    }
    
    // Save chunks with retry
    for (let i = 0; i < chunks.length; i++) {
      let success = false;
      let attempts = 0;
      
      // Retry loop for each chunk
      while (!success && attempts < MAX_RETRIES) {
        try {
          const chunkKey = `bank_transactions_${bankId}_${accountEmail}_chunk_${i}`;
          await AsyncStorage.setItem(chunkKey, JSON.stringify(chunks[i]));
          success = true;
        } catch (error) {
          console.warn(`Error saving chunk ${i}, attempt ${attempts + 1}:`, error);
          attempts++;
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // If chunk saving failed after all retries
      if (!success) {
        console.error(`Failed to save chunk ${i} after ${MAX_RETRIES} attempts`);
        // Continue with other chunks instead of failing everything
      }
    }
    
    // Save chunk index to know how many chunks we have
    const indexKey = `bank_transactions_${bankId}_${accountEmail}_chunks`;
    await AsyncStorage.setItem(indexKey, chunks.length.toString());
    
    return true;
  } catch (error) {
    console.error(`Error saving transactions for ${bankId}:`, error);
    return false;
  }
}

/**
 * Set last updated timestamp
 */
export const setLastUpdatedTimestamp = async (bankId, accountEmail) => {
  try {
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    await AsyncStorage.setItem(timestampKey, Date.now().toString());
    return true;
  } catch (error) {
    console.error(`Error setting last updated timestamp for ${bankId}:`, error);
    return false;
  }
}

/**
 * Enhanced transaction retrieval from storage
 */
export const getTransactions = async (bankId, accountEmail) => {
  try {
    if (!bankId || !accountEmail) {
      return [];
    }
    
    // First, check if we have chunked data
    const indexKey = `bank_transactions_${bankId}_${accountEmail}_chunks`;
    const chunksCountStr = await AsyncStorage.getItem(indexKey);
    
    if (chunksCountStr) {
      // We have chunked data
      const chunksCount = parseInt(chunksCountStr, 10);
      let allTransactions = [];
      
      // Load each chunk
      for (let i = 0; i < chunksCount; i++) {
        const chunkKey = `bank_transactions_${bankId}_${accountEmail}_chunk_${i}`;
        const chunkData = await AsyncStorage.getItem(chunkKey);
        
        if (chunkData) {
          try {
            const chunkTransactions = JSON.parse(chunkData);
            allTransactions = [...allTransactions, ...chunkTransactions];
          } catch (parseError) {
            console.error(`Error parsing chunk ${i}:`, parseError);
          }
        }
      }
      
      return allTransactions;
    } else {
      // Check for legacy non-chunked data
      const legacyKey = `bank_transactions_${bankId}_${accountEmail}`;
      const legacyData = await AsyncStorage.getItem(legacyKey);
      
      if (legacyData) {
        try {
          return JSON.parse(legacyData);
        } catch (parseError) {
          console.error('Error parsing legacy data:', parseError);
          return [];
        }
      }
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting transactions for ${bankId}:`, error);
    return [];
  }
};

/**
 * Clear transactions with improved error handling
 */
export const clearTransactions = async (bankId, accountEmail) => {
  try {
    if (!bankId || !accountEmail) {
      return false;
    }
    
    // Check for chunked data
    const indexKey = `bank_transactions_${bankId}_${accountEmail}_chunks`;
    const chunksCountStr = await AsyncStorage.getItem(indexKey);
    
    if (chunksCountStr) {
      const chunksCount = parseInt(chunksCountStr, 10);
      
      // Remove each chunk
      for (let i = 0; i < chunksCount; i++) {
        const chunkKey = `bank_transactions_${bankId}_${accountEmail}_chunk_${i}`;
        await AsyncStorage.removeItem(chunkKey);
      }
      
      // Remove chunk index
      await AsyncStorage.removeItem(indexKey);
    }
    
    // Always check and remove legacy data
    const legacyKey = `bank_transactions_${bankId}_${accountEmail}`;
    await AsyncStorage.removeItem(legacyKey);
    
    // Remove metadata and timestamp
    const metadataKey = `bank_metadata_${bankId}_${accountEmail}`;
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    
    await AsyncStorage.removeItem(metadataKey);
    await AsyncStorage.removeItem(timestampKey);
    
    return true;
  } catch (error) {
    console.error(`Error clearing transactions for ${bankId}:`, error);
    return false;
  }
};