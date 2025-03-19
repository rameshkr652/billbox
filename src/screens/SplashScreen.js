// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Image
} from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/colors';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoMoveAnim = useRef(new Animated.Value(0)).current;
  
  // Individual animations for platform icons
  const platformAnims = {
    swiggy: useRef(new Animated.Value(80)).current,
    zomato: useRef(new Animated.Value(-80)).current,
    flipkart: useRef(new Animated.Value(80)).current,
    amazon: useRef(new Animated.Value(-80)).current,
  };

  useEffect(() => {
    // Start initial logo animation
    Animated.sequence([
      // Fade in and scale up logo
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.7)),
          useNativeDriver: true,
        })
      ]),
      
      // Short pause
      Animated.delay(300),
      
      // Animate platform icons in
      Animated.parallel([
        Animated.timing(platformAnims.swiggy, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(platformAnims.zomato, {
          toValue: 0,
          duration: 500,
          delay: 100,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(platformAnims.flipkart, {
          toValue: 0,
          duration: 500,
          delay: 200,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(platformAnims.amazon, {
          toValue: 0,
          duration: 500,
          delay: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      
      // Move logo to final position
      Animated.timing(logoMoveAnim, {
        toValue: 1,
        duration: 800,
        delay: 500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();

    // Initialize app after animations
    const initApp = async () => {
      try {
        // Configure Google Sign-In
        GoogleSignin.configure({
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
          offlineAccess: true,
        });
        
        // Wait for full animation duration
        await new Promise(resolve => setTimeout(resolve, 3200));
        
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
  }, [navigation, fadeAnim, scaleAnim, logoMoveAnim]);

  // Interpolate for logo movement
  const logoTranslateY = logoMoveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.08]
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Logo and app name */}
      <Animated.View 
        style={[
          styles.logoContainer, 
          { 
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: logoTranslateY }
            ]
          }
        ]}
      >
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>BB</Text>
        </View>
        <Text style={styles.title}>BillBox</Text>
        <Text style={styles.subtitle}>Track all your orders in one place</Text>
      </Animated.View>
      
      {/* Platform Icons */}
      <View style={styles.platformsContainer}>
        <Animated.View 
          style={[
            styles.platformIcon, 
            styles.swiggyIcon,
            { transform: [{ translateX: platformAnims.swiggy }] }
          ]}
        >
          <Icon name="fastfood" size={28} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.platformIcon, 
            styles.zomatoIcon,
            { transform: [{ translateX: platformAnims.zomato }] }
          ]}
        >
          <Icon name="restaurant" size={28} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.platformIcon, 
            styles.flipkartIcon,
            { transform: [{ translateX: platformAnims.flipkart }] }
          ]}
        >
          <Icon name="shopping-bag" size={28} color="#FFFFFF" />
        </Animated.View>
        
        <Animated.View 
          style={[
            styles.platformIcon, 
            styles.amazonIcon,
            { transform: [{ translateX: platformAnims.amazon }] }
          ]}
        >
          <Icon name="shopping-cart" size={28} color="#FFFFFF" />
        </Animated.View>
      </View>
      
      {/* Bottom gradient and version */}
      <View style={styles.bottomContainer}>
        <Text style={styles.versionText}>v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9fb',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#5d5d5d',
    letterSpacing: 0.5,
  },
  platformsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
    width: '100%',
    height: 80,
    position: 'absolute',
    bottom: height * 0.2,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  swiggyIcon: {
    backgroundColor: Colors.swiggy,
  },
  zomatoIcon: {
    backgroundColor: Colors.zomato,
  },
  flipkartIcon: {
    backgroundColor: Colors.flipkart,
  },
  amazonIcon: {
    backgroundColor: Colors.amazon,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#a0a0a0',
  }
});

export default SplashScreen;