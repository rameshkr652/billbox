// src/components/AccountDrawer.js - Fixed for proper account switching
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import { tokenCache } from '../services/GmailService'; // Import tokenCache for clearing

const AccountDrawer = ({ platform, accountEmail, onAccountChange, onClose }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const accountsList = await AccountService.getAccounts();
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSelect = async (email) => {
    try {
      if (email === accountEmail) {
        // If the same account is selected, just close the drawer
        onClose();
        return;
      }
      
      console.log(`AccountDrawer: Switching from ${accountEmail} to ${email} for platform ${platform}`);
      
      // Clear token cache for both the old and new account to ensure fresh tokens
      if (accountEmail) tokenCache.clearToken(accountEmail);
      tokenCache.clearToken(email);
      
      // Get the main account (the one logged into the app)
      const mainAccount = await AccountService.getCurrentAccount();
      if (!mainAccount) {
        throw new Error('No main account found.');
      }
      
      // Update platform configurations
      const platformsConfig = await StorageService.getPlatformsForAccount(mainAccount.email) || {};
      platformsConfig[platform] = { accountEmail: email };
      
      // Save the updated config
      await StorageService.savePlatformsForAccount(mainAccount.email, platformsConfig);
      
      // Notify parent component of the account change
      if (onAccountChange) {
        onAccountChange(email);
      }
      
      // Show confirmation
      Alert.alert('Account Changed', `Now using ${email} for ${platform}`);
      
      // Close the drawer
      onClose();
    } catch (error) {
      console.error('Error selecting account:', error);
      Alert.alert('Error', 'Failed to switch account. Please try again.');
    }
  };

  const handleAddAccount = () => {
    // Navigate to account addition screen
    onClose();
    // You'll need to implement navigation to WebAuth here
  };

  const renderAccountItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.accountItem,
        item.email === accountEmail && styles.accountItemSelected
      ]}
      onPress={() => handleAccountSelect(item.email)}
    >
      <View style={styles.accountAvatar}>
        <Text style={styles.accountInitial}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{item.name || 'User'}</Text>
        <Text style={styles.accountEmail}>{item.email}</Text>
      </View>
      {item.email === accountEmail && (
        <Icon name="check-circle" size={20} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Account for {platform}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="close" size={24} color={Colors.darkGray} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.email}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addAccountButton}
            onPress={handleAddAccount}
          >
            <Icon name="add-circle-outline" size={24} color={Colors.primary} />
            <Text style={styles.addAccountText}>Add New Account</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  closeButton: {
    padding: 4,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.gray,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  addAccountText: {
    marginLeft: 12,
    fontSize: 16,
    color: Colors.primary,
  },
});

export default AccountDrawer;