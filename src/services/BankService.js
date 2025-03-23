// src/services/BankService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as GmailService from './GmailService';
import banks from '../constants/banks';
import * as AccountService from './AccountService';

/**
 * Fetch bank transactions for a specific bank, account, and time frame
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @param {string} timeFrame - Time frame option (e.g., 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM')
 * @param {Object} customRange - Optional { startDate, endDate } for custom time frame
 * @param {function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Object with success status and transactions
 */
export const fetchBankTransactions = async (
  bankId,
  accountEmail,
  timeFrame = 'THIS_MONTH', // Default matches TIME_FRAMES.THIS_MONTH
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

    // Build time-based query with proper Gmail syntax
    let timeQuery = '';
    const now = new Date();

    switch (timeFrame) {
      case 'THIS_MONTH':
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        // After start of month, before is implied (current date)
        timeQuery = `after:${formatGmailDate(firstOfMonth)}`;
        break;
        
      case 'LAST_MONTH':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
        // Use after: and before: syntax
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
        // Use after: and before: syntax for custom range
        timeQuery = `after:${formatGmailDate(customRange.startDate)} before:${formatGmailDate(customRange.endDate)}`;
        break;
        
      default:
        throw new Error('Invalid time frame');
    }

    // Construct the full query
    const fullQuery = `${bankInfo.emailQuery} ${timeQuery}`.trim();
    console.log(`Bank query: ${fullQuery}`);

    // Fetch emails based on the query
    const emails = await GmailService.fetchAllPlatformEmails(
      `bank_${bankId}`,
      accountEmail,
      fullQuery,
      (current, total, message, estimatedTimeRemaining) => {
        // Pass through the COMPLETE_SIGNAL if present
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

    // Parse transactions based on bank type with proper platform ID
    const transactions = emails.map(email => {
      // Extract core transaction data, ignore snippet, from, etc.
      const parsedTransaction = {
        id: email.id,
        date: email.date,
        bankId: bankId,
        rawEmailData: email,
        bankName: bankInfo.name
      };
      
      // Add parsed transaction details if available
      if (email.orderDetails) {
        Object.assign(parsedTransaction, email.orderDetails);
      }
      
      return parsedTransaction;
    });

    // Save transactions with time frame metadata
    await saveTransactions(bankId, accountEmail, transactions, timeFrame, customRange);

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
 * Get transaction metadata
 */
export const getTransactionMetadata = async (bankId, accountEmail) => {
  try {
    const metadataKey = `bank_metadata_${bankId}_${accountEmail}`;
    const data = await AsyncStorage.getItem(metadataKey);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error getting metadata for ${bankId}:`, error);
    return null;
  }
};

/**
 * Fetch latest bank transactions since the last update
 */
export const fetchLatestBankTransactions = async (bankId, accountEmail, lastFetchedDate, progressCallback = () => {}) => {
  try {
    if (!bankId || !accountEmail || !lastFetchedDate) {
      throw new Error('Missing required parameters');
    }
    
    // Get bank info
    const bankInfo = banks.find(bank => bank.id === bankId);
    if (!bankInfo) {
      throw new Error(`Bank information not found for ${bankId}`);
    }
    
    // Format date for Gmail query (subtract 12 hours to ensure overlap)
    const queryDate = new Date(lastFetchedDate.getTime() - (12 * 60 * 60 * 1000));
    const formatDate = (date) => {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };
    
    // Create query with date filter using proper after: syntax
    const dateQuery = `after:${formatDate(queryDate)}`;
    const fullQuery = `${bankInfo.emailQuery} ${dateQuery}`;
    
    // Fetch latest emails
    const newEmails = await GmailService.fetchAllPlatformEmails(
      `bank_${bankId}`,
      accountEmail,
      fullQuery,
      (current, total, message, estimatedTimeRemaining) => {
        // Pass through the COMPLETE_SIGNAL if present
        if (message === 'COMPLETE_SIGNAL') {
          progressCallback(current, total, message, estimatedTimeRemaining);
          return;
        }
        
        progressCallback(
          current, 
          total, 
          message || `Fetching latest ${bankInfo.name} transactions (${current}/${total})...`,
          estimatedTimeRemaining
        );
      }
    );
    
    // Process into simple transactions
    const newTransactions = newEmails.map(email => ({
      id: email.id,
      subject: email.subject,
      date: email.date,
      snippet: email.snippet,
      from: email.from,
      raw: email
    }));
    
    // Get existing transactions
    const existingTransactions = await getTransactions(bankId, accountEmail);
    
    // Merge without duplicates
    const mergedTransactions = mergeWithoutDuplicates(existingTransactions, newTransactions);
    
    // Save merged transactions
    await saveTransactions(bankId, accountEmail, mergedTransactions);
    
    const now = new Date();
    
    return {
      success: true,
      transactions: mergedTransactions,
      lastFetched: now
    };
  } catch (error) {
    console.error(`Error fetching latest transactions for ${bankId}:`, error);
    return {
      success: false,
      error: error.message || `Failed to fetch latest transactions for ${bankId}`
    };
  }
};

/**
 * Helper to merge transactions without duplicates
 */
const mergeWithoutDuplicates = (existingTransactions, newTransactions) => {
  if (!existingTransactions || existingTransactions.length === 0) {
    return newTransactions || [];
  }
  
  if (!newTransactions || newTransactions.length === 0) {
    return existingTransactions;
  }
  
  // Use a Map for O(1) lookups
  const transactionMap = new Map();
  
  // Add existing transactions
  existingTransactions.forEach(transaction => {
    transactionMap.set(transaction.id, transaction);
  });
  
  // Add new transactions if not duplicates
  newTransactions.forEach(transaction => {
    if (!transactionMap.has(transaction.id)) {
      transactionMap.set(transaction.id, transaction);
    }
  });
  
  // Convert back to array
  return Array.from(transactionMap.values());
};

/**
 * Save transactions to storage with time frame info
 */
export const saveTransactions = async (bankId, accountEmail, transactions, timeFrame, customRange) => {
  try {
    if (!bankId || !accountEmail) return false;

    const storageKey = `bank_transactions_${bankId}_${accountEmail}`;
    const metadataKey = `bank_metadata_${bankId}_${accountEmail}`;

    await AsyncStorage.setItem(storageKey, JSON.stringify(transactions));
    await AsyncStorage.setItem(
      metadataKey,
      JSON.stringify({
        lastUpdated: Date.now(),
        timeFrame,
        customRange: customRange || null
      })
    );

    return true;
  } catch (error) {
    console.error(`Error saving transactions for ${bankId}:`, error);
    return false;
  }
};

/**
 * Get transactions from storage
 */
export const getTransactions = async (bankId, accountEmail) => {
  try {
    if (!bankId || !accountEmail) {
      return [];
    }
    
    const storageKey = `bank_transactions_${bankId}_${accountEmail}`;
    const data = await AsyncStorage.getItem(storageKey);
    
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting transactions for ${bankId}:`, error);
    return [];
  }
};

/**
 * Get last updated timestamp for bank transactions
 */
export const getLastUpdatedTimestamp = async (bankId, accountEmail) => {
  try {
    if (!bankId || !accountEmail) {
      return null;
    }
    
    const storageKey = `bank_last_updated_${bankId}_${accountEmail}`;
    const timestamp = await AsyncStorage.getItem(storageKey);
    
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error(`Error getting last updated timestamp for ${bankId}:`, error);
    return null;
  }
};

/**
 * Clear transactions for a specific bank and account
 */
export const clearTransactions = async (bankId, accountEmail) => {
  try {
    if (!bankId || !accountEmail) {
      return false;
    }
    
    const transactionsKey = `bank_transactions_${bankId}_${accountEmail}`;
    const timestampKey = `bank_last_updated_${bankId}_${accountEmail}`;
    
    await AsyncStorage.removeItem(transactionsKey);
    await AsyncStorage.removeItem(timestampKey);
    
    return true;
  } catch (error) {
    console.error(`Error clearing transactions for ${bankId}:`, error);
    return false;
  }
};