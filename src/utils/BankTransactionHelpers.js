// src/helpers/BankTransactionHelpers.js
import { Alert, Animated } from 'react-native';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import banks from '../constants/banks';
import Colors from '../constants/colors';

const TIME_FRAMES = {
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
  LAST_3_MONTHS: 'LAST_3_MONTHS',
  LAST_6_MONTHS: 'LAST_6_MONTHS',
  CUSTOM: 'CUSTOM'
};

export const loadUserData = async (setLoading, setAccounts, setCurrentAccount, setUserBanks, setSelectedBankId) => {
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

export const addBank = async (bankId, currentAccount, userBanks, setUserBanks, setSelectedBankId, setShowAddBankModal) => {
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

export const handleAccountSelect = async (account, setCurrentAccount, setUserBanks, setSelectedBankId, setShowAccountModal) => {
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

export const handleAddNewAccount = (navigation) => {
  navigation.navigate('WebAuth');
};

export const handleBankSelect = (bankId, setSelectedBankId, setShowBankSwitcherModal) => {
  setSelectedBankId(bankId);
  setShowBankSwitcherModal(false);
};

export const navigateToManageBanks = (navigation, currentAccount) => {
  if (!currentAccount) {
    Alert.alert('Error', 'No account selected.');
    return;
  }
  navigation.navigate('ManageBanksScreen', {
    accountEmail: currentAccount.email
  });
};

export const showDatePicker = (mode, setDatePickerMode, setShowDatePickerModal) => {
  setDatePickerMode(mode);
  setShowDatePickerModal(true);
};

export const handleDateSelect = (date, datePickerMode, customDateRange, setCustomDateRange, setDatePickerMode, setShowDatePickerModal, setSelectedTimeFrame, updateMarkedDates) => {
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

export const updateMarkedDates = (range, userBanks, selectedBankId, setMarkedDates) => {
  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  const bankColor = selectedBank ? selectedBank.color : Colors.primary;
  const newMarkedDates = {};
  if (range.start && range.end) {
    const startDateStr = range.start.toISOString().split('T')[0];
    newMarkedDates[startDateStr] = {
      selected: true,
      startingDay: true,
      color: bankColor
    };
    const endDateStr = range.end.toISOString().split('T')[0];
    newMarkedDates[endDateStr] = {
      selected: true,
      endingDay: true,
      color: bankColor
    };
    const currentDate = new Date(range.start);
    currentDate.setDate(currentDate.getDate() + 1);
    while (currentDate < range.end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      newMarkedDates[dateStr] = {
        selected: true,
        color: bankColor
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else if (range.start) {
    const startDateStr = range.start.toISOString().split('T')[0];
    newMarkedDates[startDateStr] = {
      selected: true,
      color: bankColor
    };
  }
  setMarkedDates(newMarkedDates);
};

export const getTimeFrameText = (timeframe, customRange) => {
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

export const simulateTransactionLoading = (isLoading, selectedBankId, selectedTimeFrame, customDateRange, setIsLoading, setShowProgress, setProgress, setProgressText, startLoading, userBanks) => {
  if (isLoading) return;
  if (!selectedBankId) {
    Alert.alert('Select Bank', 'Please select a bank to load transactions.');
    return;
  }
  if (selectedTimeFrame === TIME_FRAMES.CUSTOM && (!customDateRange.start || !customDateRange.end)) {
    Alert.alert('Incomplete Date Range', 'Please select both start and end dates.');
    return;
  }
  const selectedBank = userBanks.find(bank => bank.id === selectedBankId);
  Alert.alert(
    'Load Transactions',
    `This will fetch transactions for ${getTimeFrameText(selectedTimeFrame, customRange)} from ${selectedBank.name}. Continue?`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Load', 
        style: 'default',
        onPress: () => startLoading(setIsLoading, setShowProgress, setProgress, setProgressText, setTimeRemaining, completeLoading, loadingOperationRef)
      }
    ]
  );
};

export const startLoading = (setIsLoading, setShowProgress, setProgress, setProgressText, setTimeRemaining, completeLoading, loadingOperationRef) => {
  setIsLoading(true);
  setShowProgress(true);
  setProgress(0);
  setProgressText('Preparing to fetch transactions...');
  let currentProgress = 0;
  const interval = 50;
  const incrementAmount = 0.001;
  const estimatedDuration = 30000;
  const totalIncrements = estimatedDuration / interval;
  let currentIncrement = 0;
  setTimeout(() => {
    setProgressText('Connecting to Google servers...');
    const timer = setInterval(() => {
      currentIncrement++;
      const randomFactor = 1 + (Math.random() * 0.3 - 0.15);
      const slowdownFactor = 1 - (currentProgress * 0.5);
      currentProgress += incrementAmount * randomFactor * slowdownFactor;
      const newProgress = Math.min(0.97, currentProgress);
      setProgress(newProgress);
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
      const remainingIncrements = totalIncrements - currentIncrement;
      const remainingTimeSeconds = Math.ceil((remainingIncrements * interval) / 1000);
      setTimeRemaining(formatTimeRemaining(remainingTimeSeconds));
      loadingOperationRef.current = timer;
      if (currentIncrement >= totalIncrements - 10) {
        clearInterval(timer);
        completeLoading();
      }
    }, interval);
  }, 500);
};

export const formatTimeRemaining = (seconds) => {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  }
};

export const completeLoading = (setProgress, setProgressText, setShowProgress, setIsLoading, setTransactionsLoaded, setTransactions, selectedTimeFrame, customDateRange) => {
  setProgress(1);
  setProgressText('Successfully loaded transactions!');
  setTimeout(() => {
    setShowProgress(false);
    setIsLoading(false);
    setTransactionsLoaded(true);
    Alert.alert(
      'Transactions Loaded',
      `Successfully loaded transactions for ${getTimeFrameText(selectedTimeFrame, customDateRange)}.`,
      [{ text: 'OK' }]
    );
    setTransactions([]);
  }, 1000);
};

export const handleCancelLoading = (loadingOperationRef, setShowProgress, setIsLoading, setProgress) => {
  Alert.alert(
    'Cancel Loading',
    'Are you sure you want to cancel loading transactions?',
    [
      { text: 'Continue Loading', style: 'cancel' },
      { 
        text: 'Cancel Loading', 
        style: 'destructive',
        onPress: () => {
          if (loadingOperationRef.current) {
            clearInterval(loadingOperationRef.current);
            loadingOperationRef.current = null;
          }
          setShowProgress(false);
          setIsLoading(false);
          setProgress(0);
        }
      }
    ]
  );
};

export const animateModal = (visible, modalSlideAnimation, modalBackdropOpacity, setShowDatePickerModal) => {
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