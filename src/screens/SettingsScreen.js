// Updated SettingsScreen.js with improved account management
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import platforms from '../constants/platforms';
import * as AuthService from '../services/AuthService';
import * as StorageService from '../services/StorageService';
import * as AccountService from '../services/AccountService';
import * as GmailService from '../services/GmailService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Get current account
        const account = await AccountService.getCurrentAccount();
        if (account) {
          setUserInfo(account);
          
          // Load platform configuration for this account
          const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
          if (platformsConfig) {
            // Set selected platforms based on keys in platformsConfig
            setSelectedPlatforms(Object.keys(platformsConfig));
          }
        }
        
        // Load all accounts
        const accounts = await AccountService.getAccounts();
        setAllAccounts(accounts || []);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    
    loadSettings();
    
    // Listen for account updates
    const checkAccountUpdates = async () => {
      const accountsUpdated = await AsyncStorage.getItem('accountsUpdated');
      if (accountsUpdated) {
        loadSettings();
      }
    };
    
    // Set up check interval while screen is focused
    const interval = setInterval(checkAccountUpdates, 1000);
    
    // Clean up
    return () => clearInterval(interval);
  }, []);

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all saved order data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userInfo) {
                Alert.alert('Error', 'No account selected');
                return;
              }
              
              // Clear all platform data but keep user info and platform selections
              for (const platform of platforms) {
                await GmailService.clearPlatformEmails(platform.id, userInfo.email);
              }
              
              Alert.alert('Success', 'All order data has been cleared.');
            } catch (error) {
              console.error('Error clearing all data:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>            
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Platforms</Text>
        <View style={styles.card}>
          {platforms.map((platform) => (
            <View key={platform.id} style={styles.platformItem}>
              <View style={styles.platformInfo}>
              <View style={[styles.platformIcon, { backgroundColor: platform.color }]}>
                  <Icon name={platform.icon} size={20} color={Colors.white} />
                </View>
                <Text style={styles.platformName}>{platform.name}</Text>
              </View>
              <View style={styles.fixedBadge}>
                <Text style={styles.fixedBadgeText}>Fixed</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.dataActionButton}
            onPress={handleClearAllData}
          >
            <Icon name="delete-forever" size={24} color={Colors.accent} />
            <View style={styles.dataActionText}>
              <Text style={styles.dataActionTitle}>Clear All Data</Text>
              <Text style={styles.dataActionDescription}>
                Delete all saved order information
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.card}>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build</Text>
            <Text style={styles.aboutValue}>2025.03.24</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>BillBox © 2025</Text>
        <Text style={styles.footerText}>All Rights Reserved</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.white,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 10,
    marginLeft: 5,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.gray,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  platformItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  platformInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  platformIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  platformName: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  fixedBadge: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  fixedBadgeText: {
    fontSize: 12,
    color: '#666',
  },
  dataActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dataActionText: {
    flex: 1,
    marginLeft: 12,
  },
  dataActionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  dataActionDescription: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  aboutLabel: {
    fontSize: 16,
    color: Colors.darkGray,
  },
  aboutValue: {
    fontSize: 16,
    color: Colors.gray,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: Colors.gray,
  },
  // New styles for account management
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  smallAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  accountEmail: {
    fontSize: 12,
    color: Colors.gray,
  },
  signOutSmallButton: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  }
});

export default SettingsScreen;