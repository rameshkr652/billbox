// src/components/PlatformTab.js - Refactored
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  Alert,
  Animated,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
  TouchableOpacity,
  Platform as RNPlatform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as AccountService from '../services/AccountService';
import EmailItem from './EmailItem';
import platforms from '../constants/platforms';
import AccountDrawer from './AccountDrawer';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import PlatformTabUtils from '../utils/PlatformTabUtils';
import PlatformTabComponents from './PlatformTabComponents';
import FoodInsightsDashboard from './FoodInsightsDashboard';

// Import platform-specific progress bar
const ProgressBarAndroid = RNPlatform.OS === 'ios'
  ? require('@react-native-community/progress-bar-android').default
  : require('@react-native-community/progress-bar-android').default;

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
  const [viewMode, setViewMode] = useState('insights'); // 'list' or 'insights'

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
        setEmails(result.emails);
        setLastFetched(result.lastFetched);
        
        // Determine if any new emails were found
        const newCount = result.emails.length - emails.length;
        
        if (newCount <= 0) {
          Alert.alert('No New Orders', `No new ${platformInfo.name} orders found since your last update.`);
        } else {
          Alert.alert('Success', `Found ${newCount} new orders and updated your data.`);
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
    Alert.alert(
      'Clear Data',
      `Are you sure you want to clear all ${platformInfo.name} orders?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await PlatformTabUtils.clearEmails(platform, accountEmail);
              
              if (result.success) {
                setEmails([]);
                setLastFetched(null);
                Alert.alert('Success', `${platformInfo.name} orders cleared.`);
              } else {
                Alert.alert('Error', result.error || 'Failed to clear data');
              }
            } catch (error) {
              console.error(`Error clearing ${platform} emails:`, error);
              Alert.alert('Error', `Failed to clear data: ${error.message}`);
            } finally {
              setLoading(false);
            }
          }
        },
      ]
    );
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
          contentContainerStyle={PlatformTabStyles.list}
          ListHeaderComponent={
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
          }
          ListEmptyComponent={
            emails.length === 0 ? (
              <PlatformTabComponents.EmptyState 
                platformIcon={platformInfo.icon}
                platformName={platformInfo.name}
                onRefresh={fetchAllEmails}
              />
            ) : null
          }
          onRefresh={lastFetched ? fetchLatestEmails : fetchAllEmails}
          refreshing={refreshing}
        />
      )}
      
      {/* Error Message */}
      {error && !loading && (
        <PlatformTabComponents.ErrorMessage error={error} />
      )}
      
      {/* Progress Modal */}
      {renderProgressModal()}
      
      {/* Account Drawer */}
      {renderAccountDrawer()}
    </SafeAreaView>
  );
};

export default PlatformTab;