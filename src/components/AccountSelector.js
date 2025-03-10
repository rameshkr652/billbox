// src/components/AccountSelector.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const AccountSelector = ({ accounts, selectedAccount, onSelectAccount, onAddAccount }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gmail Account</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountList}>
        {accounts.map(account => (
          <TouchableOpacity
            key={account.email}
            style={[
              styles.accountItem,
              selectedAccount === account.email && styles.selectedAccount
            ]}
            onPress={() => onSelectAccount(account.email)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {account.name ? account.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.email} numberOfLines={1}>{account.email}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={onAddAccount}
        >
          <Icon name="add-circle" size={24} color={Colors.primary} />
          <Text style={styles.addText}>Add Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.darkGray,
  },
  accountList: {
    flexDirection: 'row',
  },
  accountItem: {
    alignItems: 'center',
    marginRight: 15,
    padding: 8,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 8,
    minWidth: 100,
  },
  selectedAccount: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  avatarText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  email: {
    fontSize: 12,
    color: Colors.darkGray,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gray,
    borderRadius: 8,
    minWidth: 100,
  },
  addText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 5,
  },
});

export default AccountSelector;