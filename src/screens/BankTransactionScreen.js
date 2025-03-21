// src/screens/BankTransactionScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import banks from '../constants/banks';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import * as BankService from '../services/BankService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the account switcher component
import AccountSwitcherModal from '../components/AccountSwitcherModal';

const BankTransactionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const [loading, setLoading] = useState(true);
  const [userBanks, setUserBanks] = useState([]);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [fetchingTransactions, setFetchingTransactions] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  // Load user banks on component mount
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Also reload when the screen gains focus or receives new params
  useEffect(() => {
    if (route.params?.refreshTrigger) {
      loadUserData();
    }
  }, [route.params?.refreshTrigger]);
  
  // Load all user data including accounts and banks
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load all Google accounts
      const accountsList = await AccountService.getAccounts();
      setAccounts(accountsList);
      
      // Get current Google account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        throw new Error('No account found. Please sign in first.');
      }
      
      setCurrentAccount(account);
      
      // Get banks for this account
      const userBanksData = await StorageService.getBanksForAccount(account.email);
      setUserBanks(userBanksData || []);
      
      if (userBanksData && userBanksData.length > 0) {
        // Auto-select the first bank
        setSelectedBankId(userBanksData[0].id);
        
        // Load transactions for the first bank
        await loadTransactions(userBanksData[0].id, account.email);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load account information.');
    }
  };
  
  // Load transactions for a specific bank
  const loadTransactions = async (bankId, accountEmail) => {
    try {
      setLoading(true);
      
      // Get bank info
      const bankInfo = banks.find(bank => bank.id === bankId);
      if (!bankInfo) {
        throw new Error('Bank information not found.');
      }
      
      // Load transactions from storage
      const savedTransactions = await BankService.getTransactions(bankId, accountEmail);
      
      if (savedTransactions && savedTransactions.length > 0) {
        setTransactions(savedTransactions);
      } else {
        // No saved transactions - show empty state
        setTransactions([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load transactions.');
    }
  };
  
  // Add a new bank to the user's account
  const addBank = async (bankId) => {
    try {
      if (!currentAccount) {
        throw new Error('No account found. Please sign in first.');
      }
      
      // Get bank info
      const bankInfo = banks.find(bank => bank.id === bankId);
      if (!bankInfo) {
        throw new Error('Bank information not found.');
      }
      
      // Create bank object
      const bankObject = {
        id: bankInfo.id,
        name: bankInfo.name,
        color: bankInfo.color,
        icon: bankInfo.icon,
        emailQuery: bankInfo.emailQuery,
        addedAt: new Date().toISOString()
      };
      
      // Update user banks
      const updatedBanks = [...userBanks, bankObject];
      
      // Save to storage
      await StorageService.saveBanksForAccount(currentAccount.email, updatedBanks);
      
      // Update state
      setUserBanks(updatedBanks);
      setSelectedBankId(bankId);
      
      // Close modal
      setShowAddBankModal(false);
      
      // Show success message
      Alert.alert('Success', `${bankInfo.name} added successfully.`);
      
      // Reset transactions since we're changing banks
      setTransactions([]);
    } catch (error) {
      console.error('Error adding bank:', error);
      Alert.alert('Error', 'Failed to add bank.');
    }
  };
  
  // Handle account selection
  const handleAccountSelect = async (account) => {
    try {
      // Set the current account
      await AccountService.setCurrentAccount(account.email);
      
      // Update state
      setCurrentAccount(account);
      
      // Reload data for the new account
      const userBanksData = await StorageService.getBanksForAccount(account.email);
      setUserBanks(userBanksData || []);
      
      if (userBanksData && userBanksData.length > 0) {
        // Auto-select the first bank
        setSelectedBankId(userBanksData[0].id);
        
        // Load transactions for the first bank
        await loadTransactions(userBanksData[0].id, account.email);
      } else {
        // No banks for this account
        setSelectedBankId(null);
        setTransactions([]);
      }
      
      // Close the modal
      setShowAccountModal(false);
    } catch (error) {
      console.error('Error switching account:', error);
      Alert.alert('Error', 'Failed to switch account.');
    }
  };
  
  // Add new Google account
  const handleAddNewAccount = () => {
    // Navigate to WebAuth screen to add a new Google account
    navigation.navigate('WebAuth');
  };
  
  // Fetch transactions for the selected bank
  const fetchTransactions = async () => {
    try {
      if (!selectedBankId || !currentAccount) {
        throw new Error('No bank selected or account not found.');
      }
      
      setFetchingTransactions(true);
      
      // Get bank info
      const bankInfo = banks.find(bank => bank.id === selectedBankId);
      if (!bankInfo) {
        throw new Error('Bank information not found.');
      }
      
      // Show loading message
      Alert.alert('Fetching Transactions', 'Please wait while we fetch your bank transactions. This may take a moment.');
      
      // In a real app, you would call your BankService to fetch transactions
      // For this demo, we'll just set some dummy data after a delay
      setTimeout(() => {
        const dummyTransactions = [
          {
            id: '1',
            date: new Date(),
            description: 'Salary Credit',
            amount: 45000,
            type: 'credit',
            category: 'Income'
          },
          {
            id: '2',
            date: new Date(Date.now() - 86400000), // yesterday
            description: 'ATM Withdrawal',
            amount: -10000,
            type: 'debit',
            category: 'Cash'
          },
          {
            id: '3',
            date: new Date(Date.now() - 172800000), // 2 days ago
            description: 'Amazon Payment',
            amount: -2499,
            type: 'debit',
            category: 'Shopping'
          },
          {
            id: '4',
            date: new Date(Date.now() - 259200000), // 3 days ago
            description: 'Restaurant Payment',
            amount: -1450,
            type: 'debit',
            category: 'Dining'
          },
          {
            id: '5',
            date: new Date(Date.now() - 345600000), // 4 days ago
            description: 'Mobile Recharge',
            amount: -999,
            type: 'debit',
            category: 'Utilities'
          }
        ];
        
        // Save to storage and update state
        BankService.saveTransactions(selectedBankId, currentAccount.email, dummyTransactions);
        setTransactions(dummyTransactions);
        setFetchingTransactions(false);
      }, 2000);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setFetchingTransactions(false);
      Alert.alert('Error', 'Failed to fetch transactions.');
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    const isNegative = amount < 0;
    return `${isNegative ? '-' : ''}₹${Math.abs(amount).toLocaleString('en-IN')}`;
  };
  
  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Render an individual transaction
  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.categoryIcon, item.type === 'credit' ? styles.creditIcon : styles.debitIcon]}>
          <Icon 
            name={
              item.type === 'credit' ? 'arrow-downward' : 
              item.category === 'Shopping' ? 'shopping-cart' :
              item.category === 'Dining' ? 'restaurant' :
              item.category === 'Utilities' ? 'smartphone' :
              item.category === 'Cash' ? 'attach-money' :
              'payment'
            } 
            size={20} 
            color="#FFF" 
          />
        </View>
      </View>
      
      <View style={styles.transactionMiddle}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      
      <View style={styles.transactionRight}>
        <Text style={[
          styles.transactionAmount,
          item.type === 'credit' ? styles.creditAmount : styles.debitAmount
        ]}>
          {formatCurrency(item.amount)}
        </Text>
      </View>
    </View>
  );
  
  // Render bank selection modal (full-screen)
  const renderAddBankModal = () => (
    <Modal
      visible={showAddBankModal}
      animationType="slide"
      onRequestClose={() => setShowAddBankModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowAddBankModal(false)}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Select Your Bank</Text>
          <View style={styles.headerRight} />
        </View>
        
        <FlatList
          data={banks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.banksList}
          renderItem={({ item }) => {
            // Check if bank is already added
            const isAdded = userBanks.some(userBank => userBank.id === item.id);
            
            return (
              <TouchableOpacity
                style={[
                  styles.bankItem,
                  isAdded && styles.bankItemDisabled
                ]}
                onPress={() => {
                  if (!isAdded) {
                    addBank(item.id);
                  } else {
                    Alert.alert('Already Added', `${item.name} is already added.`);
                  }
                }}
                disabled={isAdded}
              >
                <View style={[styles.bankIcon, { backgroundColor: item.color }]}>
                  <Icon name={item.icon} size={24} color="#FFF" />
                </View>
                <View style={styles.bankInfo}>
                  <Text style={styles.bankName}>{item.name}</Text>
                  {isAdded && (
                    <Text style={styles.bankAdded}>Already Added</Text>
                  )}
                </View>
                {!isAdded ? (
                  <Icon name="add-circle-outline" size={24} color="#666" />
                ) : (
                  <Icon name="check-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
  
  // Get the selected bank info for styling
  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  const bankColor = selectedBank ? selectedBank.color : Colors.primary;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: bankColor }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bank Transactions</Text>
        
        {/* Account switcher button - similar to platforms */}
        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => setShowAccountModal(true)}
        >
          <Icon name="account-circle" size={18} color="#fff" />
          <Text style={styles.accountButtonText}>
            {currentAccount ? currentAccount.email.split('@')[0] : 'Account'}
          </Text>
          <Icon name="arrow-drop-down" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={bankColor} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : userBanks.length === 0 ? (
        // No banks added yet - show empty state with add button
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="account-balance" size={80} color="#DDD" />
          </View>
          <Text style={styles.emptyTitle}>No Banks Added</Text>
          <Text style={styles.emptyDescription}>
            Add your bank to view and manage your transactions
          </Text>
          <TouchableOpacity
            style={[styles.addBankButtonLarge, { backgroundColor: Colors.primary }]}
            onPress={() => setShowAddBankModal(true)}
          >
            <Icon name="add" size={24} color="#FFF" style={styles.addBankButtonIcon} />
            <Text style={styles.addBankButtonText}>Add Bank</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Banks added - show bank selector dropdown and transactions
        <View style={styles.contentContainer}>
          {/* Bank Selector */}
          <View style={styles.bankSelectorContainer}>
            <Text style={styles.sectionLabel}>Selected Bank</Text>
            
            <View style={styles.bankSelectorWrapper}>
              <TouchableOpacity 
                style={styles.bankSelector}
                onPress={() => setShowAddBankModal(true)}
              >
                <View style={[styles.selectedBankIcon, { backgroundColor: bankColor }]}>
                  <Icon name="account-balance" size={24} color="#FFF" />
                </View>
                <Text style={styles.selectedBankName}>{selectedBank ? selectedBank.name : 'Select Bank'}</Text>
                <Icon name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.loadButton, { backgroundColor: bankColor }]}
                onPress={fetchTransactions}
                disabled={fetchingTransactions}
              >
                {fetchingTransactions ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.loadButtonText}>Load Transactions</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Transactions List */}
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
              {transactions.length > 0 && (
                <Text style={styles.transactionsCount}>{transactions.length} items</Text>
              )}
            </View>
            
            {transactions.length > 0 ? (
              <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.transactionsList}
              />
            ) : (
              <View style={styles.noTransactionsContainer}>
                <Icon name="receipt-long" size={60} color="#DDD" />
                <Text style={styles.noTransactionsText}>No Transactions</Text>
                <Text style={styles.noTransactionsSubtext}>
                  Tap 'Load Transactions' to fetch your recent bank activity
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      
      {/* Add Bank Modal (Full screen) */}
      {renderAddBankModal()}
      
      {/* Account Switcher Modal */}
      <AccountSwitcherModal
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        accounts={accounts}
        currentAccount={currentAccount?.email}
        onAccountSelect={handleAccountSelect}
        platformName="Banks"
        platformColor={bankColor}
        onAddNewAccount={handleAddNewAccount}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 12,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  accountButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    marginRight: 4,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: '80%',
  },
  addBankButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  addBankButtonIcon: {
    marginRight: 8,
  },
  addBankButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bankSelectorContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bankSelectorWrapper: {
    flexDirection: 'row',
  },
  bankSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedBankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedBankName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  loadButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionsCount: {
    fontSize: 14,
    color: '#666',
  },
  transactionsList: {
    paddingBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    marginRight: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditIcon: {
    backgroundColor: Colors.secondary,
  },
  debitIcon: {
    backgroundColor: Colors.accent,
  },
  transactionMiddle: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#888',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  creditAmount: {
    color: Colors.secondary,
  },
  debitAmount: {
    color: Colors.accent,
  },
  noTransactionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noTransactionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noTransactionsSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    maxWidth: '80%',
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    width: 28,
  },
  banksList: {
    padding: 16,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  bankItemDisabled: {
    opacity: 0.7,
  },
  bankIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bankAdded: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

export default BankTransactionScreen;