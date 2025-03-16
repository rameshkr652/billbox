// src/components/PlatformTab.js - Fixed to handle account switching
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
  Platform as RNPlatform,
  ScrollView
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';
import * as StorageService from '../services/StorageService';
import ExpenseSummary from './ExpenseSummary';
import platforms from '../constants/platforms';
import AccountDrawer from './AccountDrawer';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import PlatformTabUtils from '../utils/PlatformTabUtils';
import PlatformTabComponents from './PlatformTabComponents';
import TopFavoritesSection from './TopFavoritesSection';

const PlatformTab = ({ platform, route }) => {
  const navigation = useNavigation();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  // Drawer state
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  
  // Get platform info
  const platformInfo = platforms.find(p => p.id === platform) || {
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    color: '#4285F4',
    icon: 'inbox'
  };
  useEffect(() => {
    // Check if we have a refresh trigger from account switching
    if (route.params?.refreshTrigger) {
      console.log(`PlatformTab (${platform}): Refresh triggered by parameter change:`, route.params.refreshTrigger);
      
      // MODIFIED: Don't clear existing data, just reload
      // This ensures data persistence between account switches
      loadPlatformData();
    }
  }, [route.params?.refreshTrigger]);
  
  // Also reload when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log(`PlatformTab (${platform}): Screen focused`);
      loadPlatformData();
    }, [])
  );
  
  useEffect(() => {
    loadPlatformData();
  }, []);
  
  // Load platform data with correct account
  const loadPlatformData = async () => {
    try {
      // Only show loading indicator if we don't have any emails yet
      if (emails.length === 0) {
        setLoading(true);
      }
      setError(null);
      
      // Get current main account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        throw new Error("No account found. Please add an account first.");
      }
      
      // Get platform configurations
      const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
      
      // Set account to use for this platform
      const platformAccount = platformsConfig && platformsConfig[platform] ? 
                             platformsConfig[platform].accountEmail || account.email : 
                             account.email;
      
      console.log(`PlatformTab (${platform}): Using account:`, platformAccount);
      
      // Check if account has changed
      const isAccountChanged = platformAccount !== accountEmail;
      
      // Update account email state
      setAccountEmail(platformAccount);
      
      // Load saved emails if any
      const savedEmails = await GmailService.getPlatformEmails(platform, platformAccount);
      
      // Get last fetched timestamp
      const lastFetchedTimestamp = await GmailService.getLastFetchedTimestamp(platform, platformAccount);
      const lastFetched = lastFetchedTimestamp ? new Date(parseInt(lastFetchedTimestamp)) : null;
      
      // Update state with loaded data
      setEmails(savedEmails || []);
      setLastFetched(lastFetched);
      setLoading(false);
      
      return { success: true };
    } catch (error) {
      console.error(`Error loading platform data for ${platform}:`, error);
      setLoading(false);
      setError(error.message || `Error loading data for ${platform}`);
      return { 
        success: false, 
        error: error.message || `Error loading data for ${platform}`
      };
    }
  };
  
  // Drawer functions
  const openAccountDrawer = () => {
    setShowAccountDrawer(true);
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeAccountDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: Dimensions.get('window').width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowAccountDrawer(false);
    });
  };
  
  // Fetch all emails
  const fetchAllEmails = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      setShowProgress(true);
      setProgress(0);
      setProgressText('Preparing to fetch emails...');
      
      // Ensure we have an account
      if (!accountEmail) {
        const account = await AccountService.getCurrentAccount();
        if (!account) {
          throw new Error('No account found. Please add an account first.');
        }
        setAccountEmail(account.email);
      }
      
      // Clear existing emails to avoid showing data from the wrong account
      setEmails([]);
      
      // Fetch all emails with progress tracking
      const result = await PlatformTabUtils.fetchAllEmails(
        platform,
        accountEmail, // Important: Use the current account email state
        platformInfo,
        (current, total, message, estimatedTimeRemaining) => {
          const progressValue = total > 0 ? current / total : 0;
          setProgress(0.1 + progressValue * 0.8); // Scale to 10-90% range
          setProgressText(message || `Processing ${current} of ${total} emails...`);
          
          if (estimatedTimeRemaining) {
            setTimeRemaining(PlatformTabUtils.formatTimeRemaining(estimatedTimeRemaining));
          }
        }
      );
      
      if (result.success) {
        setEmails(result.emails);
        setLastFetched(result.lastFetched);
        
        if (result.emails.length === 0) {
          Alert.alert('No Orders Found', `No ${platformInfo.name} orders found.`);
        }
      } else {
        setError(result.error);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error(`Error fetching emails for ${platform}:`, error);
      setError(error.message || `Failed to fetch data for ${platform}`);
      Alert.alert('Error', `Failed to fetch orders. ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowProgress(false);
      setTimeRemaining(null);
    }
  };
  
  // Fetch latest emails
  const fetchLatestEmails = async () => {
    if (loading || !lastFetched) return;
    
    try {
      setLoading(true);
      setError(null);
      setShowProgress(true);
      setProgress(0);
      setProgressText('Preparing to fetch latest emails...');
      
      // Get existing emails first to ensure we have them
      const existingEmails = [...emails];
      
      // Fetch latest emails with progress tracking
      const result = await PlatformTabUtils.fetchLatestEmails(
        platform,
        accountEmail,
        lastFetched,
        platformInfo,
        (current, total, message, estimatedTimeRemaining) => {
          const progressValue = total > 0 ? current / total : 0;
          setProgress(0.1 + progressValue * 0.8);
          setProgressText(message || `Processing ${current} of ${total} latest emails...`);
          
          if (estimatedTimeRemaining) {
            setTimeRemaining(PlatformTabUtils.formatTimeRemaining(estimatedTimeRemaining));
          }
        }
      );
      
      if (result.success) {
        // Get only new emails not in the existing set
        const newEmails = result.emails.filter(newEmail => {
          return !existingEmails.some(existingEmail => 
            existingEmail.id === newEmail.id || 
            (existingEmail.orderDetails?.orderId && 
             existingEmail.orderDetails.orderId === newEmail.orderDetails?.orderId)
          );
        });
        
        // Combine existing and new emails
        const combinedEmails = [...existingEmails, ...newEmails];
        
        // Update state
        setEmails(combinedEmails);
        setLastFetched(result.lastFetched);
        
        // Show appropriate notification
        if (newEmails.length === 0) {
          Alert.alert('No New Orders', `No new ${platformInfo.name} orders found since your last update.`);
        } else {
          Alert.alert('Success', `Found ${newEmails.length} new orders and updated your data.`);
        }
      } else {
        setError(result.error);
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error(`Error fetching latest emails for ${platform}:`, error);
      setError(error.message || `Failed to fetch latest data for ${platform}`);
      Alert.alert('Error', `Failed to fetch latest orders. ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowProgress(false);
      setTimeRemaining(null);
    }
  };
  
  // Clear emails
  const handleClearEmails = () => {
    setShowConfirmClear(true);
  };

  const performClearEmails = async () => {
    try {
      setLoading(true);
      
      // Clear emails for this specific platform and account
      const result = await GmailService.clearPlatformEmails(platform, accountEmail);
      
      if (result) {
        setEmails([]);
        setLastFetched(null);
        Alert.alert('Success', `All ${platformInfo.name} order data has been cleared.`);
      }
    } catch (error) {
      console.error(`Error clearing ${platform} emails:`, error);
      Alert.alert('Error', `Failed to clear emails: ${error.message}`);
    } finally {
      setLoading(false);
      setShowConfirmClear(false);
    }
  };
  
  // Render progress modal
  const renderProgressModal = () => (
    <PlatformTabComponents.ProgressModal
      visible={showProgress}
      platformName={platformInfo.name}
      platformColor={platformInfo.color}
      progressText={progressText}
      progress={progress}
      timeRemaining={timeRemaining}
    />
  );
  
  return (
    <SafeAreaView style={PlatformTabStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor={platformInfo.color} />
      
      {/* Content */}
      {loading && emails.length === 0 && !showProgress ? (
        <PlatformTabComponents.LoadingIndicator 
          platformName={platformInfo.name}
          platformColor={platformInfo.color}
        />
      ) : emails.length === 0 ? (
        <View>
          
          <PlatformTabComponents.ListHeader
            platformName={platformInfo.name}
            platformColor={platformInfo.color}
            lastFetched={lastFetched}
            loading={loading}
            emails={emails}
            onFetchAll={fetchAllEmails}
            onFetchLatest={fetchLatestEmails}
            onClear={handleClearEmails}
          />
          <PlatformTabComponents.EmptyState 
            platformIcon={platformInfo.icon}
            platformName={platformInfo.name}
            onRefresh={fetchAllEmails}
          />
        </View>
      ) : (
        // Here we replace the FlatList with our ExpenseSummary component
        <View style={{ flex: 1 }}>
        
          
          <PlatformTabComponents.ListHeader
            platformName={platformInfo.name}
            platformColor={platformInfo.color}
            lastFetched={lastFetched}
            loading={loading}
            emails={emails}
            onFetchAll={fetchAllEmails}
            onFetchLatest={fetchLatestEmails}
            onClear={handleClearEmails}
          />
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
            <ExpenseSummary 
              emails={emails} 
              platformColor={platformInfo.color}
            />
            <TopFavoritesSection 
              emails={emails} 
              platformColor={platformInfo.color}
            />
          </ScrollView>
        </View>
      )}
      
      {/* Error Message */}
      {error && !loading && (
        <PlatformTabComponents.ErrorMessage error={error} />
      )}
      
      {/* Progress Modal */}
      {renderProgressModal()}
      
      {/* Account Drawer */}
      {showAccountDrawer && (
        <Animated.View 
          style={[
            styles.accountDrawerContainer,
            {
              transform: [{ translateX: drawerAnimation }]
            }
          ]}
        >
          <AccountDrawer 
            platform={platform}
            accountEmail={accountEmail}
            onAccountChange={handleAccountChange}
            onClose={closeAccountDrawer}
          />
        </Animated.View>
      )}
      
      {showConfirmClear && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear Data</Text>
            <Text style={styles.modalText}>Are you sure you want to clear all {platformInfo.name} orders?</Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowConfirmClear(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.clearButton]}
                onPress={performClearEmails}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  accountInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    margin: 15,
    marginBottom: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  accountInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  accountInfoEmail: {
    fontWeight: 'bold',
  },
  accountDrawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  clearButton: {
    backgroundColor: "#DB4437",
  },
  cancelButtonText: {
    color: '#333',
  },
  clearButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default PlatformTab;