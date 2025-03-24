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
  StatusBar,
  Animated,
  Easing,
  Image,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as AuthService from '../services/AuthService';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

const IntroScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef(null);
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
      })
    ]).start();
  };

  const signIn = async () => {
    try {
      animateButton();
      setLoading(true);
      await AuthService.signIn();
      navigation.replace('PlatformSelection');
    } catch (error) {
      console.error('Error signing in:', error);
      setLoading(false);
    }
  };

  const goToNextStep = () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    // Scroll to the next step
    scrollViewRef.current?.scrollTo({
      x: nextStep * width,
      animated: true
    });
  };

  const goToPreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      
      // Scroll to the previous step
      scrollViewRef.current?.scrollTo({
        x: prevStep * width,
        animated: true
      });
    }
  };

  // Handle scroll end to update the current step
  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const step = Math.round(offsetX / width);
    if (step !== currentStep) {
      setCurrentStep(step);
    }
  };

  // Render step indicators
  const renderStepIndicators = () => {
    return (
      <View style={styles.stepsIndicator}>
        {Array(4).fill(0).map((_, index) => (
          <View
            key={`step-${index}`}
            style={[
              styles.stepDot,
              currentStep === index && { backgroundColor: Colors.primary, width: 20 }
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* App Logo */}
      <Animated.View 
        style={[
          styles.logoContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateY }]
          }
        ]}
      >
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>BB</Text>
        </View>
        <Text style={styles.appTitle}>BillBox</Text>
        <Text style={styles.appSubtitle}>Track all your food orders in one place</Text>
      </Animated.View>
      
      {/* Step by Step Guide */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.stepsContainer}
      >
        {/* Step 1: Welcome Screen */}
        <View style={styles.stepScreen}>
          <View style={styles.stepIconContainer}>
            <View style={[styles.stepIcon, { backgroundColor: Colors.swiggy }]}>
              <Icon name="fastfood" size={40} color="#FFFFFF" />
            </View>
            <View style={[styles.stepIcon, { backgroundColor: Colors.zomato }]}>
              <Icon name="restaurant" size={40} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.stepTitle}>Track Your Food Orders</Text>
          <Text style={styles.stepDescription}>
            BillBox finds and organizes all your Swiggy and Zomato orders from Gmail in one convenient dashboard
          </Text>
          <View style={styles.orderLogos}>
            <View style={styles.platformLogo}>
              <View style={[styles.logoCircle, { backgroundColor: Colors.swiggy }]}>
                <Icon name="fastfood" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.platformName}>Swiggy</Text>
            </View>
            <View style={styles.platformLogo}>
              <View style={[styles.logoCircle, { backgroundColor: Colors.zomato }]}>
                <Icon name="restaurant" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.platformName}>Zomato</Text>
            </View>
          </View>
        </View>
        
        {/* Step 2: Gmail Permission Required */}
        <View style={styles.stepScreen}>
          <View style={styles.stepIconContainer}>
            <View style={[styles.importantIcon]}>
              <Icon name="mark-email-read" size={60} color={Colors.primary} />
            </View>
          </View>
          <Text style={styles.stepTitle}>Gmail Access Required</Text>
          <Text style={styles.stepDescription}>
            BillBox needs to access your Gmail to scan for food order emails.
          </Text>
          <View style={styles.importantNote}>
            <Icon name="priority-high" size={20} color={Colors.accent} style={styles.noteIcon} />
            <Text style={styles.noteText}>
              In the next steps, make sure you check the "View your email messages and settings" permission when prompted by Google.
            </Text>
          </View>
        </View>
        
        {/* Step 3: Permission Guide */}
        <View style={styles.stepScreen}>
          <View style={styles.permitStepContainer}>
            <View style={[styles.permitStep, styles.activePermitStep]}>
              <View style={styles.permitStepNumber}>
                <Text style={styles.permitNumber}>1</Text>
              </View>
              <View style={styles.permitStepContent}>
                <Text style={styles.permitStepTitle}>Select Your Google Account</Text>
              </View>
            </View>
            
            <View style={[styles.permitStep, styles.importantPermitStep]}>
              <View style={[styles.permitStepNumber, styles.importantStepNumber]}>
                <Text style={styles.permitNumber}>2</Text>
              </View>
              <View style={styles.permitStepContent}>
                <Text style={styles.permitStepTitle}>Check The Email Permission</Text>
                <View style={styles.permissionCheckbox}>
                  <Icon name="check-box" size={20} color={Colors.primary} />
                  <Text style={styles.permissionLabel}>View your email messages and settings</Text>
                </View>
                <Text style={styles.permissionHint}>This must be checked for BillBox to work</Text>
              </View>
            </View>
            
            <View style={styles.permitStep}>
              <View style={styles.permitStepNumber}>
                <Text style={styles.permitNumber}>3</Text>
              </View>
              <View style={styles.permitStepContent}>
                <Text style={styles.permitStepTitle}>Tap "Continue" to proceed</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Step 4: Login Screen */}
        <View style={styles.stepScreen}>
          <View style={styles.finalStepContainer}>
            <Icon name="check-circle" size={80} color={Colors.primary} />
            <Text style={styles.stepTitle}>Ready To Go!</Text>
            <Text style={styles.stepDescription}>
              Sign in with your Google account to start organizing your food orders
            </Text>
            <View style={styles.rememberBox}>
              <Icon name="info" size={20} color={Colors.primary} />
              <Text style={styles.rememberText}>
                Remember to check "View your email messages and settings" on the Google permissions screen
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Step Indicators */}
      {renderStepIndicators()}
      
      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={goToPreviousStep}
          >
            <Icon name="arrow-back" size={24} color="#555" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        
        {currentStep < 3 ? (
          <TouchableOpacity 
            style={[styles.nextButton, { backgroundColor: Colors.primary }]}
            onPress={goToNextStep}
          >
            <Text style={styles.nextText}>Next</Text>
            <Icon name="arrow-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <Animated.View 
            style={[
              styles.signInSection,
              { 
                transform: [{ scale: buttonScale }] 
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
          </Animated.View>
        )}
      </View>
      
      {/* Privacy Policy Text */}
      <View style={styles.privacyContainer}>
        <Text style={styles.privacyText}>
          By continuing, you agree to our{' '}
          <Text style={styles.privacyLink}>Terms of Service</Text> and{' '}
          <Text style={styles.privacyLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 10,
  },
  logoBox: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#5d5d5d',
    marginBottom: 20,
  },
  stepsContainer: {
    flex: 1,
  },
  stepScreen: {
    width: width,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIconContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  importantIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#5d5d5d',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  orderLogos: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  platformLogo: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  importantNote: {
    flexDirection: 'row',
    backgroundColor: '#fff4f4',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ffe0e0',
  },
  noteIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  noteText: {
    fontSize: 14,
    color: '#d32f2f',
    flex: 1,
    lineHeight: 22,
  },
  permitStepContainer: {
    width: '100%',
    marginTop: 20,
  },
  permitStep: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  activePermitStep: {
    backgroundColor: '#f0f7ff',
    borderLeftColor: Colors.primary,
  },
  importantPermitStep: {
    backgroundColor: '#fff8e1',
    borderLeftColor: Colors.accent,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  permitStepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  importantStepNumber: {
    backgroundColor: Colors.accent,
  },
  permitNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  permitStepContent: {
    flex: 1,
  },
  permitStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  permissionCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  permissionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginLeft: 10,
  },
  permissionHint: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#d32f2f',
  },
  finalStepContainer: {
    alignItems: 'center',
    padding: 20,
  },
  rememberBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'flex-start',
  },
  rememberText: {
    fontSize: 14,
    color: '#1565c0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 100,
  },
  backText: {
    fontSize: 16,
    color: '#555',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 100,
  },
  nextText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  signInSection: {
    flex: 1,
    paddingLeft: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginBottom: 10,
  },
  loadingText: {
    marginTop: 10,
    color: Colors.primary,
    fontSize: 14,
  },
  signInButton: {
    width: '100%',
    height: 54,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  googleIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  privacyContainer: {
    alignItems: 'center',
    paddingBottom: 20,
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

export default IntroScreen;