// src/screens/IntroScreen.js
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as AuthService from '../services/AuthService';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');

const IntroScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef(null);

  const signIn = async () => {
    try {
      setLoading(true);
      await AuthService.signIn();
      navigation.replace('PlatformSelection');
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
    }
  };

  const features = [
    {
      id: '1',
      title: 'Expense Management',
      description: 'Track all your invoices, bills, and expenses in one secure dashboard',
      icon: 'account-balance-wallet',
      color: Colors.primary,
    },
    {
      id: '2',
      title: 'Health Updates',
      description: 'Monitor medical appointments, prescriptions, and health reports',
      icon: 'favorite',
      color: '#E91E63', // Pink for health
    },
    {
      id: '3',
      title: 'Multiple Accounts',
      description: 'Connect different Gmail accounts for work, personal, and family needs',
      icon: 'people',
      color: Colors.flipkart,
    },
    {
      id: '4',
      title: 'Smart Analytics',
      description: 'Get insights on spending patterns and health metrics over time',
      icon: 'insert-chart',
      color: Colors.amazon,
    },
  ];

  const renderFeatureItem = ({ item }) => (
    <View style={styles.featureItem}>
      <View style={[styles.featureIconContainer, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={30} color="#FFFFFF" />
      </View>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureDescription}>{item.description}</Text>
    </View>
  );

  const handleScroll = (event) => {
    const { contentOffset } = event.nativeEvent;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentPage(pageNum);
  };

  const goToPage = (index) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="receipt-long" size={40} color={Colors.white} />
          <Text style={styles.appTitle}>BillBox</Text>
        </View>
        <Text style={styles.appSubtitle}>Your digital finance & health assistant</Text>
      </View>

      {/* Features Carousel */}
      <View style={styles.featuresContainer}>
        <FlatList
          ref={flatListRef}
          data={features}
          renderItem={renderFeatureItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.featuresList}
        />
        
        {/* Pagination */}
        <View style={styles.pagination}>
          {features.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.paginationDot,
                index === currentPage && styles.paginationDotActive,
              ]}
              onPress={() => goToPage(index)}
            />
          ))}
        </View>
      </View>

      {/* Benefits */}
      <View style={styles.benefitsSection}>
        <Text style={styles.benefitsSectionTitle}>Why use BillBox?</Text>
        
        <View style={styles.benefitItem}>
          <Icon name="savings" size={24} color={Colors.primary} />
          <Text style={styles.benefitText}>Track expenses and save money with spending insights</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Icon name="local-hospital" size={24} color={Colors.primary} />
          <Text style={styles.benefitText}>Never miss important health updates and appointments</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Icon name="receipt" size={24} color={Colors.primary} />
          <Text style={styles.benefitText}>Organize bills and medical documents automatically</Text>
        </View>
      </View>

      {/* Sign-in Section */}
      <View style={styles.signInSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Connecting to Google...</Text>
          </View>
        ) : (
          <>
            <GoogleSigninButton
              style={styles.googleButton}
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Light}
              onPress={signIn}
            />
            
            <TouchableOpacity
              style={styles.alternateSignInButton}
              onPress={signIn}
              activeOpacity={0.8}
            >
              <Icon name="login" size={20} color={Colors.primary} />
              <Text style={styles.alternateSignInButtonText}>
                Sign in with Gmail
              </Text>
            </TouchableOpacity>
          </>
        )}
        
        <Text style={styles.termsText}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  featuresContainer: {
    marginTop: 20,
    height: 220,
  },
  featuresList: {
    maxHeight: 200,
  },
  featureItem: {
    width: width,
    padding: 20,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: Colors.darkGray,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.gray,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  benefitsSection: {
    paddingHorizontal: 25,
    marginVertical: 20,
  },
  benefitsSectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.darkGray,
    marginBottom: 15,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.darkGray,
    marginLeft: 12,
    flex: 1,
  },
  signInSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  googleButton: {
    width: 240,
    height: 48,
    marginBottom: 15,
  },
  alternateSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  alternateSignInButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.gray,
    fontSize: 14,
  },
  termsText: {
    fontSize: 12,
    color: Colors.gray,
    textAlign: 'center',
    marginHorizontal: 20,
  },
});

export default IntroScreen;