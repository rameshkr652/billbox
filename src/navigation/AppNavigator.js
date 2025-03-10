// src/navigation/AppNavigator.js (updated)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import IntroScreen from '../screens/IntroScreen';
import PlatformSelectionScreen from '../screens/PlatformSelectionScreen';
import MainScreen from '../screens/MainScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountSelectionScreen from '../screens/AccountSelectionScreen';
import WebAuthScreen from '../screens/WebAuthScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="PlatformSelection" component={PlatformSelectionScreen} />
        <Stack.Screen name="Main" component={MainScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AccountSelection" component={AccountSelectionScreen} />
        <Stack.Screen name="WebAuth" component={WebAuthScreen} />


      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;