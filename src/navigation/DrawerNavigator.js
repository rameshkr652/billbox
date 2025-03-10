// src/navigation/DrawerNavigator.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import PlatformTab from '../components/PlatformTab';
import * as AccountService from '../services/AccountService';

const Drawer = createDrawerNavigator();

// Custom right drawer content for account selection
const RightDrawerContent = (props) => {
  const [accounts, setAccounts] = React.useState([]);
  const [currentPlatform, setCurrentPlatform] = React.useState(null);
  const [currentAccount, setCurrentAccount] = React.useState(null);
  
  React.useEffect(() => {
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
        // This will depend on how you've structured your navigation
        props.navigation.setParams({ refreshTrigger: Date.now() });
      }
    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };
  
  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>Select Account</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => props.navigation.closeDrawer()}
        >
          <Icon name="close" size={24} color={Colors.darkGray} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.accountsList}>
        {accounts.map(account => (
          <TouchableOpacity
            key={account.email}
            style={[
              styles.accountItem,
              currentAccount?.email === account.email && styles.accountItemActive
            ]}
            onPress={() => handleAccountSelect(account)}
          >
            <View style={styles.accountAvatar}>
              <Text style={styles.accountInitial}>
                {account.name ? account.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{account.name || 'User'}</Text>
              <Text style={styles.accountEmail}>{account.email}</Text>
            </View>
            {currentAccount?.email === account.email && (
              <Icon name="check" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <TouchableOpacity
        style={styles.addAccountButton}
        onPress={() => {
          props.navigation.closeDrawer();
          props.navigation.navigate('WebAuth');
        }}
      >
        <Icon name="add-circle" size={20} color={Colors.primary} />
        <Text style={styles.addAccountText}>Add New Account</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = ({ selectedPlatforms }) => {
  return (
    <Drawer.Navigator
      screenOptions={{
        drawerPosition: 'right',
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: '75%',
        },
      }}
      drawerContent={props => <RightDrawerContent {...props} />}
    >
      {selectedPlatforms.map((platform) => (
        <Drawer.Screen
          key={platform}
          name={platform.charAt(0).toUpperCase() + platform.slice(1)}
          options={{
            title: platform.charAt(0).toUpperCase() + platform.slice(1),
          }}
        >
          {(props) => <PlatformTab platform={platform} {...props} />}
        </Drawer.Screen>
      ))}
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.darkGray,
  },
  closeButton: {
    padding: 4,
  },
  accountsList: {
    paddingVertical: 12,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  accountItemActive: {
    backgroundColor: '#f0f8ff',
  },
  accountAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.white,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGray,
  },
  accountEmail: {
    fontSize: 14,
    color: Colors.gray,
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addAccountText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 12,
  },
});

export default DrawerNavigator;