import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { AppProvider } from './src/context/AppContext';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';

// Request notification permission
const requestNotificationPermission = async () => {
  console.log('Starting permission request...');
  try {
    if (Platform.OS === 'android') {
      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      console.log('Permission already granted:', alreadyGranted);

      if (!alreadyGranted) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Enable Notifications for BillBox',
            message: 'BillBox wants to send you expense tracking reminders.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
            buttonNeutral: 'Ask Me Later',
          }
        );
        console.log('Permission request result:', granted);

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('Notification permission granted');
          return await getFCMToken();
        } else {
          console.log('Notification permission denied');
          return null;
        }
      } else {
        console.log('Permission already granted, fetching token');
        return await getFCMToken();
      }
    } else {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      console.log('iOS authorization status:', authStatus);
      if (enabled) {
        return await getFCMToken();
      }
      return null;
    }
  } catch (error) {
    console.error('Permission request error:', error);
    return null;
  }
};

// Get FCM token
const getFCMToken = async () => {
  try {
    await messaging().registerDeviceForRemoteMessages();
    await messaging().deleteToken(); // Force a new token
    const token = await messaging().getToken();
    console.log('New FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

const App = () => {
  useEffect(() => {
    console.log('App component mounted, initializing notifications...');
    const initializeNotifications = async () => {
      const token = await requestNotificationPermission();
      if (token) {
        console.log('Device registered with FCM token:', token);
      } else {
        console.log('No token retrieved');
      }
    };

    initializeNotifications().catch(error => {
      console.error('Error in initializeNotifications:', error);
    });

    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have a new message from BillBox!'
      );
    });

    const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('App opened from background notification:', remoteMessage);
      Alert.alert('Welcome Back!', 'You opened BillBox from a notification.');
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
    };
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