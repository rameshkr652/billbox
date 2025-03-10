// src/context/AppContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AuthService from '../services/AuthService';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        setIsLoading(true);
        
        // Configure Google Sign-In
        AuthService.configureGoogleSignIn();
        
        // Load user data
        const user = await GoogleSignin.getCurrentUser();
        if (user) {
          setUserInfo(user.user);
          
          // Load selected platforms
          const platforms = await AsyncStorage.getItem('selectedPlatforms');
          if (platforms) {
            setSelectedPlatforms(JSON.parse(platforms));
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const updateSelectedPlatforms = async (platforms) => {
    try {
      setSelectedPlatforms(platforms);
      await AsyncStorage.setItem('selectedPlatforms', JSON.stringify(platforms));
      return true;
    } catch (error) {
      console.error('Error updating platforms:', error);
      return false;
    }
  };

  const signIn = async () => {
    try {
      const user = await AuthService.signIn();
      setUserInfo(user);
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await AuthService.signOut();
      setUserInfo(null);
      setSelectedPlatforms([]);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        userInfo,
        selectedPlatforms,
        isLoading,
        signIn,
        signOut,
        updateSelectedPlatforms,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);

export default AppContext;