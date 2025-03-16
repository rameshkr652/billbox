// src/components/PlatformTab.js - Fixed to properly merge new emails
import React, { useState, useEffect, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';
import ExpenseSummary from './ExpenseSummary'; // Import the new component
import platforms from '../constants/platforms';
import AccountDrawer from './AccountDrawer';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import PlatformTabUtils from '../utils/PlatformTabUtils';
import PlatformTabComponents from './PlatformTabComponents';
import TopFavoritesSection from './TopFavoritesSection';

const PlatformTab = ({ platform }) => {
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
    loadPlatformData();
  }, []);
  
  // Load platform data
  const loadPlatformData = async () => {
    const result = await PlatformTabUtils.loadPlatformData(platform, (platformData) => {
      setAccountEmail(platformData.accountEmail);
      setEmails(platformData.emails);
      setLastFetched(platformData.lastFetched);
    });
    
    if (!result.success) {
      setError(result.error);
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
  
  // Handle account change
  const handleAccountChange = async (email) => {
    try {
      // Get current main account
      const mainAccount = await AccountService.getCurrentAccount();
      
      const result = await PlatformTabUtils.updatePlatformAccount(
        platform, 
        email, 
        mainAccount
      );
      
      if (result.success) {
        // Update UI
        setAccountEmail(email);
        setEmails([]);
        setLastFetched(null);
        setError(null);
        
        // Close drawer
        closeAccountDrawer();
      } else {
        Alert.alert('Error', result.error || 'Failed to update account');
      }
    } catch (error) {
      console.error('Error updating platform account:', error);
      Alert.alert('Error', 'Failed to update account');
    }
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
      
      // Fetch all emails with progress tracking
      const result = await PlatformTabUtils.fetchAllEmails(
        platform,
        accountEmail,
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
      const result = await PlatformTabUtils.clearEmails(platform, accountEmail);
      
      if (result.success) {
        setEmails([]);
        setLastFetched(null);
      }
    } catch (error) {
      console.error(`Error clearing ${platform} emails:`, error);
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
  
  // Render account drawer
  const renderAccountDrawer = () => (
    showAccountDrawer && (
      <Modal
        visible={showAccountDrawer}
        transparent={true}
        animationType="none"
        onRequestClose={closeAccountDrawer}
      >
        <View style={PlatformTabStyles.drawerOverlay}>
          <TouchableOpacity
            style={PlatformTabStyles.drawerBackdrop}
            activeOpacity={1}
            onPress={closeAccountDrawer}
          />
          <Animated.View
            style={[
              PlatformTabStyles.drawerContainer,
              {
                transform: [{ translateX: drawerAnimation }],
              },
            ]}
          >
            <AccountDrawer
              platform={platform}
              accountEmail={accountEmail}
              onAccountChange={handleAccountChange}
              onClose={closeAccountDrawer}
            />
          </Animated.View>
        </View>
      </Modal>
    )
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
      {renderAccountDrawer()}
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