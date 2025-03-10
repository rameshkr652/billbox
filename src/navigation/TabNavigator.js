// src/navigation/TabNavigator.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import PlatformTab from '../components/PlatformTab';
import Colors from '../constants/colors';
import platforms from '../constants/platforms';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const navigation = useNavigation();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  useEffect(() => {
    loadSelectedPlatforms();
    
    // Set up event listener for when returning from settings
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedPlatforms();
    });
    
    return unsubscribe;
  }, [navigation]);

  // In TabNavigator.js
// In TabNavigator.js
const loadSelectedPlatforms = async () => {
    try {
      console.log('TabNavigator: Loading platforms...');
      
      // Direct AsyncStorage check for debugging
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('All AsyncStorage keys:', allKeys);
      
      // Get current account
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        console.log('TabNavigator: No account found');
        return;
      }
      
      console.log('TabNavigator: Current account:', account.email);
      
      // Try direct AsyncStorage access first
      const storageKey = `platforms_${account.email}`;
      const rawData = await AsyncStorage.getItem(storageKey);
      console.log('TabNavigator: Raw platform data:', rawData);
      
      if (rawData) {
        const platformsConfig = JSON.parse(rawData);
        console.log('TabNavigator: Parsed platforms config:', platformsConfig);
        
        // Get platform IDs from config
        const platformIds = Object.keys(platformsConfig);
        console.log('TabNavigator: Platform IDs:', platformIds);
        
        if (platformIds.length > 0) {
          setSelectedPlatforms(platformIds);
          return;
        }
      }
      
      console.log('TabNavigator: No platforms found or empty config');
      setSelectedPlatforms([]);
    } catch (error) {
      console.error('TabNavigator: Error loading selected platforms:', error);
      setSelectedPlatforms([]);
    }
  };

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.icon : 'inbox';
  };
  
  const getPlatformColor = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.color : Colors.primary;
  };

  if (selectedPlatforms.length === 0) {
    return (
      <View style={styles.noPlatformsContainer}>
        <Icon name="inbox" size={80} color={Colors.gray} />
        <Text style={styles.noPlatformsText}>No platforms selected</Text>
        <TouchableOpacity
          style={styles.selectPlatformsButton}
          onPress={() => navigation.navigate('PlatformSelection')}
        >
          <Text style={styles.selectPlatformsText}>Select Platforms</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray,
        tabBarStyle: { paddingBottom: 5, height: 60 },
        headerShown: false,
      }}
    >
      {selectedPlatforms.map((platform) => (
        <Tab.Screen
          key={platform}
          name={platform.charAt(0).toUpperCase() + platform.slice(1)}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Icon name={getPlatformIcon(platform)} size={size} color={color} />
            ),
            tabBarActiveTintColor: getPlatformColor(platform),
          }}
        >
          {() => <PlatformTab platform={platform} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
};

const styles = {
  noPlatformsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.white,
  },
  noPlatformsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.gray,
    marginTop: 15,
    marginBottom: 20,
  },
  selectPlatformsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  selectPlatformsText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
};

export default TabNavigator;