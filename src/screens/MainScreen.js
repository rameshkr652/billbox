// src/screens/MainScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import Colors from '../constants/colors';
import * as AuthService from '../services/AuthService';
import PlatformTab from '../components/PlatformTab';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import platforms from '../constants/platforms';
import DrawerNavigator from '../navigation/DrawerNavigator';
import { tokenCache } from '../services/GmailService';

const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

// In MainScreen.js, fixed HeaderAccountButton to preserve data between account switches
const HeaderAccountButton = ({ platform, navigation }) => {
  const [accountEmail, setAccountEmail] = useState('');
  
  useEffect(() => {
    const getAccountInfo = async () => {
      try {
        const account = await AccountService.getCurrentAccount();
        if (!account) return;
        
        const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
        if (platformsConfig && platformsConfig[platform]) {
          setAccountEmail(platformsConfig[platform].accountEmail || account.email);
        } else {
          setAccountEmail(account.email);
        }
      } catch (error) {
        console.error('Error getting account info:', error);
      }
    };
    
    getAccountInfo();
  }, [platform]);
  
  // Handle account selection directly here
  const handleAccountSelect = async () => {
    try {
      const accounts = await AccountService.getAccounts();
      
      const options = accounts.map(acc => ({
        text: acc.email,
        onPress: () => updatePlatformAccount(acc.email)
      }));
      
      options.push({
        text: 'Add New Account',
        onPress: () => navigation.navigate('WebAuth')
      });
      
      options.push({
        text: 'Cancel',
        style: 'cancel'
      });
      
      Alert.alert(
        'Select Account',
        `Choose which account to use for ${platform}:`,
        options
      );
    } catch (error) {
      console.error('Error showing account options:', error);
      Alert.alert('Error', 'Failed to load account options');
    }
  };
  
  // Update platform account function with improved refresh mechanism
  // FIXED to preserve data between account switches
  // In MainScreen.js, modify the updatePlatformAccount function

const updatePlatformAccount = async (email) => {
  try {
    // Get current main account
    const mainAccount = await AccountService.getCurrentAccount();
    if (!mainAccount) {
      Alert.alert('Error', 'No main account found');
      return;
    }
    
    // Get platform configurations
    const platformsConfig = await StorageService.getPlatformsForAccount(mainAccount.email) || {};
    
    // Update account for this platform
    platformsConfig[platform] = { accountEmail: email };
    
    // Save updated config
    await StorageService.savePlatformsForAccount(mainAccount.email, platformsConfig);
    
    // Update UI
    setAccountEmail(email);
    
    // Show success message
    Alert.alert('Account Updated', `Now using ${email} for ${platform}`);
    
    // Force PlatformTab to refresh by setting a unique refresh trigger
    // This is the key part: we use a timestamp to ensure the value is always different
    if (navigation.isFocused()) {
      navigation.setParams({ refreshTrigger: Date.now() });
      
      // IMPORTANT: Removed the call to clearPlatformData to preserve data when switching accounts
      // We want data to persist until explicitly cleared
    }
  } catch (error) {
    console.error('Error updating platform account:', error);
    Alert.alert('Error', 'Failed to update account');
  }
};
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 16,
      }}
      onPress={handleAccountSelect}
    >
      <Icon name="account-circle" size={18} color="#fff" />
      <Text style={{color: '#fff', marginLeft: 6, fontSize: 14, marginRight: 4}}>
        {accountEmail ? accountEmail.split('@')[0] : 'Account'}
      </Text>
      <Icon name="arrow-drop-down" size={18} color="#fff" />
    </TouchableOpacity>
  );
};

// Custom drawer content component
const CustomDrawerContent = (props) => {
  const { state, descriptors, navigation } = props;
  const [platformAccounts, setPlatformAccounts] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [activePlatform, setActivePlatform] = useState(null);
  
  useEffect(() => {
    loadPlatformAccounts();
    loadUserInfo();
    
    // Get active route
    if (state.routes && state.index >= 0) {
      const activeRouteName = state.routes[state.index].name;
      setActivePlatform(activeRouteName.toLowerCase());
    }
    
    // Reload accounts when drawer opens
    const unsubscribe = navigation.addListener('focus', () => {
      loadPlatformAccounts();
      loadUserInfo();
    });
    return unsubscribe;
  }, [navigation, state]);
  
  const loadPlatformAccounts = async () => {
    try {
      const account = await AccountService.getCurrentAccount();
      if (!account) return;
      
      const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
      setPlatformAccounts(platformsConfig || {});
    } catch (error) {
      console.error('Error loading platform accounts:', error);
    }
  };
  
  const loadUserInfo = async () => {
    try {
      const account = await AccountService.getCurrentAccount();
      if (account) {
        setUserInfo(account);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };
  
  return (
    <ScrollView style={styles.drawerContainer}>
      {/* User info section at the top */}
      {userInfo && (
        <View style={styles.userInfoContainer}>
          <View style={styles.avatar}>
            {userInfo.photo ? (
              <Image 
                source={{ uri: userInfo.photo }} 
                style={styles.avatarImage} 
              />
            ) : (
              <Text style={styles.avatarText}>
                {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.userName}>
              {userInfo.name || 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {activePlatform ? (
                <>
                  <Text style={styles.platformLabel}>
                    {activePlatform.charAt(0).toUpperCase() + activePlatform.slice(1)}:{' '}
                  </Text>
                  {userInfo.email || 'Loading...'}
                </>
              ) : (
                userInfo.email || 'Loading...'
              )}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Platforms</Text>
      </View>
      
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title || route.name;
        const platformId = route.name.toLowerCase();
        const isActive = state.index === index;
        
        // Get platform info
        const platformInfo = platforms.find(p => p.id === platformId) || {
          name: platformId.charAt(0).toUpperCase() + platformId.slice(1),
          color: Colors.primary,
          icon: 'inbox'
        };
        
        // Get account email for this platform
        const platformConfig = platformAccounts[platformId];
        const accountEmail = platformConfig ? platformConfig.accountEmail : '';
        
        return (
          <View key={route.key} style={styles.drawerItem}>
            <TouchableOpacity
              style={[
                styles.drawerItemMain,
                isActive && styles.drawerItemActive
              ]}
              onPress={() => navigation.navigate(route.name)}
            >
              <View style={styles.drawerItemContent}>
                {options.drawerIcon && 
                  options.drawerIcon({ 
                    color: isActive ? platformInfo.color : '#666',
                    size: 24
                  })
                }
                <Text style={[
                  styles.drawerItemLabel,
                  isActive && { color: platformInfo.color, fontWeight: 'bold' }
                ]}>
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
            
            {accountEmail && (
              <TouchableOpacity 
                style={styles.accountButton}
                onPress={() => {
                  navigation.navigate(route.name);
                  // Allow time for navigation to complete
                  setTimeout(() => {
                    props.navigation.closeDrawer();
                  }, 300);
                }}
              >
                <Icon name="account-circle" size={16} color="#666" />
                <Text style={styles.accountButtonText}>
                  {accountEmail.split('@')[0]}
                </Text>
                <Icon name="arrow-drop-down" size={16} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      
      {/* Settings and Logout options */}
      <View style={styles.drawerFooter}>
        <TouchableOpacity 
          style={styles.drawerFooterButton}
          onPress={() => {
            navigation.navigate('Settings');
            navigation.closeDrawer();
          }}
        >
          <Icon name="settings" size={20} color="#666" />
          <Text style={styles.drawerFooterButtonText}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.drawerFooterButton, styles.logoutButton]}
          onPress={() => {
            navigation.closeDrawer();
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
                      navigation.reset({
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
          }}
        >
          <Icon name="logout" size={20} color={Colors.accent} />
          <Text style={[styles.drawerFooterButtonText, { color: Colors.accent }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const MainScreen = () => {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [activePlatform, setActivePlatform] = useState(null);
  const [navigationKey, setNavigationKey] = useState(Date.now());

  // Listen for route changes to update active platform
  useEffect(() => {
    const updateActivePlatform = async () => {
      try {
        // Check if navigation state exists
        if (!navigation.getState || !navigation.getState().routes) {
          console.log('Navigation state not available');
          return;
        }
        
        // Get the current route from navigation state
        const routes = navigation.getState().routes;
        const currentRoute = routes[routes.length - 1];
        
        if (!currentRoute) return;
        
        const platformId = currentRoute.name.toLowerCase();
        setActivePlatform(platformId);
        
        // Load platform-specific account info
        const account = await AccountService.getCurrentAccount();
        if (!account) return;
        
        const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
        if (!platformsConfig || !platformsConfig[platformId]) return;
        
        const platformAccountEmail = platformsConfig[platformId].accountEmail || account.email;
        
        const accounts = await AccountService.getAccounts();
        const platformAccount = accounts.find(acc => acc.email === platformAccountEmail);
        
        if (platformAccount) {
          setUserInfo({
            name: platformAccount.name,
            email: platformAccount.email,
            photo: platformAccount.photo
          });
        }
      } catch (error) {
        console.error('Error updating active platform:', error);
      }
    };
    
    const unsubscribe = navigation.addListener('state', updateActivePlatform);
    updateActivePlatform();
    
    return unsubscribe;
  }, [navigation]);

  // Listen for focus to reload platforms when returning to screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadSelectedPlatforms();
    });
    
    return unsubscribe;
  }, [navigation]);

  // Check for updates triggered by platform selection screen
  useEffect(() => {
    const checkPlatformsUpdate = async () => {
      try {
        const updated = await AsyncStorage.getItem('platformsUpdated');
        if (updated === 'true') {
          await AsyncStorage.removeItem('platformsUpdated');
          loadSelectedPlatforms();
        }
      } catch (error) {
        console.error('Error checking platform updates:', error);
      }
    };
    
    checkPlatformsUpdate();
    loadUserInfo();
    loadSelectedPlatforms();
  }, []);

  const loadUserInfo = async () => {
    try {
      const currentAccount = await AccountService.getCurrentAccount();
      
      if (currentAccount) {
        setUserInfo({
          name: currentAccount.name,
          email: currentAccount.email,
          photo: currentAccount.photo
        });
      } else {
        navigation.replace('Intro');
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadSelectedPlatforms = async () => {
    try {
      console.log('Loading platforms...');
      
      const account = await AccountService.getCurrentAccount();
      if (!account) {
        console.log('No account found');
        setSelectedPlatforms([]);
        return;
      }
      
      const storageKey = `platforms_${account.email}`;
      
      const platformsData = await AsyncStorage.getItem(storageKey);
      console.log('Platforms data loaded:', platformsData);
      
      let newPlatforms = [];
      if (platformsData) {
        const platformsConfig = JSON.parse(platformsData);
        newPlatforms = Object.keys(platformsConfig);
        console.log('Found platforms:', newPlatforms);
      }
      
      // Check if there are any changes to the platforms list
      const platformsChanged = 
        newPlatforms.length !== selectedPlatforms.length || 
        newPlatforms.some(p => !selectedPlatforms.includes(p)) ||
        selectedPlatforms.some(p => !newPlatforms.includes(p));
      
      if (platformsChanged) {
        console.log('Platforms changed, updating UI');
        setSelectedPlatforms(newPlatforms);
        // Force re-render of navigator
        setNavigationKey(Date.now());
      }
    } catch (error) {
      console.error('Error loading selected platforms:', error);
    }
  };

  const getPlatformIcon = (platformId) => {
    const platform = platforms.find(p => p.id === platformId);
    return platform ? platform.icon : 'inbox';
  };

  const handleSignOut = () => {
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
              navigation.replace('Intro');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          } 
        },
      ]
    );
  };

  const handleEditPlatforms = () => {
    navigation.navigate('PlatformSelection');
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      {selectedPlatforms.length > 0 ? (
        <Drawer.Navigator
          key={navigationKey}
          drawerContent={props => <CustomDrawerContent {...props} />}
          screenOptions={{
            drawerActiveTintColor: Colors.primary,
            drawerInactiveTintColor: Colors.gray,
            headerTintColor: '#fff',
          }}
        >
          {selectedPlatforms.map((platform) => {
            const platformInfo = platforms.find(p => p.id === platform) || {
              name: platform.charAt(0).toUpperCase() + platform.slice(1),
              color: Colors.primary,
              icon: 'inbox'
            };
            
            return (
              <Drawer.Screen
                key={platform}
                name={platform.charAt(0).toUpperCase() + platform.slice(1)}
                options={({ navigation }) => ({
                  drawerIcon: ({color, size}) => (
                    <Icon name={getPlatformIcon(platform)} size={size} color={color} />
                  ),
                  headerStyle: { 
                    backgroundColor: platformInfo.color,
                  },
                  headerRight: () => (
                    <HeaderAccountButton 
                      platform={platform} 
                      navigation={navigation}
                    />
                  )
                })}
              >
                {(props) => <PlatformTab {...props} platform={platform} />}
              </Drawer.Screen>
            );
          })}
        </Drawer.Navigator>
      ) : (
        <View style={styles.noPlatformsContainer}>
          <Icon name="inbox" size={80} color={Colors.gray} />
          <Text style={styles.noPlatformsText}>No platforms selected</Text>
          <TouchableOpacity
            style={styles.selectPlatformsButton}
            onPress={handleEditPlatforms}
          >
            <Text style={styles.selectPlatformsText}>Select Platforms</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 15,
  },
  noPlatformsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPlatformsText: {
    fontSize: 18,
    color: Colors.gray,
    marginTop: 20,
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  platformLabel: {
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
    fontWeight: 'bold',
  },
  // Drawer styles
  drawerContainer: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  drawerHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  drawerItem: {
    marginBottom: 4,
  },
  drawerItemMain: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  drawerItemActive: {
    backgroundColor: '#f0f0f0',
  },
  drawerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemLabel: {
    fontSize: 16,
    marginLeft: 16,
    color: Colors.darkGray,
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginLeft: 40,
    marginRight: 16,
    marginTop: -4,
    marginBottom: 8,
  },
  accountButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  // Footer styles
  drawerFooter: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  drawerFooterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  drawerFooterButtonText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 16,
  },
  logoutButton: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  }
});

export default MainScreen;