import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import platforms from '../constants/platforms';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlatformSelectionScreen = () => {
  const navigation = useNavigation();
  const [platformSelections, setPlatformSelections] = useState({});
  const [currentAccount, setCurrentAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    loadAccountData();
  }, []);

  // Add this to see the selection state changes
  useEffect(() => {
    console.log('selectedPlatforms changed:', selectedPlatforms);
  }, [selectedPlatforms]);

  // Modified loadAccountData to preselect all platforms
  const loadAccountData = async () => {
    try {
      const account = await AccountService.getCurrentAccount();
      
      if (account) {
        setCurrentAccount(account);
        
        // Load platform selections for this account
        const accountPlatforms = await StorageService.getPlatformsForAccount(account.email);
        setPlatformSelections(accountPlatforms || {});
        
        // Check if we already have saved platforms
        if (accountPlatforms && Object.keys(accountPlatforms).length > 0) {
          // Use the saved platform selections
          const platformIds = Object.keys(accountPlatforms);
          console.log('Using existing platform selection:', platformIds);
          setSelectedPlatforms(platformIds);
        } else {
          // Preselect all platforms if no previous selection exists
          const allPlatformIds = platforms.map(platform => platform.id);
          console.log('Preselecting all platforms:', allPlatformIds);
          setSelectedPlatforms(allPlatformIds);
        }
      } else {
        // No account found, redirect to sign in
        Alert.alert('No Account', 'Please sign in to continue');
        navigation.replace('Intro');
      }
    } catch (error) {
      console.error('Error loading account data:', error);
      Alert.alert('Error', 'Failed to load account data. Please try again.');
    }
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prevSelected => {
      const isAlreadySelected = prevSelected.includes(platformId);
      
      // For debugging
      console.log(`Platform ${platformId} was ${isAlreadySelected ? 'already selected' : 'not selected'}`);
      
      let newSelection;
      if (isAlreadySelected) {
        // Remove platform if already selected
        newSelection = prevSelected.filter(id => id !== platformId);
      } else {
        // Add platform if not selected
        newSelection = [...prevSelected, platformId];
      }
      
      console.log('New selection state:', newSelection);
      return newSelection;
    });
  };
  
  const savePlatformsAndContinue = async () => {
    if (selectedPlatforms.length === 0) {
      Alert.alert('No Platforms Selected', 'Please select at least one platform');
      return;
    }
  
    try {
      setLoading(true);
      console.log('Saving platforms, selected:', selectedPlatforms);
      
      // Get current account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        Alert.alert('Error', 'No account found. Please sign in again.');
        setLoading(false);
        return;
      }
      
      // Create platform config object with explicit structure
      const platformConfig = {};
      selectedPlatforms.forEach(platformId => {
        platformConfig[platformId] = { accountEmail: account.email };
      });
      
      console.log('Platform config to save:', platformConfig);
      
      // Save platform config directly with AsyncStorage for debugging
      const storageKey = `platforms_${account.email}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(platformConfig));
      
      // Verify it was saved correctly
      const savedData = await AsyncStorage.getItem(storageKey);
      console.log('Verification - direct saved data:', savedData);
      
      // Now navigate
      console.log('Navigating to Main screen');
      navigation.replace('Main');
    } catch (error) {
      console.error('Error saving selected platforms:', error);
      Alert.alert('Error', 'Failed to save your selections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlatformItem = ({ item }) => (
    <View
      style={[
        styles.platformItem,
        selectedPlatforms.includes(item.id) && { 
          borderColor: item.color, 
          borderWidth: 2,
          backgroundColor: `${item.color}10` // Light background for selected items
        }
      ]}
    >
      <View style={[styles.logoContainer, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={30} color={Colors.white} />
      </View>
      <Text style={styles.platformName}>{item.name}</Text>
      <View style={styles.checkbox}>
        {selectedPlatforms.includes(item.id) && (
          <Icon name="check-circle" size={24} color={item.color} />
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Platforms</Text>
      </View>

      <FlatList
        data={platforms}
        renderItem={renderPlatformItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.platformList}
      />

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            selectedPlatforms.length === 0 && styles.disabledButton
          ]}
          onPress={savePlatformsAndContinue}
          disabled={selectedPlatforms.length === 0 || loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={[styles.buttonText, styles.loadingText]}>Saving...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.buttonText}>Continue</Text>
              <Icon name="arrow-forward" size={20} color={Colors.white} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 8,
  },
  accountInfoText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  accountEmail: {
    fontWeight: 'bold',
  },
  changeAccountButton: {
    padding: 8,
  },
  changeAccountText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  platformList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  platformName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  checkbox: {
    width: 30,
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  // New styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 10,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}10`,
  },
  selectAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default PlatformSelectionScreen;