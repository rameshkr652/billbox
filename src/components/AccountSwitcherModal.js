// AccountSwitcherModal.js - A beautiful modal for switching accounts
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

const AccountSwitcherModal = ({ 
  visible, 
  onClose, 
  accounts = [], 
  currentAccount,
  onAccountSelect,
  platformName,
  platformColor,
  onAddNewAccount
}) => {
  const [slideAnim] = useState(new Animated.Value(height));
  const [fadeAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    if (visible) {
      // Animate modal sliding up and background fading in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    } else {
      // Reset animations when modal is closed
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible]);
  
  const handleClose = () => {
    // Animate modal sliding down and background fading out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      onClose();
    });
  };
  
  const handleAccountSelect = (account) => {
    onAccountSelect(account);
    handleClose();
  };
  
  const renderAccountItem = ({ item }) => {
    const isCurrentAccount = item.email === currentAccount;
    
    return (
      <TouchableOpacity
        style={[
          styles.accountItem,
          isCurrentAccount && [styles.accountItemSelected, { backgroundColor: `${platformColor}10` }]
        ]}
        onPress={() => handleAccountSelect(item)}
      >
        <View style={styles.accountAvatar}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.accountInitial}>
              {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>
        
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{item.name || 'User'}</Text>
          <Text style={styles.accountEmail}>{item.email}</Text>
        </View>
        
        {isCurrentAccount && (
          <View style={[styles.checkCircle, { backgroundColor: platformColor }]}>
            <Icon name="check" size={16} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  if (!visible) return null;
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.overlayTouch}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerLeft}>
                <Icon name="account-circle" size={22} color={platformColor} />
                <Text style={styles.modalTitle}>Choose Account for {platformName}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.divider} />
            
            <FlatList
              data={accounts}
              renderItem={renderAccountItem}
              keyExtractor={(item) => item.email}
              contentContainerStyle={styles.accountsList}
            />
            
            <TouchableOpacity 
              style={styles.addAccountButton}
              onPress={() => {
                handleClose();
                onAddNewAccount();
              }}
            >
              <View style={[styles.addIconCircle, { backgroundColor: platformColor }]}>
                <Icon name="add" size={20} color="#fff" />
              </View>
              <Text style={[styles.addAccountText, { color: platformColor }]}>
                Add New Google Account
              </Text>
            </TouchableOpacity>
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Each platform can use a different Google account
              </Text>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: height * 0.4,
    maxHeight: height * 0.8,
  },
  modalContent: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  closeButton: {
    padding: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  accountsList: {
    paddingVertical: 10,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  accountItemSelected: {
    borderWidth: 1,
    borderColor: '#eee',
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
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  accountInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 15,
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addAccountText: {
    fontSize: 15,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  }
});

export default AccountSwitcherModal;