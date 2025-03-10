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
  Modal, 
  Dimensions,
  ProgressBarAndroid,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';
import * as StorageService from '../services/StorageService';
import EmailItem from './EmailItem';
import platforms from '../constants/platforms';
import AccountDrawer from './AccountDrawer';
import * as AuthService from '../services/AuthService';

// For iOS support
const ProgressBar = Platform.OS === 'ios' 
  ? require('@react-native-community/progress-bar-android').default 
  : ProgressBarAndroid;

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
  const [needsReAuthentication, setNeedsReAuthentication] = useState(false);
  // Drawer state
  const [showAccountDrawer, setShowAccountDrawer] = useState(false);
  const drawerAnimation = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  
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
      // Get current main account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        setError("No account found. Please add an account first.");
        return;
      }
      
      // Get platform configurations
      const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
      if (!platformsConfig || !platformsConfig[platform]) {
        setError(`No configuration found for ${platformInfo.name}`);
        return;
      }
      
      // Set account to use for this platform
      const platformAccount = platformsConfig[platform].accountEmail || account.email;
      setAccountEmail(platformAccount);
      
      // Load saved emails if any
      const savedEmails = await GmailService.getPlatformEmails(platform, platformAccount);
      setEmails(savedEmails || []);
      
      // Get last fetched timestamp
      const lastFetchedTimestamp = await GmailService.getLastFetchedTimestamp(platform, platformAccount);
      if (lastFetchedTimestamp) {
        setLastFetched(new Date(lastFetchedTimestamp));
      }
    } catch (error) {
      console.error(`Error loading platform data for ${platform}:`, error);
      setError(`Error loading data: ${error.message}`);
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
  
  const handleAccountChange = async (email) => {
    try {
      // Get current main account
      const mainAccount = await AccountService.getCurrentAccount();
      if (!mainAccount) return;
      
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
      
      // Close drawer
      closeAccountDrawer();
    } catch (error) {
      console.error('Error updating platform account:', error);
      Alert.alert('Error', 'Failed to update account');
    }
  };
  
  const fetchEmails = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      setShowProgress(true);
      setProgress(0);
      setProgressText('Preparing to fetch emails...');
      
      if (!accountEmail) {
        const account = await AccountService.getCurrentAccount();
        if (!account) {
          throw new Error('No account found. Please add an account first.');
        }
        setAccountEmail(account.email);
      }
      
      setProgressText('Authenticating...');
      setProgress(0.1);
      
      // Simple query for the platform - no date filters
      const query = platformInfo.emailQuery || `from:${platform}.com`;
      
      // Update the fetchPlatformEmails function to accept progress callback
      const newEmails = await GmailService.fetchAllPlatformEmails(
        platform, 
        accountEmail, 
        query,
        (current, total, message) => {
          const progressValue = total > 0 ? current / total : 0;
          setProgress(0.1 + progressValue * 0.8); // Scale to 10-90% range
          setProgressText(message || `Processing ${current} of ${total} emails...`);
        }
      );
      
      setProgressText('Saving data...');
      setProgress(0.95);
      
      setEmails(newEmails || []);
      
      const now = new Date();
      setLastFetched(now);
      setShowProgress(false);
      
      if (newEmails.length === 0) {
        Alert.alert('No Orders Found', `No ${platformInfo.name} orders found.`);
      }
    } catch (error) {
      console.error(`Error fetching emails for ${platform}:`, error);
      setError(error.message || `Failed to fetch data for ${platform}`);
      Alert.alert('Error', `Failed to fetch orders. ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setShowProgress(false);
    }
  };
  
  const clearEmails = async () => {
    try {
      setLoading(true);
      await GmailService.clearPlatformEmails(platform, accountEmail);
      setEmails([]);
      setLastFetched(null);
      Alert.alert('Success', `${platformInfo.name} orders cleared.`);
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
      `Are you sure you want to clear all ${platformInfo.name} orders?`,
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
  
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name={platformInfo.icon} size={60} color="#D1D5DB" />
      <Text style={styles.emptyText}>No orders found</Text>
      <Text style={styles.emptySubtext}>
        Tap 'Load All Orders' to fetch your {platformInfo.name} orders
      </Text>
    </View>
  );
  
  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <TouchableOpacity
        style={[
          styles.loadOrdersButton, 
          { backgroundColor: platformInfo.color },
          loading && styles.disabledButton
        ]}
        onPress={fetchEmails}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="refresh" size={20} color="#FFFFFF" />
            <Text style={styles.loadOrdersButtonText}>Load All Orders</Text>
          </>
        )}
      </TouchableOpacity>
      
      {lastFetched && (
        <Text style={styles.lastUpdated}>
          Last updated: {formatDate(lastFetched)}
        </Text>
      )}
      
      {emails.length > 0 && (
        <View style={styles.ordersHeader}>
          <Text style={styles.ordersTitle}>Order History</Text>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearEmails}
          >
            <Icon name="delete-outline" size={20} color={Colors.accent} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  const renderProgressModal = () => (
    <Modal
      visible={showProgress}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.progressModalOverlay}>
        <View style={styles.progressModalContent}>
          <Text style={styles.progressModalTitle}>Fetching Orders</Text>
          <Text style={styles.progressModalSubtitle}>
            Please wait while we fetch your {platformInfo.name} orders.
          </Text>
          <Text style={styles.progressModalText}>{progressText}</Text>
          <ProgressBar
            styleAttr="Horizontal"
            indeterminate={false}
            progress={progress}
            color={platformInfo.color}
            style={styles.progressBar}
          />
          <Text style={styles.progressModalNote}>
            This may take a while depending on the number of orders.
          </Text>
        </View>
      </View>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={platformInfo.color} />

      {/* Content */}
      {loading && emails.length === 0 && !showProgress ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={platformInfo.color} />
          <Text style={styles.loadingText}>
            Loading {platformInfo.name} orders...
          </Text>
        </View>
      ) : (
        <FlatList
          data={emails.slice(0, 10)} // Only show first 10 for testing
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
          ListEmptyComponent={emails.length === 0 ? renderEmptyState : null}
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
      
      {/* Progress Modal */}
      {renderProgressModal()}
      
      {/* Account Drawer */}
      {showAccountDrawer && (
        <Modal
          visible={showAccountDrawer}
          transparent={true}
          animationType="none"
          onRequestClose={closeAccountDrawer}
        >
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={closeAccountDrawer}
            />
            <Animated.View
              style={[
                styles.drawerContainer,
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
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '80%',
    height: '100%',
    backgroundColor: Colors.white,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  list: {
    paddingBottom: 20,
  },
  listHeader: {
    padding: 15,
  },
  loadOrdersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loadOrdersButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  ordersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearButtonText: {
    color: Colors.accent,
    fontSize: 14,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40,
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
  },
  progressModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  progressModalContent: {
    width: '85%',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  progressModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  progressModalSubtitle: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressModalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    marginBottom: 20,
  },
  progressModalNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8
  },
  progressModalSmallNote: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    opacity: 0.7
  }
});

export default PlatformTab;