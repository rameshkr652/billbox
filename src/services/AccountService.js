// src/services/AccountService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const addAccount = async (user, accessToken) => {
    try {
      if (!user || !user.email) {
        throw new Error('Invalid user data provided');
      }
      
      // Get existing accounts
      const accounts = await getAccounts();
      
      // Create account object with safe defaults
      const accountObject = {
        id: user.id || String(Date.now()),
        email: user.email,
        name: user.name || user.email.split('@')[0],
        photo: user.photo || null,
        accessToken
      };
      
      // Check if account already exists
      const existingIndex = accounts.findIndex(acc => acc.email === user.email);
      
      if (existingIndex >= 0) {
        // Update existing account
        accounts[existingIndex] = accountObject;
      } else {
        // Add new account
        accounts.push(accountObject);
      }
      
      // Save updated accounts
      await AsyncStorage.setItem('accounts', JSON.stringify(accounts));
      
      // Set as current account
      await AsyncStorage.setItem('currentAccount', user.email);
      
      return accountObject;
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  };

export const getAccounts = async () => {
  try {
    const accounts = await AsyncStorage.getItem('accounts');
    return accounts ? JSON.parse(accounts) : [];
  } catch (error) {
    console.error('Error getting accounts:', error);
    return [];
  }
};

export const getCurrentAccount = async () => {
    try {
      const currentAccountEmail = await AsyncStorage.getItem('currentAccount');
      if (!currentAccountEmail) return null;
      
      const accounts = await getAccounts();
      return accounts.find(acc => acc.email === currentAccountEmail) || null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  };

export const setCurrentAccount = async (email) => {
  try {
    await AsyncStorage.setItem('currentAccount', email);
    return true;
  } catch (error) {
    console.error('Error setting current account:', error);
    return false;
  }
};

export const removeAccount = async (email) => {
  try {
    // Get existing accounts
    const accounts = await getAccounts();
    const updatedAccounts = accounts.filter(acc => acc.email !== email);
    
    // Save updated accounts
    await AsyncStorage.setItem('accounts', JSON.stringify(updatedAccounts));
    
    // If removed account was current, set a new current account
    const currentAccount = await AsyncStorage.getItem('currentAccount');
    if (currentAccount === email && updatedAccounts.length > 0) {
      await setCurrentAccount(updatedAccounts[0].email);
    } else if (updatedAccounts.length === 0) {
      await AsyncStorage.removeItem('currentAccount');
    }
    
    return true;
  } catch (error) {
    console.error('Error removing account:', error);
    return false;
  }
};