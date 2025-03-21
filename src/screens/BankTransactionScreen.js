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
  const [currentAccount, setCurrentAccount] = useState(null);
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
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load account information.');
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
      
      // Check if bank already exists
      const alreadyExists = userBanks.some(bank => bank.id === bankId);
      if (alreadyExists) {
        Alert.alert('Already Added', `${bankInfo.name} is already added.`);
        return;
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
      
    } catch (error) {
      console.error('Error adding bank:', error);
      Alert.alert('Error', 'Failed to add bank.');
    }
  };
  
  // Remove a bank
  const removeBank = async (bankId) => {
    try {
      if (!currentAccount) {
        throw new Error('No account found. Please sign in first.');
      }
      
      // Get bank info for the message
      const bankInfo = userBanks.find(bank => bank.id === bankId);
      if (!bankInfo) {
        throw new Error('Bank information not found.');
      }
      
      // Ask for confirmation
      Alert.alert(
        'Remove Bank',
        `Are you sure you want to remove ${bankInfo.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: async () => {
              // Filter out the bank to remove
              const updatedBanks = userBanks.filter(bank => bank.id !== bankId);
              
              // Save to storage
              await StorageService.saveBanksForAccount(currentAccount.email, updatedBanks);
              
              // Update state
              setUserBanks(updatedBanks);
              
              // Update selected bank ID if needed
              if (selectedBankId === bankId) {
                if (updatedBanks.length > 0) {
                  setSelectedBankId(updatedBanks[0].id);
                } else {
                  setSelectedBankId(null);
                }
              }
              
              // Show success message
              Alert.alert('Success', `${bankInfo.name} removed successfully.`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error removing bank:', error);
      Alert.alert('Error', 'Failed to remove bank.');
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
      } else {
        // No banks for this account
        setSelectedBankId(null);
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
  
  // Render bank dropdown modal
  const renderAddBankDropdown = () => (
    <Modal
      visible={showAddBankModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowAddBankModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowAddBankModal(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Select a Bank</Text>
            <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.banksList}>
            {banks.map((bank) => {
              // Check if bank is already added
              const isAdded = userBanks.some(userBank => userBank.id === bank.id);
              
              return (
                <TouchableOpacity
                  key={bank.id}
                  style={[
                    styles.bankOption,
                    isAdded && styles.bankOptionDisabled
                  ]}
                  onPress={() => !isAdded && addBank(bank.id)}
                  disabled={isAdded}
                >
                  <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                    <Icon name={bank.icon} size={24} color="#FFF" />
                  </View>
                  <View style={styles.bankOptionInfo}>
                    <Text style={styles.bankOptionName}>{bank.name}</Text>
                    {isAdded && (
                      <Text style={styles.bankAddedText}>Already added</Text>
                    )}
                  </View>
                  {isAdded ? (
                    <Icon name="check-circle" size={24} color={Colors.primary} />
                  ) : (
                    <Icon name="add-circle-outline" size={24} color="#666" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
  
  // Get the selected bank info for styling
  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  const bankColor = selectedBank ? selectedBank.color : Colors.primary;

  return (
    <SafeAreaView style={styles.container}>      
      
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
        // Banks added - show bank selector dropdown and user banks list
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
            </View>
          </View>
          
          {/* Your Banks List */}
          <View style={styles.yourBanksContainer}>
            <View style={styles.yourBanksHeader}>
              <Text style={styles.yourBanksTitle}>Your Banks</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddBankModal(true)}
              >
                <Icon name="add" size={20} color={Colors.primary} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={userBanks}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.bankListItem}>
                  <View style={styles.bankListItemLeft}>
                    <View style={[styles.bankListItemIcon, { backgroundColor: item.color }]}>
                      <Icon name={item.icon} size={20} color="#FFF" />
                    </View>
                    <Text style={styles.bankListItemName}>{item.name}</Text>
                  </View>
                  
                  <View style={styles.bankListItemActions}>
                    <TouchableOpacity
                      style={[
                        styles.selectBankButton,
                        selectedBankId === item.id && { backgroundColor: item.color + '20' }
                      ]}
                      onPress={() => setSelectedBankId(item.id)}
                    >
                      <Text 
                        style={[
                          styles.selectBankButtonText,
                          selectedBankId === item.id && { color: item.color }
                        ]}
                      >
                        {selectedBankId === item.id ? 'Selected' : 'Select'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.removeBankButton}
                      onPress={() => removeBank(item.id)}
                    >
                      <Icon name="delete-outline" size={20} color={Colors.accent} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.noBanksContainer}>
                  <Text style={styles.noBanksText}>No banks added yet</Text>
                </View>
              }
            />
          </View>
          
          {/* Transactions placeholder */}
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            </View>
            
            <View style={styles.noTransactionsContainer}>
              <Icon name="receipt-long" size={60} color="#DDD" />
              <Text style={styles.noTransactionsText}>No Transactions</Text>
              <Text style={styles.noTransactionsSubtext}>
                Transactions will appear here in future updates
              </Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Add Bank Dropdown */}
      {renderAddBankDropdown()}
      
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  drawerButton: {
    padding: 8,
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
  yourBanksContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  yourBanksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  yourBanksTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  addButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  bankListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankListItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankListItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankListItemName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  bankListItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectBankButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    marginRight: 8,
  },
  selectBankButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  removeBankButton: {
    padding: 8,
  },
  noBanksContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noBanksText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  transactionsContainer: {
    flex: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  banksList: {
    maxHeight: 400,
  },
  bankOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  bankOptionDisabled: {
    opacity: 0.7,
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankOptionInfo: {
    flex: 1,
  },
  bankOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bankAddedText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  }
});

export default BankTransactionScreen;