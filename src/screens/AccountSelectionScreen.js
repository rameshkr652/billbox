// src/screens/AccountSelectionScreen.js
import React, { useState, useEffect , useCallback} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import * as AccountService from '../services/AccountService';
import * as AuthService from '../services/AuthService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const AccountSelectionScreen = () => {
  const navigation = useNavigation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     loadAccounts();
//   }, []);

  useFocusEffect(
    useCallback(() => {
      // Reload accounts when screen is focused (coming back from WebAuth)
      loadAccounts();
    }, [])
  );

  const loadAccounts = async () => {
    try {
      const accountsList = await AccountService.getAccounts();
      setAccounts(accountsList);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };
  const handleAddAccount = async () => {
    try {
      // Instead of using GoogleSignin directly, we can use a WebView approach
      // This will show the account selector
      Alert.alert(
        'Add Google Account',
        'To add another Google account, you need to:',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: () => {
              // First, navigate to a WebView screen that handles OAuth
              navigation.navigate('WebAuth');
            }
          }
        ]
      );
    } catch (error) {
      console.log("Error initiating add account:", error);
      Alert.alert('Error', 'Could not initiate account add process');
    }
  };

  const selectAccount = async (email) => {
    try {
      await AccountService.setCurrentAccount(email);
      navigation.goBack();
    } catch (error) {
      console.error('Error selecting account:', error);
    }
  };

  const renderAccountItem = ({ item }) => (
    <TouchableOpacity
      style={styles.accountItem}
      onPress={() => selectAccount(item.email)}
    >
      <View style={styles.accountAvatar}>
        <Text style={styles.accountInitial}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
      <View style={styles.accountInfo}>
        <Text style={styles.accountName}>{item.name}</Text>
        <Text style={styles.accountEmail}>{item.email}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={Colors.gray} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Account</Text>
      </View>

      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.email}
        contentContainerStyle={styles.accountList}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.addAccountButton}
            onPress={handleAddAccount}
            disabled={loading}
          >
            <Icon name="add-circle" size={24} color={Colors.primary} />
            <Text style={styles.addAccountText}>Add Google Account</Text>
          </TouchableOpacity>
        }
      />
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
    accountList: {
      padding: 15,
    },
    accountItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: Colors.white,
      borderRadius: 12,
      padding: 15,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    accountAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: Colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    accountInitial: {
      fontSize: 22,
      fontWeight: 'bold',
      color: Colors.white,
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: Colors.darkGray,
      marginBottom: 4,
    },
    accountEmail: {
      fontSize: 14,
      color: Colors.gray,
    },
    addAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: Colors.white,
      borderRadius: 12,
      padding: 15,
      marginTop: 5,
      marginBottom: 20,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: Colors.primary,
    },
    addAccountText: {
      fontSize: 16,
      color: Colors.primary,
      marginLeft: 10,
      fontWeight: '500',
    },
  });

export default AccountSelectionScreen;