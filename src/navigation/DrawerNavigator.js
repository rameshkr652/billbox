// src/navigation/DrawerNavigator.js (updated with user info at the top)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import PlatformTab from '../components/PlatformTab';
import * as AccountService from '../services/AccountService';
import * as AuthService from '../services/AuthService';
import * as StorageService from '../services/StorageService';
import SettingsScreen from '../screens/SettingsScreen';
import platforms from '../constants/platforms';
const Drawer = createDrawerNavigator();

// Custom drawer content with user info at the top
const CustomDrawerContent = (props) => {
  const [accounts, setAccounts] = useState([]);
  const [currentPlatform, setCurrentPlatform] = useState(null);
  const [currentAccount, setCurrentAccount] = useState(null);
  
  useEffect(() => {
    loadAccounts();
    // Extract current platform from navigation state
    const state = props.navigation.getState();
    if (state.routes.length > 0) {
      setCurrentPlatform(state.routes[state.index].name.toLowerCase());
    }
  }, [props.navigation]);
  
  const loadAccounts = async () => {
    try {
      const accountsList = await AccountService.getAccounts();
      setAccounts(accountsList);
      
      const current = await AccountService.getCurrentAccount();
      if (current) {
        setCurrentAccount(current);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };
  
  const handleAccountSelect = async (account) => {
    try {
      // If we have a current platform, update its account
      if (currentPlatform) {
        const mainAccount = await AccountService.getCurrentAccount();
        if (!mainAccount) return;
        
        const platformsConfig = await StorageService.getPlatformsForAccount(mainAccount.email) || {};
        platformsConfig[currentPlatform] = { accountEmail: account.email };
        await StorageService.savePlatformsForAccount(mainAccount.email, platformsConfig);
        
        // Close drawer
        props.navigation.closeDrawer();
        
        // Refresh the current screen
        props.navigation.setParams({ refreshTrigger: Date.now() });
      }
    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: async () => {
              try {
                await AuthService.signOut();
                props.navigation.reset({
                  index: 0,
                  routes: [{ name: 'Intro' }],
                });
              } catch (error) {
                console.error('Error signing out:', error);
              }
            } 
          },
        ]
      );
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <DrawerContentScrollView {...props}>
      {/* User info section at the top */}
      {currentAccount && (
        <View style={styles.userInfoContainer}>
          <View style={styles.avatar}>
            {currentAccount.photo ? (
              <Image 
                source={{ uri: currentAccount.photo }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarText}>
                {currentAccount.name ? currentAccount.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <View style={styles.userInfoDetails}>
            <Text style={styles.userName}>{currentAccount.name || 'User'}</Text>
            <Text style={styles.userEmail}>{currentAccount.email}</Text>
          </View>
        </View>
      )}
      
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Platforms</Text>
      </View>
      
      <View style={styles.accountsList}>
        {props.state.routes.map((route, index) => {
          if (route.name === 'Settings' || route.name === 'Logout') {
            return null; // Skip settings and logout, they'll be handled separately
          }
          
          const focused = index === props.state.index;
          const { options } = props.descriptors[route.key];
          
          return (
            <DrawerItem
              key={route.key}
              label={options.title || route.name}
              icon={options.drawerIcon}
              focused={focused}
              onPress={() => props.navigation.navigate(route.name)}
            />
          );
        })}
      </View>
      
      <View style={styles.separator} />
      
      {/* Settings item */}
      <DrawerItem
        label="Settings"
        icon={({ color, size }) => (
          <Icon name="settings" color={color} size={size} />
        )}
        onPress={() => props.navigation.navigate('Settings')}
      />
      
      {/* Logout item */}
      <DrawerItem
        label="Logout"
        icon={({ color, size }) => (
          <Icon name="logout" color={Colors.accent} size={size} />
        )}
        onPress={handleSignOut}
      />
    </DrawerContentScrollView>
  );
};

// Custom DrawerItem component
const DrawerItem = ({ label, icon, focused, onPress }) => {
  return (
    <TouchableOpacity
      style={[
        styles.drawerItem,
        focused && styles.drawerItemActive
      ]}
      onPress={onPress}
    >
      {icon && 
        icon({ 
          color: focused ? Colors.primary : '#666',
          size: 24
        })
      }
      <Text style={[
        styles.drawerItemLabel,
        focused && { color: Colors.primary, fontWeight: 'bold' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const DrawerNavigator = ({ selectedPlatforms }) => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerPosition: 'left',
        headerShown: false,
        drawerType: 'front',
      }}
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      {selectedPlatforms.map((platform) => (
        <Drawer.Screen
          key={platform}
          name={platform.charAt(0).toUpperCase() + platform.slice(1)}
          options={{
            title: platform.charAt(0).toUpperCase() + platform.slice(1),
            drawerIcon: ({ color, size }) => {
              const platformObj = platforms.find(p => p.id === platform);
              return <Icon name={platformObj?.icon || 'inbox'} size={size} color={color} />;
            }
          }}
        >
          {(props) => <PlatformTab platform={platform} {...props} />}
        </Drawer.Screen>
      ))}
      
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="settings" size={size} color={color} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  drawerItemActive: {
    backgroundColor: '#f0f8ff',
  },
  drawerItemLabel: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.darkGray,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  // User info styles
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primary,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfoDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default DrawerNavigator;