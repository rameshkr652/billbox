// src/screens/BankTransactionScreen.js - Enhanced with transaction loading UI
import React, { useState, useEffect, useRef } from 'react';
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
  SafeAreaView,
  Animated,
  Dimensions,
  BackHandler
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import Colors from '../constants/colors';
import banks from '../constants/banks';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the account switcher component
import AccountSwitcherModal from '../components/AccountSwitcherModal';

const { width } = Dimensions.get('window');

// Define time frame options
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
  
  // Existing states
  const [loading, setLoading] = useState(true);
  const [userBanks, setUserBanks] = useState([]);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  // New state for bank switching
  const [showBankSwitcherModal, setShowBankSwitcherModal] = useState(false);
  
  // Transaction loading UI states
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoaded, setTransactionsLoaded] = useState(false);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(TIME_FRAMES.THIS_MONTH);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // start or end
  const [markedDates, setMarkedDates] = useState({});
  
  // Loading progress states
  const [showProgress, setShowProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  
  // Ref to store the loading operation for cancellation
  const loadingOperationRef = useRef(null);
  
  // Animation refs for modal
  const modalSlideAnimation = useRef(new Animated.Value(300)).current;
  const modalBackdropOpacity = useRef(new Animated.Value(0)).current;

  // Handle hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (showProgress) {
          handleCancelLoading();
          return true;
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [showProgress])
  );
  
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
  
  // Update progress animation
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false
    }).start();
  }, [progress]);
  
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
  
  // Handle bank selection
  const handleBankSelect = (bankId) => {
    setSelectedBankId(bankId);
    setShowBankSwitcherModal(false);
  };
  
  // Navigate to manage banks screen
  const navigateToManageBanks = () => {
    if (!currentAccount) {
      Alert.alert('Error', 'No account selected.');
      return;
    }
    
    navigation.navigate('ManageBanksScreen', {
      accountEmail: currentAccount.email
    });
  };

  // New functions for transaction loading UX
  
  // Show date picker for custom range
  const showDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePickerModal(true);
  };
  
  // Handle date selection in calendar
  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    
    if (datePickerMode === 'start') {
      // Update custom date range
      setCustomDateRange(prev => {
        const newRange = {
          ...prev,
          start: selectedDate
        };
        updateMarkedDates(newRange);
        return newRange;
      });
      
      // Switch to end date selection
      setDatePickerMode('end');
    } else {
      const startDate = customDateRange.start || new Date();
      
      // Ensure end date is after start date
      if (selectedDate < startDate) {
        Alert.alert('Invalid Date Range', 'End date must be after start date.');
        return;
      }
      
      // Update custom date range
      setCustomDateRange(prev => {
        const newRange = {
          ...prev,
          end: selectedDate
        };
        updateMarkedDates(newRange);
        return newRange;
      });
      
      // Close date picker
      setShowDatePickerModal(false);
      
      // Set time frame to custom
      setSelectedTimeFrame(TIME_FRAMES.CUSTOM);
    }
  };
  
  // Update marked dates for the calendar
  const updateMarkedDates = (range) => {
    const newMarkedDates = {};
    
    // If both dates are set, mark the range
    if (range.start && range.end) {
      // Mark start date
      const startDateStr = range.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        startingDay: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
      
      // Mark end date
      const endDateStr = range.end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        selected: true,
        endingDay: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
      
      // Mark dates in between
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
    } 
    // If only start date is set
    else if (range.start) {
      const startDateStr = range.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        color: selectedBank ? selectedBank.color : Colors.primary
      };
    }
    
    setMarkedDates(newMarkedDates);
  };
  
  // Get selected bank info for styling
  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  const bankColor = selectedBank ? selectedBank.color : Colors.primary;
  
  // Convert time frame to human-readable text
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
  
  // Helper functions for transaction loading simulation
  const simulateTransactionLoading = () => {
    if (isLoading) return;
    
    // Make sure a bank is selected
    if (!selectedBankId) {
      Alert.alert('Select Bank', 'Please select a bank to load transactions.');
      return;
    }
    
    // For custom range, ensure dates are set
    if (selectedTimeFrame === TIME_FRAMES.CUSTOM && (!customDateRange.start || !customDateRange.end)) {
      Alert.alert('Incomplete Date Range', 'Please select both start and end dates.');
      return;
    }
    
    // Show confirmation with time frame info
    Alert.alert(
      'Load Transactions',
      `This will fetch transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)} from ${selectedBank.name}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Load', 
          style: 'default',
          onPress: () => startLoading()
        }
      ]
    );
  };
  
  // Start the loading process
  const startLoading = () => {
    setIsLoading(true);
    setShowProgress(true);
    setProgress(0);
    setProgressText('Preparing to fetch transactions...');
    
    // Simulate incremental progress
    let currentProgress = 0;
    const interval = 50; // ms between updates
    const incrementAmount = 0.001; // how much to increment per update
    const estimatedDuration = 30000; // 30 seconds total
    const totalIncrements = estimatedDuration / interval;
    let currentIncrement = 0;
    
    // Simulate some delay before progress starts
    setTimeout(() => {
      setProgressText('Connecting to Google servers...');
      
      // Start the incremental progress
      const timer = setInterval(() => {
        currentIncrement++;
        
        // Calculate new progress with a bit of randomness
        // And make the progress slow down as it reaches completion
        const randomFactor = 1 + (Math.random() * 0.3 - 0.15);
        const slowdownFactor = 1 - (currentProgress * 0.5);
        
        currentProgress += incrementAmount * randomFactor * slowdownFactor;
        
        // Ensure progress doesn't exceed 0.97 (we'll set it to 1 when actually complete)
        const newProgress = Math.min(0.97, currentProgress);
        setProgress(newProgress);
        
        // Update text based on progress
        if (newProgress < 0.2) {
          setProgressText('Searching for transaction emails...');
        } else if (newProgress < 0.4) {
          setProgressText('Reading transaction details...');
        } else if (newProgress < 0.6) {
          setProgressText(`Processing ${Math.floor(newProgress * 100)} of ${Math.floor(totalIncrements * incrementAmount * 100)} transactions...`);
        } else if (newProgress < 0.8) {
          setProgressText('Analyzing transaction data...');
        } else {
          setProgressText('Finalizing transactions...');
        }
        
        // Update estimated time remaining
        const remainingIncrements = totalIncrements - currentIncrement;
        const remainingTimeSeconds = Math.ceil((remainingIncrements * interval) / 1000);
        setTimeRemaining(formatTimeRemaining(remainingTimeSeconds));
        
        // Store the timer for cancellation
        loadingOperationRef.current = timer;
        
        // Complete after a reasonable time
        if (currentIncrement >= totalIncrements - 10) {
          clearInterval(timer);
          completeLoading();
        }
      }, interval);
    }, 500);
  };
  
  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
  };
  
  // Complete the loading process
  const completeLoading = () => {
    // Animate to 100%
    setProgress(1);
    setProgressText('Successfully loaded transactions!');
    
    // Simulate a slight delay before closing the progress modal
    setTimeout(() => {
      setShowProgress(false);
      setIsLoading(false);
      setTransactionsLoaded(true);
      
      // Show success message
      Alert.alert(
        'Transactions Loaded',
        `Successfully loaded transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)}.`,
        [{ text: 'OK' }]
      );
      
      // Here you would normally set the actual transactions data
      setTransactions([
        // Sample transaction data would go here
      ]);
    }, 1000);
  };
  
  // Cancel the loading process
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
            // Clear the interval
            if (loadingOperationRef.current) {
              clearInterval(loadingOperationRef.current);
              loadingOperationRef.current = null;
            }
            
            // Reset loading state
            setShowProgress(false);
            setIsLoading(false);
            setProgress(0);
          }
        }
      ]
    );
  };
  
  // Animate the modal
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
  
  // Show date picker modal with animation
  useEffect(() => {
    if (showDatePickerModal) {
      animateModal(true);
    } else {
      animateModal(false);
    }
  }, [showDatePickerModal]);
  
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
  
  // Render bank switcher modal
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
  
  // Render progress modal
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
  
  // Render date picker modal
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

  // Render time frame selection modal
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

  // State for time frame modal
  const [showTimeFrameModal, setShowTimeFrameModal] = useState(false);

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
          
          {/* Account button */}
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
        // Banks added - show bank selector dropdown and transaction controls
        <View style={styles.contentContainer}>
          {/* Account Info */}
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
          
          {/* Bank Selector */}
          <View style={styles.bankSelectorContainer}>
            <View style={styles.bankSelectorHeader}>
              <Text style={styles.sectionLabel}>Selected Bank</Text>
              
              {/* Manage Banks Button */}
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
          
          {/* Transaction Controls */}
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
                onPress={simulateTransactionLoading}
                disabled={isLoading}
              >
                {isLoading ? (
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
                  style={[styles.refreshTransactionsButton, { borderColor: bankColor }]}
                  onPress={() => {
                    Alert.alert(
                      'Refresh Transactions',
                      `This will reload the latest transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)}. Continue?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Refresh', onPress: () => simulateTransactionLoading() }
                      ]
                    );
                  }}
                >
                  <Icon name="refresh" size={20} color={bankColor} />
                  <Text style={[styles.refreshTransactionsButtonText, { color: bankColor }]}>Refresh</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Transactions placeholder */}
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.transactionsTitle}>Recent Transactions</Text>
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
              <FlatList
                data={transactions}
                keyExtractor={(item, index) => `transaction-${index}`}
                renderItem={({ item }) => (
                  <View style={styles.transactionItem}>
                    <Text>Transaction data would appear here</Text>
                  </View>
                )}
                ListEmptyComponent={
                  <View style={styles.noTransactionsContainer}>
                    <Text style={styles.noTransactionsText}>No transactions found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      )}
      
      {/* Modals */}
      {renderAddBankDropdown()}
      {renderBankSwitcherModal()}
      {renderProgressModal()}
      {renderDatePickerModal()}
      {renderTimeFrameModal()}
      
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
    marginTop: 20,
  },
  accountButtonText: {
    color: Colors.primary,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  addBankButtonIcon: {
    marginRight: 8,
  },
  addBankButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  accountInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accountInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    marginHorizontal: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
  },
  accountEmail: {
    fontWeight: 'bold',
    color: '#333',
  },
  bankSelectorContainer: {
    marginBottom: 16,
  },
  bankSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  manageBanksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  manageBanksText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
  transactionControlsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeFrameSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeFrameIcon: {
    marginRight: 10,
  },
  timeFrameText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  loadButtonsContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  loadTransactionsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  loadTransactionsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  refreshTransactionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  refreshTransactionsButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  transactionsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionsHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  transactionsPeriod: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  noTransactionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noTransactionsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 16,
    marginBottom: 8,
  },
  noTransactionsSubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
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
  bankOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  bankIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankIconSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  },
  // Bank switcher modal styles
  addMoreBanksButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addMoreBanksText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Progress modal styles
  progressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressModalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  progressModalClose: {
    padding: 5,
  },
  progressModalBank: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  progressModalBankName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  progressModalText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    width: 50,
    textAlign: 'right',
  },
  progressModalTimeRemaining: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelLoadingButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelLoadingButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  // Date picker modal styles
  datePickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  datePickerModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  datePickerModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  datePickerModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  datePickerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  datePickerApplyButton: {
    marginLeft: 10,
  },
  datePickerCancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  datePickerApplyButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Time frame selection modal styles
  timeFrameModalContainer: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  timeFrameList: {
    maxHeight: 300,
  },
  timeFrameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeFrameOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  timeFrameOptionText: {
    fontSize: 16,
    color: '#333',
  },
  // Transaction item style
  transactionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  }
});

export default BankTransactionScreen;