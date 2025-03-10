import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';
import * as StorageService from '../services/StorageService';
import EmailItem from './EmailItem';
import platforms from '../constants/platforms';

const PlatformTab = ({ platform }) => {
  const navigation = useNavigation();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('7d'); // Default: 1 week
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0
  });
  
  // Animation value for refresh button
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  const platformInfo = platforms.find(p => p.id === platform) || {
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    color: Colors.primary,
    icon: 'inbox'
  };
  
  useEffect(() => {
    loadPlatformData();
  }, []);
  
  const loadPlatformData = async () => {
    try {
      setLoading(true);
      
      // Get current main account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        setError("No account found. Please add an account first.");
        setLoading(false);
        return;
      }
      
      // Get platform configurations
      const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
      if (!platformsConfig || !platformsConfig[platform]) {
        setError(`No configuration found for ${platformInfo.name}`);
        setLoading(false);
        return;
      }
      
      // Set account to use for this platform
      const platformAccount = platformsConfig[platform].accountEmail || account.email;
      setAccountEmail(platformAccount);
      
      // Load saved emails
      const savedEmails = await GmailService.getPlatformEmails(platform, platformAccount);
      setEmails(savedEmails || []);
      
      // Generate some mock statistics (replace with real data in production)
      generateStats(savedEmails || []);
      
      // Get last fetched timestamp
      const lastFetchedTimestamp = await GmailService.getLastFetchedTimestamp(platform, platformAccount);
      if (lastFetchedTimestamp) {
        setLastFetched(new Date(lastFetchedTimestamp));
      }
      
      setLoading(false);
    } catch (error) {
      console.error(`Error loading platform data for ${platform}:`, error);
      setError(`Error loading data: ${error.message}`);
      setLoading(false);
    }
  };
  
  const generateStats = (emails) => {
    // This would be replaced with real extraction of expenses from emails
    // For now, we'll generate some mock data
    
    const mockTotal = emails.length * (100 + Math.floor(Math.random() * 500));
    
    // Current month expenses (about 40% of total)
    const thisMonth = Math.floor(mockTotal * 0.4);
    
    // Last month expenses (about 60% of total)
    const lastMonth = mockTotal - thisMonth;
    
    setStats({
      total: mockTotal,
      thisMonth,
      lastMonth
    });
  };
  
  const handleChangeAccount = async () => {
    try {
      const accounts = await AccountService.getAccounts();
      
      const options = accounts.map(acc => ({
        text: acc.email,
        onPress: () => updatePlatformAccount(acc.email)
      }));
      
      options.push({
        text: 'Add New Account',
        onPress: () => navigation.navigate('WebAuth')
      });
      
      options.push({
        text: 'Cancel',
        style: 'cancel'
      });
      
      Alert.alert(
        'Select Account',
        `Choose which account to use for ${platformInfo.name}:`,
        options
      );
    } catch (error) {
      console.error('Error showing account options:', error);
      Alert.alert('Error', 'Failed to load account options');
    }
  };
  
  const updatePlatformAccount = async (email) => {
    try {
      setLoading(true);
      
      // Get current main account
      const mainAccount = await AccountService.getCurrentAccount();
      if (!mainAccount) {
        Alert.alert('Error', 'No main account found');
        setLoading(false);
        return;
      }
      
      // Get platform configurations
      const platformsConfig = await StorageService.getPlatformsForAccount(mainAccount.email) || {};
      
      // Update account for this platform
      platformsConfig[platform] = { accountEmail: email };
      
      // Save updated config
      await StorageService.savePlatformsForAccount(mainAccount.email, platformsConfig);
      
      // Update UI
      setAccountEmail(email);
      setEmails([]);
      setLastFetched(null);
      
      setLoading(false);
      
      // Show success message
      Alert.alert('Account Updated', `Now using ${email} for ${platformInfo.name}`);
    } catch (error) {
      console.error('Error updating platform account:', error);
      Alert.alert('Error', 'Failed to update account');
      setLoading(false);
    }
  };
  
  const getDateFilterQuery = () => {
    const today = new Date();
    let startDate = null;
    let endDate = today;
    let dateQuery = '';
    
    // Handle preset filters
    switch(timeFilter) {
      case '1d':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Beginning of today
        break;
      case '7d':
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate = new Date();
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate = new Date();
        startDate.setDate(today.getDate() - 90);
        break;
      case '1y':
        startDate = new Date();
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setDate(today.getDate() - 7);
    }
    
    // Format dates for Gmail query (YYYY/MM/DD)
    if (startDate) {
      const formatDate = (date) => {
        return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
      };
      
      dateQuery = `after:${formatDate(startDate)}`;
    }
    
    // Combine with platform query
    const platformQuery = platformInfo.emailQuery || `from:${platform}.com`;
    return `${platformQuery} ${dateQuery}`.trim();
  };
  
  const fetchEmails = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Start spinner animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
      
      if (!accountEmail) {
        const account = await AccountService.getCurrentAccount();
        if (!account) {
          throw new Error('No account found. Please add an account first.');
        }
        setAccountEmail(account.email);
      }
      
      const query = getDateFilterQuery();
      console.log(`Fetching emails with query: ${query}`);
      
      const newEmails = await GmailService.fetchPlatformEmails(platform, accountEmail, query);
      setEmails(newEmails || []);
      
      // Generate stats based on new emails
      generateStats(newEmails || []);
      
      const now = new Date();
      setLastFetched(now);
      
      if (newEmails.length === 0) {
        Alert.alert('No Data Found', `No ${platformInfo.name} data found for the selected time period.`);
      }
    } catch (error) {
      console.error(`Error fetching emails for ${platform}:`, error);
      setError(error.message || `Failed to fetch data for ${platform}`);
      Alert.alert('Error', `Failed to fetch data. ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      // Stop spinner animation
      spinAnim.setValue(0);
    }
  };
  
  const clearEmails = async () => {
    try {
      setLoading(true);
      await GmailService.clearPlatformEmails(platform, accountEmail);
      setEmails([]);
      setLastFetched(null);
      setStats({ total: 0, thisMonth: 0, lastMonth: 0 });
      Alert.alert('Success', `${platformInfo.name} data cleared.`);
    } catch (error) {
      console.error(`Error clearing ${platform} emails:`, error);
      Alert.alert('Error', `Failed to clear data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearEmails = () => {
    Alert.alert(
      'Clear Data',
      `Are you sure you want to clear all ${platformInfo.name} data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: clearEmails
        },
      ]
    );
  };
  
  const formatDate = (date) => {
    if (!date) return '';
    
    try {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return date.toString();
    }
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  const getTimeFilterLabel = () => {
    switch(timeFilter) {
      case '1d':
        return 'Today';
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case '90d':
        return 'Last 90 days';
      case '1y':
        return 'Last year';
      default:
        return 'Last 7 days';
    }
  };
  
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name={platformInfo.icon} size={60} color="#D1D5DB" />
      <Text style={styles.emptyText}>No expenses found</Text>
      <Text style={styles.emptySubtext}>
        Tap the refresh button to load your {platformInfo.name} expenses
      </Text>
      
      <TouchableOpacity
        style={[styles.emptyRefreshButton, { backgroundColor: platformInfo.color }]}
        onPress={fetchEmails}
      >
        <Icon name="refresh" size={20} color={Colors.white} />
        <Text style={styles.emptyRefreshButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
  
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.timeFilterSection}>
        <Text style={styles.timeFilterLabel}>Time Period:</Text>
        <View style={styles.timeFilterOptions}>
          <TouchableOpacity
            style={[
              styles.timeFilterChip,
              timeFilter === '7d' && [styles.timeFilterChipActive, { borderColor: platformInfo.color }]
            ]}
            onPress={() => {
              setTimeFilter('7d');
              fetchEmails();
            }}
          >
            <Text
              style={[
                styles.timeFilterChipText,
                timeFilter === '7d' && [styles.timeFilterChipTextActive, { color: platformInfo.color }]
              ]}
            >
              7 Days
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeFilterChip,
              timeFilter === '30d' && [styles.timeFilterChipActive, { borderColor: platformInfo.color }]
            ]}
            onPress={() => {
              setTimeFilter('30d');
              fetchEmails();
            }}
          >
            <Text
              style={[
                styles.timeFilterChipText,
                timeFilter === '30d' && [styles.timeFilterChipTextActive, { color: platformInfo.color }]
              ]}
            >
              30 Days
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeFilterChip,
              timeFilter === '90d' && [styles.timeFilterChipActive, { borderColor: platformInfo.color }]
            ]}
            onPress={() => {
              setTimeFilter('90d');
              fetchEmails();
            }}
          >
            <Text
              style={[
                styles.timeFilterChipText,
                timeFilter === '90d' && [styles.timeFilterChipTextActive, { color: platformInfo.color }]
              ]}
            >
              90 Days
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.timeFilterChip,
              timeFilter === '1y' && [styles.timeFilterChipActive, { borderColor: platformInfo.color }]
            ]}
            onPress={() => {
              setTimeFilter('1y');
              fetchEmails();
            }}
          >
            <Text
              style={[
                styles.timeFilterChipText,
                timeFilter === '1y' && [styles.timeFilterChipTextActive, { color: platformInfo.color }]
              ]}
            >
              1 Year
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.statisticsSection}>
        <View style={[styles.statisticsCard, { backgroundColor: platformInfo.color }]}>
          <View style={styles.statisticsCardHeader}>
            <Text style={styles.statisticsCardTitle}>Total Expenses</Text>
            <Icon name="account-balance-wallet" size={20} color={Colors.white} />
          </View>
          <Text style={styles.statisticsCardAmount}>{formatCurrency(stats.total)}</Text>
          <Text style={styles.statisticsCardPeriod}>{getTimeFilterLabel()}</Text>
        </View>
        
        <View style={styles.statisticsRow}>
          <View style={styles.statisticsSmallCard}>
            <Text style={styles.statisticsSmallTitle}>This Month</Text>
            <Text style={[styles.statisticsSmallAmount, { color: platformInfo.color }]}>
              {formatCurrency(stats.thisMonth)}
            </Text>
          </View>
          
          <View style={styles.statisticsSmallCard}>
            <Text style={styles.statisticsSmallTitle}>Last Month</Text>
            <Text style={[styles.statisticsSmallAmount, { color: platformInfo.color }]}>
              {formatCurrency(stats.lastMonth)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.expensesHeader}>
        <Text style={styles.expensesTitle}>Expense History</Text>
        <View style={styles.expensesActions}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchEmails}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={platformInfo.color} />
            ) : (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Icon name="refresh" size={22} color={platformInfo.color} />
              </Animated.View>
            )}
          </TouchableOpacity>
          
          {emails.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearEmails}
            >
              <Icon name="delete-outline" size={22} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {lastFetched && (
        <Text style={styles.lastUpdated}>
          Last updated: {formatDate(lastFetched)}
        </Text>
      )}
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={platformInfo.color} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: platformInfo.color }]}>
        <Text style={styles.headerTitle}>{platformInfo.name} Expenses</Text>
        
        <TouchableOpacity 
          style={styles.accountButton}
          onPress={handleChangeAccount}
        >
          <Text style={styles.accountButtonText}>{accountEmail || 'Select Account'}</Text>
          <Icon name="arrow-drop-down" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {loading && emails.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={platformInfo.color} />
          <Text style={styles.loadingText}>
            Loading {platformInfo.name} expenses...
          </Text>
        </View>
      ) : emails.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={emails}
          renderItem={({ item }) => (
            <EmailItem 
              email={item} 
              platformColor={platformInfo.color} 
              platform={platform}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={renderListHeader}
          onRefresh={fetchEmails}
          refreshing={refreshing}
        />
      )}
      
      {/* Error Message */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Icon name="error" size={20} color={Colors.accent} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 8,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  accountButtonText: {
    fontSize: 14,
    color: Colors.white,
    marginRight: 4,
  },
  list: {
    paddingBottom: 20,
  },
  listHeader: {
    padding: 15,
  },
  timeFilterSection: {
    marginBottom: 15,
  },
  timeFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  timeFilterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  timeFilterChipActive: {
    backgroundColor: '#FFF',
    borderWidth: 1,
  },
  timeFilterChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  timeFilterChipTextActive: {
    fontWeight: '600',
  },
  statisticsSection: {
    marginBottom: 20,
  },
  statisticsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  statisticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statisticsCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statisticsCardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 4,
  },
  statisticsCardPeriod: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statisticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statisticsSmallCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  statisticsSmallTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  statisticsSmallAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  expensesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  expensesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  expensesActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButton: {
    padding: 8,
  },
  lastUpdated: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 25,
    paddingHorizontal: 40,
  },
  emptyRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyRefreshButtonText: {
    color: Colors.white,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 12,
    margin: 15,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    marginLeft: 10,
    flex: 1,
  }
});

export default PlatformTab;