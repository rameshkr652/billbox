// src/screens/IntroScreen.js
import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
  Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as AuthService from '../services/AuthService';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

const IntroScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;

  // Animated values for the sign-in button
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  // Animate the elements when the component mounts
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Sign-in button press animation
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0.7,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const signIn = async () => {
    try {
      animateButton();
      setLoading(true);
      await AuthService.signIn();
      
      // Go directly to Main screen after sign in
      // No need to go to platform selection screen anymore
      navigation.replace('Main');
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
    }
  };

  const features = [
    {
      id: '1',
      title: "Track All Your Orders",
      description: "BillBox automatically organizes all your food and shopping orders from Gmail into one beautiful dashboard",
      icon: "receipt-long",
      secondaryIcon: "local-mall",
      color: Colors.primary
    },
    {
      id: '2',
      title: "Monitor Expenses",
      description: "See exactly how much you've spent across different platforms with detailed analytics and trends",
      icon: "account-balance-wallet",
      secondaryIcon: "trending-up",
      color: Colors.accent
    },
    {
      id: '3',
      title: "Multiple Accounts",
      description: "Connect different Gmail accounts and manage all your platforms separately for work and personal use",
      icon: "people",
      secondaryIcon: "account-circle",
      color: Colors.flipkart
    }
  ];

  const renderFeatureItem = ({ item, index }) => {
    // Calculate if this item is the current one
    const isCurrent = index === currentPage;
    
    return (
      <View style={styles.featureItem}>
        <View style={[styles.featureIconsContainer, { backgroundColor: `${item.color}15` }]}>
          <View style={[styles.primaryIconContainer, { backgroundColor: item.color }]}>
            <Icon name={item.icon} size={60} color="#FFFFFF" />
          </View>
          
          {/* Secondary floating icons */}
          <View style={[styles.secondaryIconContainer, { backgroundColor: item.color, top: 100, right: 80 }]}>
            <Icon name={item.secondaryIcon} size={30} color="#FFFFFF" />
          </View>
          
          <View style={[styles.secondaryIconContainer, { backgroundColor: `${item.color}90`, bottom: 90, left: 80 }]}>
            <Icon name={index === 0 ? "fastfood" : (index === 1 ? "bar-chart" : "settings")} size={26} color="#FFFFFF" />
          </View>
          
          {/* Decorative dots */}
          <View style={[styles.decorativeDot, { top: 70, left: 60, backgroundColor: `${item.color}40` }]} />
          <View style={[styles.decorativeDot, { bottom: 60, right: 70, backgroundColor: `${item.color}60` }]} />
          <View style={[styles.decorativeDot, { top: 160, right: 50, backgroundColor: `${item.color}30` }]} />
        </View>
        
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </View>
    );
  };

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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Logo */}
      <Animated.View 
        style={[
          styles.header, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>BB</Text>
          </View>
          <View>
            <Text style={styles.appTitle}>BillBox</Text>
            <Text style={styles.appSubtitle}>Simplify your expense tracking</Text>
          </View>
        </View>
      </Animated.View>

      {/* Features Carousel */}
      <Animated.View 
        style={[
          styles.featuresContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
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
                index === currentPage && [
                  styles.paginationDotActive,
                  { backgroundColor: features[currentPage].color }
                ],
              ]}
              onPress={() => goToPage(index)}
            />
          ))}
        </View>
      </Animated.View>

      {/* Sign-in Button */}
      <Animated.View 
        style={[
          styles.signInSection,
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: translateY },
              { scale: buttonScale }
            ] 
          }
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Connecting to Google...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: Colors.primary }]}
            onPress={signIn}
            activeOpacity={0.8}
          >
            <View style={styles.googleIconContainer}>
              <Icon name="alternate-email" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.signInButtonText}>
              Continue with Google
            </Text>
            <Icon name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            By continuing, you agree to our{' '}
            <Text style={styles.privacyLink}>Terms of Service</Text> and{' '}
            <Text style={styles.privacyLink}>Privacy Policy</Text>
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: 25,
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginRight: 15,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#5d5d5d',
  },
  featuresContainer: {
    flex: 1,
    marginTop: 10,
  },
  featuresList: {
    flexGrow: 0,
  },
  featureItem: {
    width: width,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconsContainer: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  primaryIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 7,
  },
  secondaryIconContainer: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  decorativeDot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#5d5d5d',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDDDDD',
    marginHorizontal: 6,
  },
  paginationDotActive: {
    width: 30,
  },
  signInSection: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  signInButton: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  googleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  privacyContainer: {
    alignItems: 'center',
  },
  privacyText: {
    fontSize: 12,
    color: '#8a8a8a',
    textAlign: 'center',
    lineHeight: 18,
  },
  privacyLink: {
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default IntroScreen