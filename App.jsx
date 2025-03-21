// App.js
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/context/AppContext';
import { LogBox } from 'react-native';
import * as AccountService from './src/services/AccountService';
import * as StorageService from './src/services/StorageService';
import platforms from './src/constants/platforms';

// Ignore specific warnings if needed
LogBox.ignoreLogs(['Reanimated 2']);

const App = () => {
  useEffect(() => {
    // Ensure all platforms are enabled for the current account
    const ensurePlatforms = async () => {
      try {
        const account = await AccountService.getCurrentAccount();
        if (!account) return;

        // Get current platform configurations
        const platformsConfig = await StorageService.getPlatformsForAccount(account.email) || {};
        
        // Get list of all available platforms
        const allPlatformIds = platforms.map(platform => platform.id);
        
        // Check if any platforms are missing
        let configUpdated = false;
        for (const platformId of allPlatformIds) {
          if (!platformsConfig[platformId]) {
            // Add missing platform with the current account
            platformsConfig[platformId] = { accountEmail: account.email };
            configUpdated = true;
          }
        }
        
        // Save updated config if changes were made
        if (configUpdated) {
          await StorageService.savePlatformsForAccount(account.email, platformsConfig);
          console.log(`Added missing platforms for ${account.email}`);
        }
      } catch (error) {
        console.error('Error ensuring all platforms:', error);
      }
    };
    
    ensurePlatforms();
  }, []);
  
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
};

export default App;