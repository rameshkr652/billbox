// src/components/AnimatedProgressModal.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Animated, 
  Easing,
  Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

// Safely handle progress bar based on platform
const ProgressBar = ({ progress, color }) => {
  // Use the provided progress to animate the width of a custom View
  const width = progress * 100;
  
  return (
    <View style={[styles.progressBarContainer]}>
      <Animated.View 
        style={[
          styles.progressBarFill, 
          { 
            width: `${width}%`, 
            backgroundColor: color,
          }
        ]} 
      />
    </View>
  );
};

// Extract unique restaurant names and food items from order data
const extractOrderData = (emails) => {
  const restaurants = new Set();
  const foodItems = new Set();
  
  emails.forEach(email => {
    if (email.orderDetails?.restaurantName) {
      restaurants.add(email.orderDetails.restaurantName);
    }
    
    if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
      email.orderDetails.orderItems.forEach(item => {
        // Remove quantity prefix (like "2 X ")
        const cleanItem = item.replace(/^\d+\s*[Xx×]\s+/i, '').trim();
        if (cleanItem.length > 2) {
          foodItems.add(cleanItem);
        }
      });
    }
  });
  
  return {
    restaurants: Array.from(restaurants),
    foodItems: Array.from(foodItems)
  };
};

/**
 * Enhanced Progress Modal with animations and real-time data
 */
const AnimatedProgressModal = ({ 
  visible, 
  platformName,
  platformColor, 
  progressText, 
  progress, 
  timeRemaining = null,
  emails = []
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  // Extract real-time data from emails
  const [orderData, setOrderData] = useState({ restaurants: [], foodItems: [] });
  const [currentRestaurant, setCurrentRestaurant] = useState('');
  const [currentFoodItem, setCurrentFoodItem] = useState('');
  const [foodEmojis, setFoodEmojis] = useState(['🍕', '🍔', '🍗', '🍚', '🍛']);
  const [shouldRotate, setShouldRotate] = useState(true);
  
  // Process emails to extract real order data
  useEffect(() => {
    if (emails && emails.length > 0) {
      const extractedData = extractOrderData(emails);
      setOrderData(extractedData);
      
      // Set initial values
      if (extractedData.restaurants.length > 0) {
        setCurrentRestaurant(extractedData.restaurants[0]);
      }
      if (extractedData.foodItems.length > 0) {
        setCurrentFoodItem(extractedData.foodItems[0]);
      }
    }
  }, [emails]);
  
  // Rotate through restaurants and food items
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      if (orderData.restaurants.length > 0) {
        const randomIndex = Math.floor(Math.random() * orderData.restaurants.length);
        setCurrentRestaurant(orderData.restaurants[randomIndex]);
      }
      
      if (orderData.foodItems.length > 0) {
        const randomIndex = Math.floor(Math.random() * orderData.foodItems.length);
        setCurrentFoodItem(orderData.foodItems[randomIndex]);
      }
      
      // Rotate food emojis
      setFoodEmojis(prev => {
        const newEmojis = [...prev];
        newEmojis.push(newEmojis.shift());
        return newEmojis;
      });
      
      // Bounce animation
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      // Toggle rotation for variety
      setShouldRotate(prev => !prev);
      
    }, 3000);
    
    return () => clearInterval(interval);
  }, [visible, orderData]);
  
  // Set up initial animations when visible changes
  useEffect(() => {
    if (visible) {
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ]).start();
      
      // Continuous spinning animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);
  
  // Interpolate for animations
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  const bounce = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0]
  });
  
  // Skip rendering if not visible
  if (!visible) return null;
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <Animated.View 
              style={[
                styles.iconContainer,
                shouldRotate ? { transform: [{ rotate: spin }] } : {}
              ]}
            >
              <View style={[styles.platformIcon, { backgroundColor: platformColor }]}>
                <Icon name="restaurant" size={30} color="#FFFFFF" />
              </View>
            </Animated.View>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.modalTitle}>Fetching Orders</Text>
              <Text style={styles.modalSubtitle}>
                Loading your {platformName} orders
              </Text>
            </View>
          </View>
          
          <Animated.View 
            style={[
              styles.messageContainer,
              { transform: [{ translateY: bounce }] }
            ]}
          >
            <Text style={styles.progressMessage}>{progressText}</Text>
            
            {currentRestaurant && (
              <Text style={[styles.highlightMessage, { color: platformColor }]}>
                Found your orders from <Text style={styles.boldText}>{currentRestaurant}</Text>
              </Text>
            )}
            
            {currentFoodItem && (
              <Text style={styles.foodItemText}>
                Processing your <Text style={styles.boldText}>{currentFoodItem}</Text> orders...
              </Text>
            )}
          </Animated.View>
          
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={progress} 
              color={platformColor} 
            />
            
            <View style={styles.foodEmojisContainer}>
              {foodEmojis.map((emoji, index) => (
                <Animated.Text 
                  key={`emoji-${index}`}
                  style={[
                    styles.foodEmoji,
                    { 
                      opacity: progress > (index / foodEmojis.length) ? 1 : 0.3,
                      transform: [{ scale: progress > (index / foodEmojis.length) ? 1.1 : 0.9 }]
                    }
                  ]}
                >
                  {emoji}
                </Animated.Text>
              ))}
            </View>
          </View>
          
          {timeRemaining !== null && (
            <Text style={styles.timeRemaining}>
              Estimated time remaining: {timeRemaining}
            </Text>
          )}
          
          <Text style={styles.noteText}>
            This may take a while depending on the number of orders.
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  iconContainer: {
    marginRight: 16,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  messageContainer: {
    width: '100%',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E9ECEF',
  },
  progressMessage: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 8,
    textAlign: 'center',
  },
  highlightMessage: {
    fontSize: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  foodItemText: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  boldText: {
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 12,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E9ECEF',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  foodEmojisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  foodEmoji: {
    fontSize: 20,
  },
  timeRemaining: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  }
});

export default AnimatedProgressModal;