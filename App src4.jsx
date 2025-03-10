// App.js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/context/AppContext';
import { LogBox } from 'react-native';

// Ignore specific warnings if needed
LogBox.ignoreLogs(['Reanimated 2']);

const App = () => {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
};

export default App;