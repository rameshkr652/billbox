// src/screens/SplashScreen.js (updated)
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start();

    // Initialize app
    const initApp = async () => {
        // Configure Google Sign-In
        GoogleSignin.configure({
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
          offlineAccess: true,
        });
      
        // Wait for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
      
        try {
          // Check if user is signed in
          const account = await AccountService.getCurrentAccount();
          
          if (account) {
            // Check if platforms are selected for this account
            const platformsConfig = await StorageService.getPlatformsForAccount(account.email);
            
            if (platformsConfig && Object.keys(platformsConfig).length > 0) {
              // User has selected platforms
              navigation.replace('Main');
            } else {
              // User is signed in but hasn't selected platforms
              navigation.replace('PlatformSelection');
            }
          } else {
            // User is not signed in
            navigation.replace('Intro');
          }
        } catch (error) {
          console.error('Error in splash screen:', error);
          navigation.replace('Intro');
        }
      };

    initApp();
  }, [navigation, fadeAnim, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.logoContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.iconGroup}>
          <View style={[styles.iconBox, { backgroundColor: Colors.swiggy }]}>
            <Icon name="fastfood" size={30} color={Colors.white} />
          </View>
          <View style={[styles.iconBox, { backgroundColor: Colors.zomato }]}>
            <Icon name="restaurant" size={30} color={Colors.white} />
          </View>
          <View style={[styles.iconBox, { backgroundColor: Colors.flipkart }]}>
            <Icon name="shopping-bag" size={30} color={Colors.white} />
          </View>
          <View style={[styles.iconBox, { backgroundColor: Colors.amazon }]}>
            <Icon name="shopping-cart" size={30} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.title}>OrderTrack</Text>
        <Text style={styles.subtitle}>Track all your orders in one place</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  logoContainer: {
    alignItems: 'center',
  },
  iconGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 140,
    height: 140,
    justifyContent: 'space-between',
    alignContent: 'space-between',
    marginBottom: 30,
  },
  iconBox: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray,
  },
});

export default SplashScreen;