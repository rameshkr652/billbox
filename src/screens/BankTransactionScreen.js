// src/screens/BankTransactionScreen.js - Enhanced with transaction loading UI
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import Colors from '../constants/colors';
import banks from '../constants/banks';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/BankStyles';
import AccountSwitcherModal from '../components/AccountSwitcherModal';
import * as BankService from '../services/BankService';
import * as GmailService from '../services/GmailService';
import BankTransactionsDisplay from '../components/BankTransactionsDisplay';

const { width } = Dimensions.get('window');

const TIME_FRAMES = {
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
  LAST_6_MONTHS: 'LAST_6_MONTHS',
  CUSTOM: 'CUSTOM'
};

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
  const [showBankSwitcherModal, setShowBankSwitcherModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(TIME_FRAMES.THIS_MONTH);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start');
  const [markedDates, setMarkedDates] = useState({});
  const [showProgress, setShowProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeFrameModal, setShowTimeFrameModal] = useState(false);

  const progressAnimation = useRef(new Animated.Value(0)).current;
  const loadingOperationRef = useRef(null);
  const modalSlideAnimation = useRef(new Animated.Value(300)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (route.params?.refreshTrigger) {
      loadUserData();
    }
  }, [route.params?.refreshTrigger]);

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false
    }).start();
  }, [progress]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const accountsList = await AccountService.getAccounts();
      setAccounts(accountsList);
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        throw new Error('No account found. Please sign in first.');
      }
      setCurrentAccount(account);
      const userBanksData = await StorageService.getBanksForAccount(account.email);
      setUserBanks(userBanksData || []);
      if (userBanksData && userBanksData.length > 0) {
        setSelectedBankId(userBanksData[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load account information.');
    }
  };

  const addBank = async (bankId) => {
    try {
      if (!currentAccount) {
        throw new Error('No account found. Please sign in first.');
      }
      const bankInfo = banks.find(bank => bank.id === bankId);
      if (!bankInfo) {
        throw new Error('Bank information not found.');
      }
      const alreadyExists = userBanks.some(bank => bank.id === bankId);
      if (alreadyExists) {
        Alert.alert('Already Added', `${bankInfo.name} is already added.`);
        return;
      }
      const bankObject = {
        id: bankInfo.id,
        name: bankInfo.name,
        color: bankInfo.color,
        icon: bankInfo.icon,
        emailQuery: bankInfo.emailQuery,
        addedAt: new Date().toISOString()
      };
      const updatedBanks = [...userBanks, bankObject];
      await StorageService.saveBanksForAccount(currentAccount.email, updatedBanks);
      setUserBanks(updatedBanks);
      setSelectedBankId(bankId);
      setShowAddBankModal(false);
      Alert.alert('Success', `${bankInfo.name} added successfully.`);
    } catch (error) {
      console.error('Error adding bank:', error);
      Alert.alert('Error', 'Failed to add bank.');
    }
  };

  const handleAccountSelect = async (account) => {
    try {
      await AccountService.setCurrentAccount(account.email);
      setCurrentAccount(account);
      const userBanksData = await StorageService.getBanksForAccount(account.email);
      setUserBanks(userBanksData || []);
      if (userBanksData && userBanksData.length > 0) {
        setSelectedBankId(userBanksData[0].id);
      } else {
        setSelectedBankId(null);
      }
      setShowAccountModal(false);
    } catch (error) {
      console.error('Error switching account:', error);
      Alert.alert('Error', 'Failed to switch account.');
    }
  };

  const handleAddNewAccount = () => {
    navigation.navigate('WebAuth');
  };

  const handleBankSelect = (bankId) => {
    setSelectedBankId(bankId);
    setShowBankSwitcherModal(false);
  };

  const navigateToManageBanks = () => {
    if (!currentAccount) {
      Alert.alert('Error', 'No account selected.');
      return;
    }
    navigation.navigate('ManageBanksScreen', {
      accountEmail: currentAccount.email
    });
  };

  const showDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePickerModal(true);
  };

  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    if (datePickerMode === 'start') {
      setCustomDateRange(prev => {
        const newRange = { ...prev, start: selectedDate };
        updateMarkedDates(newRange);
        return newRange;
      });
      setDatePickerMode('end');
    } else {
      const startDate = customDateRange.start || new Date();
      if (selectedDate < startDate) {
        Alert.alert('Invalid Date Range', 'End date must be after start date.');
        return;
      }
      setCustomDateRange(prev => {
        const newRange = { ...prev, end: selectedDate };
        updateMarkedDates(newRange);
        return newRange;
      });
      setShowDatePickerModal(false);
      setSelectedTimeFrame(TIME_FRAMES.CUSTOM);
    }
  };

  const updateMarkedDates = (range) => {
    const newMarkedDates = {};
    if (range.start && range.end) {
      const startDateStr = range.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        startingDay: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
      const endDateStr = range.end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        selected: true,
        endingDay: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
      const currentDate = new Date(range.start);
      currentDate.setDate(currentDate.getDate() + 1);
      while (currentDate < range.end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        newMarkedDates[dateStr] = {
          selected: true, 
          color: selectedBank ? selectedBank.color : Colors.primary
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (range.start) {
      const startDateStr = range.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
    }
    setMarkedDates(newMarkedDates);
  };

  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  const bankColor = selectedBank ? selectedBank.color : Colors.primary;

  const getTimeFrameText = (timeframe, customRange) => {
    switch (timeframe) {
      case TIME_FRAMES.THIS_MONTH:
        const now = new Date();
        return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      case TIME_FRAMES.LAST_MONTH:
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${lastMonth.toLocaleString('default', { month: 'long' })} ${lastMonth.getFullYear()}`;
      case TIME_FRAMES.LAST_3_MONTHS:
        return 'Last 3 Months';
      case TIME_FRAMES.LAST_6_MONTHS:
        return 'Last 6 Months';
      case TIME_FRAMES.CUSTOM:
        if (customRange.start && customRange.end) {
          const formatDate = date => date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          return `${formatDate(customRange.start)} - ${formatDate(customRange.end)}`;
        }
        return 'Custom Range';
      default:
        return 'Select Period';
    }
  };

  const simulateTransactionLoading = () => {
    // This function is no longer used - redirecting to real implementation
    fetchBankTransactions();
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
  };

  const handleCancelLoading = () => {
    Alert.alert(
      'Cancel Loading',
      'Are you sure you want to cancel loading transactions?',
      [
        { text: 'Continue Loading', style: 'cancel' },
        { 
          text: 'Cancel Loading', 
          style: 'destructive',
          onPress: () => {
            console.log('User initiated cancel operation');
            
            // Clear any UI timer
            if (loadingOperationRef.current) {
              clearInterval(loadingOperationRef.current);
              loadingOperationRef.current = null;
            }
            
            // Send abort signal to Gmail service
            GmailService.abortCurrentOperation();
            
            // Reset UI state - this has to happen BEFORE the abort signal completes
            setShowProgress(false);
            setIsLoading(false);
            setProgress(0);
            setProgressText('Operation cancelled');
            
            // Show a confirmation message to the user
            setTimeout(() => {
              Alert.alert(
                'Operation Cancelled',
                'The transaction loading operation has been cancelled.',
                [{ text: 'OK' }]
              );
            }, 500);
          }
        }
      ]
    );
  };

  const animateModal = (visible) => {
    Animated.parallel([
      Animated.timing(modalSlideAnimation, {
        toValue: visible ? 0 : 300,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(modalBackdropOpacity, {
        toValue: visible ? 0.5 : 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      if (!visible) {
        setShowDatePickerModal(false);
      }
    });
  };

  useEffect(() => {
    if (showDatePickerModal) {
      animateModal(true);
    } else {
      animateModal(false);
    }
  }, [showDatePickerModal]);
  

  const fetchBankTransactions = async () => {
    if (isLoading) return;
    if (!selectedBankId) {
      Alert.alert('Select Bank', 'Please select a bank to load transactions.');
      return;
    }
    
    if (selectedTimeFrame === TIME_FRAMES.CUSTOM && (!customDateRange.start || !customDateRange.end)) {
      Alert.alert('Incomplete Date Range', 'Please select both start and end dates.');
      return;
    }
  
    // Confirm with user before proceeding
    Alert.alert(
      'Load Transactions',
      `This will fetch transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)} from ${selectedBank.name}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Load', 
          style: 'default',
          onPress: async () => {
            try {
              // Clear any previous operation
              if (loadingOperationRef.current) {
                clearInterval(loadingOperationRef.current);
                loadingOperationRef.current = null;
              }
              
              // Reset Gmail service abort state
              GmailService.abortCurrentOperation();
              
              setIsLoading(true);
              setShowProgress(true);
              setProgress(0);
              setProgressText('Preparing to fetch transactions...');
              
              // Determine time frame parameters
              let timeFrameOption = selectedTimeFrame;
              let customRangeOptions = null;
              
              if (selectedTimeFrame === TIME_FRAMES.CUSTOM && customDateRange.start && customDateRange.end) {
                customRangeOptions = {
                  startDate: customDateRange.start,
                  endDate: customDateRange.end
                };
              }
              
              // Call BankService to fetch transactions with optimized storage
              const result = await BankService.fetchBankTransactions(
                selectedBankId,
                currentAccount.email,
                timeFrameOption,
                customRangeOptions,
                (current, total, message, estimatedTimeRemaining) => {
                  // Special case for completion signal
                  if (message === 'COMPLETE_SIGNAL') {
                    // Force completion UI updates
                    setProgress(1);
                    setProgressText('Successfully loaded transactions!');
                    
                    // Close progress display with slight delay for visual feedback
                    setTimeout(() => {
                      setShowProgress(false);
                      setIsLoading(false);
                    }, 500);
                    return;
                  }
                  
                  // Regular progress update
                  const progressValue = total > 0 ? current / total : 0;
                  setProgress(Math.min(0.95, progressValue));
                  setProgressText(message || `Processing ${current} of ${total} transactions...`);
                  if (estimatedTimeRemaining) {
                    setTimeRemaining(formatTimeRemaining(estimatedTimeRemaining));
                  }
                }
              );
              
              // Check if operation was cancelled
              if (GmailService.operationControl && GmailService.operationControl.isAborted()) {
                console.log('Operation was cancelled, not processing results');
                return;
              }
              
              // Process results - important to handle this regardless of storage success
              if (result.success) {
                // Load the transactions back from storage to ensure consistency
                const loadedTransactions = await BankService.getTransactions(selectedBankId, currentAccount.email);
                
                // Set transactions state with proper error handling
                if (Array.isArray(loadedTransactions) && loadedTransactions.length > 0) {
                  setTransactions(loadedTransactions);
                  setTransactionsLoaded(true);
                } else if (Array.isArray(result.transactions) && result.transactions.length > 0) {
                  // Fallback to using the directly returned transactions if storage failed
                  setTransactions(result.transactions);
                  setTransactionsLoaded(true);
                } else {
                  // No transactions found
                  setTransactions([]);
                  setTransactionsLoaded(true);
                }
                
                // Show success message
                setTimeout(() => {
                  const transactionCount = result.transactions ? result.transactions.length : 0;
                  Alert.alert('Success', `Loaded ${transactionCount} transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)}`);
                }, 500);
              } else if (result.error === 'Operation cancelled by user') {
                console.log('Transaction loading was cancelled by user');
                // No alert needed as user initiated the cancellation
              } else {
                Alert.alert('Error', result.error || 'Failed to load transactions');
              }
            } catch (error) {
              // Always hide loading indicators in case of error
              setShowProgress(false);
              setIsLoading(false);
              setProgress(0);
              
              // Check if operation was cancelled
              if (error.message && error.message.includes('cancelled')) {
                console.log('Transaction loading was cancelled by user');
                // No alert needed as user initiated the cancellation
              } else {
                console.error('Error fetching bank transactions:', error);
                Alert.alert('Error', 'Failed to fetch transactions. Please try again.');
              }
            }
          }
        }
      ]
    );
  };

// Function to fetch latest transactions
const fetchLatestTransactions = async () => {
  // Get the last updated timestamp from BankService
  const lastUpdated = await BankService.getLastUpdatedTimestamp(selectedBankId, currentAccount.email);
  
  if (isLoading || !lastUpdated) {
    Alert.alert('Error', 'No previous data to update. Please load all transactions first.');
    return;
  }
  
  // Confirm with user before proceeding
  Alert.alert(
    'Refresh Transactions',
    `This will fetch the latest transactions for ${selectedBank.name} since the last update. Continue?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Refresh', 
        style: 'default',
        onPress: async () => {
          try {
            // Clear any previous operation
            if (loadingOperationRef.current) {
              clearInterval(loadingOperationRef.current);
              loadingOperationRef.current = null;
            }
            
            // Reset Gmail service abort state
            GmailService.abortCurrentOperation();
            
            setIsLoading(true);
            setShowProgress(true);
            setProgress(0);
            setProgressText('Preparing to fetch latest transactions...');
            
            // Call BankService to fetch latest transactions
            const result = await BankService.fetchLatestBankTransactions(
              selectedBankId,
              currentAccount.email,
              new Date(lastUpdated),
              (current, total, message, estimatedTimeRemaining) => {
                // Special case for completion signal
                if (message === 'COMPLETE_SIGNAL') {
                  // Force close the progress display
                  setProgress(1);
                  setProgressText('Successfully loaded latest transactions!');
                  
                  // Hide loading indicators
                  setTimeout(() => {
                    setShowProgress(false);
                    setIsLoading(false);
                    // Don't set transactions here, that's done by the result handler
                  }, 500);
                  return;
                }
                
                // Regular progress update
                const progressValue = total > 0 ? current / total : 0;
                setProgress(Math.min(0.95, progressValue));
                setProgressText(message || `Processing ${current} of ${total} latest transactions...`);
                if (estimatedTimeRemaining) {
                  setTimeRemaining(estimatedTimeRemaining);
                }
              }
            );
            
            // Check if operation was cancelled
            if (!isLoading) {
              console.log('Operation was cancelled, not processing results');
              return;
            }
            
            // Set progress to 100% when done
            setProgress(1);
            setProgressText('Successfully loaded latest transactions!');
            
            // Process results
            // Ensure progress bar is closed regardless of the result
            setShowProgress(false);
            setIsLoading(false);
            
            if (result.success) {
              // Update transaction list
              setTransactions(result.transactions || []);
              
              // Show success message
              setTimeout(() => {
                const newCount = result.transactions.length - transactions.length;
                const message = newCount > 0 
                  ? `Found ${newCount} new transactions`
                  : 'No new transactions found';
                Alert.alert('Success', message);
              }, 500);
            } else if (result.error === 'Operation cancelled by user') {
              console.log('Transaction refresh was cancelled by user');
              // No alert needed as user initiated the cancellation
            } else {
              Alert.alert('Error', result.error || 'Failed to load latest transactions');
            }
          } catch (error) {
            // Always hide loading indicators in case of error
            setShowProgress(false);
            setIsLoading(false);
            setProgress(0);
            
            // Check if operation was cancelled
            if (error.message && error.message.includes('cancelled')) {
              console.log('Transaction refresh was cancelled by user');
              // No alert needed as user initiated the cancellation
            } else {
              console.error('Error fetching latest transactions:', error);
              Alert.alert('Error', 'Failed to fetch latest transactions. Please try again.');
            }
          } finally {
            // Ensure loading indicators are definitely closed
            setTimeout(() => {
              setShowProgress(false);
              setIsLoading(false);
            }, 300);
          }
        }
      }
    ]
  );
};

// Function to clear transaction data
const clearTransactionData = async () => {
  if (!selectedBankId || !currentAccount) return;
  
  Alert.alert(
    'Clear Transactions',
    `Are you sure you want to clear all transaction data for ${selectedBank?.name}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Clear', 
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            // Clear transactions from storage
            await BankService.clearTransactions(selectedBankId, currentAccount.email);
            // Reset state
            setTransactions([]);
            setTransactionsLoaded(false);
            setIsLoading(false);
            Alert.alert('Success', 'Transaction data cleared successfully');
          } catch (error) {
            console.error('Error clearing transaction data:', error);
            Alert.alert('Error', 'Failed to clear transaction data');
            setIsLoading(false);
          }
        }
      }
    ]
  );
};

useEffect(() => {
  const loadSavedTransactions = async () => {
    if (!selectedBankId || !currentAccount) return;
    
    try {
      setIsLoading(true);
      
      // Get transactions from storage with enhanced retrieval
      const savedTransactions = await BankService.getTransactions(selectedBankId, currentAccount.email);
      
      if (Array.isArray(savedTransactions) && savedTransactions.length > 0) {
        setTransactions(savedTransactions);
        setTransactionsLoaded(true);
        console.log(`Loaded ${savedTransactions.length} transactions successfully`);
      } else {
        setTransactions([]);
        setTransactionsLoaded(false);
        console.log('No saved transactions found');
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error(`Error loading saved transactions for ${selectedBankId}:`, error);
      setIsLoading(false);
      // Don't show an error alert here as this is on initial load
    }
  };
  
  loadSavedTransactions();
}, [selectedBankId, currentAccount]);

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

  const renderBankSwitcherModal = () => (
    <Modal
      visible={showBankSwitcherModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBankSwitcherModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowBankSwitcherModal(false)}
      >
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>Switch Bank</Text>
            <TouchableOpacity onPress={() => setShowBankSwitcherModal(false)}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.banksList}>
            {userBanks.map((bank) => (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.bankOption,
                  selectedBankId === bank.id && styles.bankOptionSelected
                ]}
                onPress={() => handleBankSelect(bank.id)}
              >
                <View style={[styles.bankIcon, { backgroundColor: bank.color }]}>
                  <Icon name={bank.icon} size={24} color="#FFF" />
                </View>
                <View style={styles.bankOptionInfo}>
                  <Text style={styles.bankOptionName}>{bank.name}</Text>
                </View>
                {selectedBankId === bank.id && (
                  <Icon name="check-circle" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.addMoreBanksButton}
            onPress={() => {
              setShowBankSwitcherModal(false);
              setShowAddBankModal(true);
            }}
          >
            <Icon name="add" size={18} color={Colors.primary} />
            <Text style={styles.addMoreBanksText}>Add More Banks</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderProgressModal = () => (
    <Modal
      visible={showProgress}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancelLoading}
    >
      <View style={styles.progressModalOverlay}>
        <View style={styles.progressModalContent}>
          <View style={styles.progressModalHeader}>
            <Text style={styles.progressModalTitle}>Loading Transactions</Text>
            <TouchableOpacity onPress={handleCancelLoading} style={styles.progressModalClose}>
              <Icon name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.progressModalBank}>
            <View style={[styles.bankIconSmall, { backgroundColor: bankColor }]}>
              <Icon name="account-balance" size={16} color="#fff" />
            </View>
            <Text style={styles.progressModalBankName}>
              {selectedBank ? selectedBank.name : 'Bank'} - {getTimeFrameText(selectedTimeFrame, customDateRange)}
            </Text>
          </View>
          <Text style={styles.progressModalText}>{progressText}</Text>
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { 
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: bankColor
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressPercentage}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          {timeRemaining && (
            <Text style={styles.progressModalTimeRemaining}>
              Estimated time remaining: {timeRemaining}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.cancelLoadingButton, { borderColor: Colors.accent }]}
            onPress={handleCancelLoading}
          >
            <Text style={[styles.cancelLoadingButtonText, { color: Colors.accent }]}>
              Cancel Loading
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePickerModal}
      transparent={true}
      animationType="none"
      onRequestClose={() => setShowDatePickerModal(false)}
    >
      <View style={styles.datePickerModalOverlay}>
        <Animated.View 
          style={[
            styles.datePickerModalBackdrop, 
            { opacity: modalBackdropOpacity }
          ]}
          onTouchEnd={() => setShowDatePickerModal(false)}
        />
        <Animated.View 
          style={[
            styles.datePickerModalContainer,
            { transform: [{ translateY: modalSlideAnimation }] }
          ]}
        >
          <View style={styles.datePickerModalHeader}>
            <Text style={styles.datePickerModalTitle}>
              Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
            </Text>
            <TouchableOpacity 
              onPress={() => setShowDatePickerModal(false)}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Calendar
            current={new Date().toISOString().split('T')[0]}
            minDate={'2020-01-01'}
            maxDate={new Date().toISOString().split('T')[0]}
            onDayPress={(day) => handleDateSelect(day)}
            markedDates={markedDates}
            theme={{
              calendarBackground: '#fff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: bankColor,
              selectedDayTextColor: '#fff',
              todayTextColor: bankColor,
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: bankColor,
              selectedDotColor: '#fff',
              arrowColor: bankColor,
              monthTextColor: '#2d4150',
              indicatorColor: bankColor,
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '500'
            }}
          />
          <View style={styles.datePickerModalFooter}>
            <TouchableOpacity
              style={[styles.datePickerButton, styles.datePickerCancelButton]}
              onPress={() => setShowDatePickerModal(false)}
            >
              <Text style={styles.datePickerCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            {datePickerMode === 'end' && customDateRange.start && (
              <TouchableOpacity
                style={[styles.datePickerButton, styles.datePickerApplyButton, { backgroundColor: bankColor }]}
                onPress={() => setShowDatePickerModal(false)}
              >
                <Text style={styles.datePickerApplyButtonText}>Apply</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderTimeFrameModal = () => {
    const timeFrameOptions = [
      { id: TIME_FRAMES.THIS_MONTH, label: 'This Month' },
      { id: TIME_FRAMES.LAST_MONTH, label: 'Last Month' },
      { id: TIME_FRAMES.LAST_3_MONTHS, label: 'Last 3 Months' },
      { id: TIME_FRAMES.LAST_6_MONTHS, label: 'Last 6 Months' },
      { id: TIME_FRAMES.CUSTOM, label: 'Custom Date Range' }
    ];

    return (
      <Modal
        visible={showTimeFrameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeFrameModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimeFrameModal(false)}
        >
          <View style={styles.timeFrameModalContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Time Frame</Text>
              <TouchableOpacity onPress={() => setShowTimeFrameModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timeFrameList}>
              {timeFrameOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.timeFrameOption,
                    selectedTimeFrame === option.id && [styles.timeFrameOptionSelected, { backgroundColor: `${bankColor}15` }]
                  ]}
                  onPress={() => {
                    setSelectedTimeFrame(option.id);
                    if (option.id === TIME_FRAMES.CUSTOM) {
                      setShowTimeFrameModal(false);
                      setTimeout(() => showDatePicker('start'), 300);
                    } else {
                      setShowTimeFrameModal(false);
                    }
                  }}
                >
                  <Text style={styles.timeFrameOptionText}>{option.label}</Text>
                  {selectedTimeFrame === option.id && (
                    <Icon name="check-circle" size={24} color={bankColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container}>      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={bankColor} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : userBanks.length === 0 ? (
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
          <TouchableOpacity
            style={styles.accountButton}
            onPress={() => setShowAccountModal(true)}
          >
            <Icon name="account-circle" size={18} color={Colors.primary} />
            <Text style={styles.accountButtonText}>
              {currentAccount ? currentAccount.email.split('@')[0] : 'Account'}
            </Text>
            <Icon name="arrow-drop-down" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <TouchableOpacity
            style={styles.accountInfoContainer}
            onPress={() => setShowAccountModal(true)}
          >
            <Icon name="account-circle" size={20} color={bankColor} />
            <Text style={[styles.accountInfoText, { borderColor: bankColor }]}>
              Using account: <Text style={styles.accountEmail}>{currentAccount.email}</Text>
            </Text>
            <Icon name="arrow-drop-down" size={20} color={bankColor} />
          </TouchableOpacity>
          <View style={styles.bankSelectorContainer}>
            <View style={styles.bankSelectorHeader}>
              <Text style={styles.sectionLabel}>Selected Bank</Text>
              <TouchableOpacity
                style={[styles.manageBanksButton, { borderColor: bankColor }]}
                onPress={navigateToManageBanks}
              >
                <Icon name="settings" size={16} color={bankColor} />
                <Text style={[styles.manageBanksText, { color: bankColor }]}>Manage Banks</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bankSelectorWrapper}>
              <TouchableOpacity 
                style={styles.bankSelector}
                onPress={() => setShowBankSwitcherModal(true)}
              >
                <View style={[styles.selectedBankIcon, { backgroundColor: bankColor }]}>
                  <Icon name="account-balance" size={24} color="#FFF" />
                </View>
                <Text style={styles.selectedBankName}>{selectedBank ? selectedBank.name : 'Select Bank'}</Text>
                <Icon name="keyboard-arrow-down" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.transactionControlsContainer}>
            <Text style={styles.sectionLabel}>Transaction Period</Text>
            <TouchableOpacity
              style={styles.timeFrameSelector}
              onPress={() => setShowTimeFrameModal(true)}
            >
              <Icon name="date-range" size={20} color={bankColor} style={styles.timeFrameIcon} />
              <Text style={styles.timeFrameText}>
                {getTimeFrameText(selectedTimeFrame, customDateRange)}
              </Text>
              <Icon name="keyboard-arrow-down" size={24} color="#666" />
            </TouchableOpacity>
            <View style={styles.loadButtonsContainer}>
              <TouchableOpacity 
                style={[styles.loadTransactionsButton, { backgroundColor: bankColor }]}
                onPress={fetchBankTransactions}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Icon name="download" size={20} color="#FFF" />
                    <Text style={styles.loadTransactionsButtonText}>Load Transactions</Text>
                  </>
                )}
              </TouchableOpacity>

              {transactionsLoaded && (
                 <TouchableOpacity
                 style={[styles.clearTransactionsButton, { borderColor: Colors.accent }]}
                 onPress={clearTransactionData}
                 disabled={loading || !transactionsLoaded}
               >
                 <Icon name="delete-outline" size={20} color={Colors.accent} />
                 <Text style={[styles.clearTransactionsButtonText, { color: Colors.accent }]}>Clear</Text>
               </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Transactions</Text>
              {transactionsLoaded && (
                <Text style={styles.transactionsPeriod}>
                  {getTimeFrameText(selectedTimeFrame, customDateRange)}
                </Text>
              )}
            </View>
            
            {!transactionsLoaded ? (
              <View style={styles.noTransactionsContainer}>
                <Icon name="receipt-long" size={60} color="#DDD" />
                <Text style={styles.noTransactionsText}>No Transactions</Text>
                <Text style={styles.noTransactionsSubtext}>
                  Load transactions using the controls above
                </Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.noTransactionsContainer}>
                <Icon name="check-circle" size={60} color={bankColor} />
                <Text style={styles.noTransactionsText}>Transactions Loaded</Text>
                <Text style={styles.noTransactionsSubtext}>
                  No transactions found for this period
                </Text>
              </View>
            ) : (
              <BankTransactionsDisplay
                transactions={transactions}
                bankColor={bankColor}
              />
            )}
          </View>
        </View>
      )}
      {renderAddBankDropdown()}
      {renderBankSwitcherModal()}
      {renderProgressModal()}
      {renderDatePickerModal()}
      {renderTimeFrameModal()}
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

export default BankTransactionScreen;