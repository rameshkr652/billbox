// src/screens/PlatformSelectionScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
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
  // In loadAccountData, update to initialize selectedPlatforms:
const loadAccountData = async () => {
    try {
      const account = await AccountService.getCurrentAccount();
      
      if (account) {
        setCurrentAccount(account);
        
        // Load platform selections for this account
        const accountPlatforms = await StorageService.getPlatformsForAccount(account.email);
        setPlatformSelections(accountPlatforms || {});
        
        // Set the selectedPlatforms array based on the loaded platform keys
        if (accountPlatforms) {
          const platformIds = Object.keys(accountPlatforms);
          console.log('Initializing selection with platforms:', platformIds);
          setSelectedPlatforms(platformIds);
        }
      } else {
        // Rest of your existing code...
      }
    } catch (error) {
      console.error('Error loading account data:', error);
    }
  };
// In PlatformSelectionScreen.js
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
    <TouchableOpacity
      style={[
        styles.platformItem,
        selectedPlatforms.includes(item.id) && { 
          borderColor: item.color, 
          borderWidth: 2,
          backgroundColor: `${item.color}10` // Light background for selected items
        }
      ]}
      onPress={() => togglePlatform(item.id)}
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Platforms</Text>
        <Text style={styles.subtitle}>
          Select which services you want to track
        </Text>
      </View>

      {currentAccount && (
        <View style={styles.accountInfo}>
          <Text style={styles.accountInfoText}>
            Signed in as: <Text style={styles.accountEmail}>{currentAccount.email}</Text>
          </Text>
          <TouchableOpacity 
            style={styles.changeAccountButton}
            onPress={() => navigation.navigate('AccountSelection')}
          >
            <Text style={styles.changeAccountText}>Change Account</Text>
          </TouchableOpacity>
        </View>
      )}

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
  disabled={selectedPlatforms.length === 0}
>
  <Text style={styles.buttonText}>Continue</Text>
  <Icon name="arrow-forward" size={20} color={Colors.white} />
</TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
  },
  platformList: {
    padding: 20,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkGray,
  },
  checkbox: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
  },
  continueButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: Colors.gray,
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
    marginRight: 10,
  },
  hint: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
  },
  // Add to your existing PlatformSelectionScreen styles
platformInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  accountInfo: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfoText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  changeAccountButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  changeAccountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  platformInfoContainer: {
    flex: 1,
    marginLeft: 10,
  },
  accountInfo: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountInfoText: {
    fontSize: 14,
    color: Colors.darkGray,
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  changeAccountButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  changeAccountText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default PlatformSelectionScreen;