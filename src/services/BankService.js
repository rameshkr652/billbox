// src/services/BankService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as GmailService from './GmailService';
import banks from '../constants/banks';
import * as AccountService from './AccountService';

/**
 * Fetch bank transactions for a specific bank and account
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @param {function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Array>} - The fetched transactions
 */
export const fetchBankTransactions = async (bankId, accountEmail, progressCallback = () => {}) => {
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
    
    // Use the bank's email query to fetch relevant emails
    const emails = await GmailService.fetchAllPlatformEmails(
      `bank_${bankId}`, 
      accountEmail, 
      bankInfo.emailQuery,
      progressCallback
    );
    
    // Process the emails to extract transaction data
    const transactions = await processBankEmails(emails, bankId);
    
    // Save transactions to storage
    await saveTransactions(bankId, accountEmail, transactions);
    
    return transactions;
  } catch (error) {
    console.error(`Error fetching bank transactions for ${bankId}:`, error);
    throw error;
  }
};

/**
 * Process bank emails to extract transaction data
 * @param {Array} emails - The emails to process
 * @param {string} bankId - The bank identifier
 * @returns {Promise<Array>} - The extracted transactions
 */
export const processBankEmails = async (emails, bankId) => {
  try {
    // TODO: Implement bank-specific email parsing
    // For now, return empty array
    return [];
  } catch (error) {
    console.error(`Error processing bank emails for ${bankId}:`, error);
    return [];
  }
};

/**
 * Save transactions to storage
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @param {Array} transactions - The transactions to save
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export const saveTransactions = async (bankId, accountEmail, transactions) => {
  try {
    if (!bankId || !accountEmail) {
      return false;
    }
    
    const storageKey = `bank_transactions_${bankId}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(transactions));
    
    // Save last updated timestamp
    const now = Date.now().toString();
    await AsyncStorage.setItem(`bank_last_updated_${bankId}_${accountEmail}`, now);
    
    return true;
  } catch (error) {
    console.error(`Error saving transactions for ${bankId}:`, error);
    return false;
  }
};

/**
 * Get transactions from storage
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @returns {Promise<Array>} - The transactions
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
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @returns {Promise<number|null>} - The timestamp or null if not found
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
 * @param {string} bankId - The bank identifier
 * @param {string} accountEmail - The email of the account
 * @returns {Promise<boolean>} - Whether the operation was successful
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