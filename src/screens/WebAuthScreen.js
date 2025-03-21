// src/screens/WebAuthScreen.js - Updated with generic navigation solution
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const WebAuthScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  
  const addNewGoogleAccount = async () => {
    try {
      setLoading(true);
      
      // Sign out first to ensure selection screen appears
      await GoogleSignin.signOut();
      
      // Configure Google Sign-In
      GoogleSignin.configure({
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
        offlineAccess: true,
      });
      
      const userInfo = await GoogleSignin.signIn();
      const tokens = await GoogleSignin.getTokens();
      
      if (userInfo?.data?.user) {
        const user = userInfo.data.user;
        
        // Save account
        const accounts = await AsyncStorage.getItem('accounts');
        const accountsList = accounts ? JSON.parse(accounts) : [];
        
        // Check if account already exists
        const existingIndex = accountsList.findIndex(a => a.email === user.email);
        if (existingIndex >= 0) {
          Alert.alert('Account Exists', 'This Google account is already added.');
        } else {
          const newAccount = {
            email: user.email,
            name: user.name,
            photo: user.photo,
            accessToken: tokens.accessToken
          };
          
          accountsList.push(newAccount);
          await AsyncStorage.setItem('accounts', JSON.stringify(accountsList));
          
          Alert.alert('Success', 'Account added successfully');
          
          // Set a global flag to notify any screens that account data has changed
          await AsyncStorage.setItem('accountsUpdated', Date.now().toString());
          
          // Go back to previous screen
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Error adding account:', error);
      Alert.alert('Error', 'Failed to add account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Google Account</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.instructions}>
          To use multiple Google accounts, you need to sign in with each account you want to use.
        </Text>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={addNewGoogleAccount}
          disabled={loading}
        >
          <Icon name="add-circle" size={24} color={Colors.white} />
          <Text style={styles.addButtonText}>
            {loading ? 'Connecting...' : 'Connect Google Account'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          This will open Google's sign-in page. Please select or add the account you want to use.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.white,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: Colors.darkGray,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.white,
    marginLeft: 10,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.gray,
    marginTop: 20,
  },
});

export default WebAuthScreen;