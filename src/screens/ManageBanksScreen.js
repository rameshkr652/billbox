// src/screens/ManageBanksScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import banks from '../constants/banks';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';

const ManageBanksScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountEmail } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [userBanks, setUserBanks] = useState([]);
  const [allBanks, setAllBanks] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Get the provided account email or current account if not provided
      let account;
      if (accountEmail) {
        const accounts = await AccountService.getAccounts();
        account = accounts.find(acc => acc.email === accountEmail);
      } else {
        account = await AccountService.getCurrentAccount();
      }
      
      if (!account) {
        throw new Error('No account found. Please sign in first.');
      }
      
      setSelectedAccount(account);
      
      // Get banks for this account
      const userBanksData = await StorageService.getBanksForAccount(account.email);
      setUserBanks(userBanksData || []);
      
      // Setup all available banks
      setAllBanks(banks);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load account information.');
    }
  };
  
  const toggleBank = async (bank) => {
    try {
      if (!selectedAccount) {
        throw new Error('No account selected');
      }
      
      // Check if bank is already added
      const isAdded = userBanks.some(b => b.id === bank.id);
      
      if (isAdded) {
        // Remove bank with confirmation
        Alert.alert(
          'Remove Bank',
          `Are you sure you want to remove ${bank.name}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Remove', 
              style: 'destructive',
              onPress: async () => {
                const updatedBanks = userBanks.filter(b => b.id !== bank.id);
                await StorageService.saveBanksForAccount(selectedAccount.email, updatedBanks);
                setUserBanks(updatedBanks);
                
                // Also remove any transaction data
                await StorageService.clearBankData(selectedAccount.email, bank.id);
                
                Alert.alert('Success', `${bank.name} has been removed.`);
              }
            }
          ]
        );
      } else {
        // Add bank
        const bankObject = {
          id: bank.id,
          name: bank.name,
          color: bank.color,
          icon: bank.icon,
          emailQuery: bank.emailQuery,
          addedAt: new Date().toISOString()
        };
        
        const updatedBanks = [...userBanks, bankObject];
        await StorageService.saveBanksForAccount(selectedAccount.email, updatedBanks);
        setUserBanks(updatedBanks);
        
        Alert.alert('Success', `${bank.name} has been added.`);
      }
    } catch (error) {
      console.error('Error toggling bank:', error);
      Alert.alert('Error', 'Failed to update bank settings.');
    }
  };
  
  const renderBankItem = ({ item }) => {
    const isAdded = userBanks.some(bank => bank.id === item.id);
    
    return (
      <View style={styles.bankItem}>
        <View style={styles.bankInfo}>
          <View style={[styles.bankIcon, { backgroundColor: item.color }]}>
            <Icon name={item.icon} size={20} color="#fff" />
          </View>
          <Text style={styles.bankName}>{item.name}</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.toggleButton,
            isAdded ? styles.removeButton : styles.addButton
          ]}
          onPress={() => toggleBank(item)}
        >
          <Icon 
            name={isAdded ? 'delete' : 'add'} 
            size={18} 
            color={isAdded ? Colors.accent : Colors.primary} 
          />
          <Text 
            style={[
              styles.toggleButtonText,
              isAdded ? styles.removeButtonText : styles.addButtonText
            ]}
          >
            {isAdded ? 'Remove' : 'Add'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Banks</Text>
      </View>
      
      {selectedAccount && (
        <View style={styles.accountInfo}>
          <Text style={styles.accountInfoText}>
            Managing banks for: <Text style={styles.accountEmail}>{selectedAccount.email}</Text>
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading banks...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Available Banks</Text>
          <Text style={styles.sectionDescription}>
            Add or remove banks from your account
          </Text>
          
          <FlatList
            data={allBanks}
            renderItem={renderBankItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  accountInfo: {
    backgroundColor: '#eef2ff',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  accountInfoText: {
    fontSize: 14,
    color: '#4a5568',
  },
  accountEmail: {
    fontWeight: 'bold',
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginHorizontal: 16,
    color: '#2d3748',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#718096',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3748',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  addButton: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  removeButton: {
    borderColor: Colors.accent,
    backgroundColor: `${Colors.accent}10`,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  addButtonText: {
    color: Colors.primary,
  },
  removeButtonText: {
    color: Colors.accent,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#718096',
    marginTop: 16,
  },
});

export default ManageBanksScreen;