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
import TransactionsScreen from '../screens/TransactionsScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import RestaurantsScreen from '../screens/RestaurantsScreen';
import FoodsScreen from '../screens/FoodsScreen';
import FoodDetailsScreen from '../screens/FoodDetailsScreen';
import RestaurantDetailsScreen from '../screens/RestaurantDetailsScreen';

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
        <Stack.Screen name="TransactionsScreen" component={TransactionsScreen} />
        <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
        <Stack.Screen name="RestaurantsScreen" component={RestaurantsScreen} />
        <Stack.Screen name="FoodsScreen" component={FoodsScreen} />
        <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
        <Stack.Screen name="FoodDetails" component={FoodDetailsScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;