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
import DietaryPreferencesSection from './DietaryPreferencesSection';
import MealTimingAnalysis from './MealTimingAnalysis';
import OrderTimeMachineButton from './OrderTimeMachineButton';

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
  const [showAiTerminal, setShowAiTerminal] = useState(false);
  const [aiTerminalLines, setAiTerminalLines] = useState([]);
  const [aiProgress, setAiProgress] = useState(0);

  // Example food items for random display
  const foodItems = [
    "Butter Chicken", "Masala Dosa", "Chicken Biryani", "Paneer Tikka", 
    "Vada Pav", "Chole Bhature", "Pav Bhaji", "Dal Makhani", 
    "Tandoori Roti", "Palak Paneer", "Mutton Curry", "Fish Curry"
  ];

  // Function to add a line to the terminal
  const addTerminalLine = (line) => {
    setAiTerminalLines(prev => [...prev, line]);
  };
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
  }, [route.params?.refreshTrigger,]);
  
  // Also reload when the screen gains focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(platformInfo.color);
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
        (current, total, message, estimatedTimeRemaining, isAiProcessing) => {
          if (isAiProcessing) {
            // Add a random food item with "processing" message
            const randomFood = foodItems[Math.floor(Math.random() * foodItems.length)];
            addTerminalLine(`[AI] Processing: ${randomFood} from order #${Math.floor(1000 + Math.random() * 9000)}`);
            
            // Update progress for terminal display
            setAiProgress(current / total);
          } else {
            // Regular progress updates
            const progressValue = total > 0 ? current / total : 0;
            setProgress(0.1 + progressValue * 0.8);
            setProgressText(message || `Processing ${current} of ${total} latest emails...`);
            
            if (estimatedTimeRemaining) {
              setTimeRemaining(PlatformTabUtils.formatTimeRemaining(estimatedTimeRemaining));
            }
          }
        },

      setShowAiTerminal,
      setShowProgress
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
  // Fixed fetchLatestEmails function in PlatformTab.js
const fetchLatestEmails = async () => {
  if (loading || !lastFetched) return;
  
  try {
    setLoading(true);
    setError(null);
    setShowProgress(true);
    setProgress(0);
    setProgressText('Preparing to fetch latest emails...');
    
    // Make a copy of existing emails before fetching new ones
    const existingEmails = [...emails];
    console.log(`Existing emails before fetch: ${existingEmails.length}`);
    
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
      console.log(`New emails fetched: ${result.emails ? result.emails.length : 0}`);
      
      // Create a new array with only truly new emails
      const newEmails = [];
      
      // Check each new email to see if it's already in our existing set
      if (result.emails && result.emails.length > 0) {
        result.emails.forEach(newEmail => {
          // Check if this email is already in our existing set
          const isDuplicate = existingEmails.some(existingEmail => 
            existingEmail.id === newEmail.id || 
            (existingEmail.orderDetails?.orderId && 
             newEmail.orderDetails?.orderId && 
             existingEmail.orderDetails.orderId === newEmail.orderDetails.orderId)
          );
          
          // If it's not a duplicate, add it to our new emails array
          if (!isDuplicate) {
            newEmails.push(newEmail);
          }
        });
      }
      
      console.log(`Truly new emails (not duplicates): ${newEmails.length}`);
      
      // Combine existing and new emails
      const combinedEmails = [...existingEmails, ...newEmails];
      console.log(`Combined emails: ${combinedEmails.length}`);
      
      // Save the combined emails
      await GmailService.saveEmails(platform, accountEmail, combinedEmails);
      
      // Update state with combined emails
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
  
  const renderAiTerminalModal = () => (
    <Modal
      visible={showAiTerminal}
      transparent={true}
      animationType="fade"
    >
      <View style={terminalStyles.container}>
        <View style={terminalStyles.terminal}>
          <View style={terminalStyles.terminalHeader}>
            <View style={terminalStyles.trafficLights}>
              <View style={[terminalStyles.light, terminalStyles.redLight]} />
              <View style={[terminalStyles.light, terminalStyles.yellowLight]} />
              <View style={[terminalStyles.light, terminalStyles.greenLight]} />
            </View>
            <Text style={terminalStyles.terminalTitle}>AI Engine - Restaurant Analysis</Text>
          </View>
          
          <View style={terminalStyles.terminalBody}>
            <Text style={terminalStyles.welcome}>
              > BillBox AI Engine v3.7.2 - Restaurant Order Analyzer
              {'\n'}> Starting neural extraction module...
              {'\n'}> Loading natural language processors...
              {'\n'}> Initializing metadata analysis systems...
              {'\n'}> Ready. Processing email archive for extraction.
            </Text>
            
            <ScrollView>
              {aiTerminalLines.map((line, index) => (
                <Text key={index} style={terminalStyles.line}>
                  {line}
                </Text>
              ))}
              
              <View style={terminalStyles.progressLine}>
                <Text style={terminalStyles.progressText}>
                  [{Array(Math.floor(aiProgress * 20)).fill('=').join('')}
                  {'>'}
                  {Array(Math.floor(20 - aiProgress * 20)).fill(' ').join('')}] {' '}
                  {Math.floor(aiProgress * 100)}%
                </Text>
              </View>
              
              <BlinkingCursor />
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Blinking cursor component
  const BlinkingCursor = () => {
    const [visible, setVisible] = useState(true);
    
    useEffect(() => {
      const interval = setInterval(() => {
        setVisible(v => !v);
      }, 530);
      
      return () => clearInterval(interval);
    }, []);
    
    return (
      <Text style={terminalStyles.cursor}>
        {visible ? '█' : ' '}
      </Text>
    );
  };

  return (
    <SafeAreaView style={PlatformTabStyles.container}>
      <StatusBar barStyle="light-content" />
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
            <DietaryPreferencesSection 
              emails={emails} 
              platformColor={platformInfo.color}
            />
            <OrderTimeMachineButton 
              platformColor={platformInfo.color}
              emailCount={emails.length} 
            />
            <MealTimingAnalysis 
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
      {renderAiTerminalModal()}

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
const terminalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  terminal: {
    width: '95%',
    maxHeight: '80%',
    backgroundColor: '#000',
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#0f0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  trafficLights: {
    flexDirection: 'row',
    marginRight: 15,
  },
  light: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  redLight: {
    backgroundColor: '#FF5F56',
  },
  yellowLight: {
    backgroundColor: '#FFBD2E',
  },
  greenLight: {
    backgroundColor: '#27C93F',
  },
  terminalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  terminalBody: {
    padding: 12,
    minHeight: 300,
  },
  welcome: {
    color: '#0f8',
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 10,
  },
  line: {
    color: '#fff',
    fontFamily: 'Courier',
    fontSize: 12,
    marginBottom: 4,
  },
  progressLine: {
    marginTop: 10,
    marginBottom: 10,
  },
  progressText: {
    color: '#0f8',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  cursor: {
    color: '#0f8',
    fontFamily: 'Courier',
    fontSize: 12,
  }
});
export default PlatformTab;