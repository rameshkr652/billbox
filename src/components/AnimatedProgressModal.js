// Enhanced AnimatedProgressModal.js with added game button
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  Animated, 
  Easing,
  Platform,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import GameOverlay from './GameOverlay';
const { width, height } = Dimensions.get('window');

// Safely handle progress bar based on platform
const ProgressBar = ({ progress, color, isAiProcessing }) => {
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
          },
          isAiProcessing && styles.aiProcessingBar
        ]} 
      />
    </View>
  );
};

// Extract unique restaurant names and food items from order data
const extractOrderData = (emails) => {
  // Use an object to maintain restaurant to food items mapping
  const restaurantToFoods = {};
  
  emails.forEach(email => {
    if (email?.restaurantName && email.orderItems && Array.isArray(email.orderItems)) {
      const restaurantName = email.restaurantName;
      
      // Initialize array for this restaurant if it doesn't exist yet
      if (!restaurantToFoods[restaurantName]) {
        restaurantToFoods[restaurantName] = [];
      }
      
      // Add all food items from this order to the appropriate restaurant
      email.orderItems.forEach(item => {
        // Check if the item is not already in the array to avoid duplicates
        if (!restaurantToFoods[restaurantName].includes(item)) {
          restaurantToFoods[restaurantName].push(item);
        }
      });
    }
  });
  
  // Format the result as needed - this returns an array of objects with restaurant name and its food items
  const result = Object.keys(restaurantToFoods).map(restaurant => ({
    restaurantName: restaurant,
    foodItems: restaurantToFoods[restaurant]
  }));
  
  return result;
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
  
  // State for restaurant and food data
  const [orderData, setOrderData] = useState([]);
  const [currentRestaurantData, setCurrentRestaurantData] = useState(null);
  const [currentFoodItem, setCurrentFoodItem] = useState('');
  const [foodEmojis, setFoodEmojis] = useState(['🍕', '🍔', '🍗', '🍚', '🍛']);
  const [shouldRotate, setShouldRotate] = useState(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProcessingCompletedCount, setAiProcessingCompletedCount] = useState(0);
  const [aiProcessingTotalCount, setAiProcessingTotalCount] = useState(0);
  
  // New state for full screen game modal
  const [showGameModal, setShowGameModal] = useState(false);
  const [isGameMinimized, setIsGameMinimized] = useState(false);
  
  // Process emails to extract real order data
  useEffect(() => {
    if (emails && Array.isArray(emails) && emails.length > 0) {
      const extractedData = extractOrderData(emails);
      setOrderData(extractedData);
      
      // Set initial values
      if (extractedData.length > 0) {
        setCurrentRestaurantData(extractedData[0]);
      }
    }
  }, [emails]);
  
  // Check for AI processing in progress text
  useEffect(() => {
    if (progressText && progressText.toLowerCase().includes('ai processing')) {
      setIsAiProcessing(true);
      
      // Try to extract counts from progress text for AI processing
      const countMatch = progressText.match(/(\d+)\/(\d+)/);
      if (countMatch && countMatch.length >= 3) {
        setAiProcessingCompletedCount(parseInt(countMatch[1], 10));
        setAiProcessingTotalCount(parseInt(countMatch[2], 10));
      }
    } else if (progressText && progressText.toLowerCase().includes('complex emails with ai')) {
      setIsAiProcessing(true);
      
      // Try to extract the count of emails being processed
      const countMatch = progressText.match(/Processing (\d+) complex/);
      if (countMatch && countMatch[1]) {
        setAiProcessingTotalCount(parseInt(countMatch[1], 10));
        setAiProcessingCompletedCount(0); // Just starting AI processing
      }
    } else {
      setIsAiProcessing(false);
    }
  }, [progressText]);
  
  // Effect to update current food item when restaurant changes
  useEffect(() => {
    if (currentRestaurantData && currentRestaurantData.foodItems && currentRestaurantData.foodItems.length > 0) {
      setCurrentFoodItem(currentRestaurantData.foodItems[0]);
    }
  }, [currentRestaurantData]);
  
  // Rotate through restaurants and food items
  useEffect(() => {
    if (!visible || orderData.length === 0) return;
    
    const interval = setInterval(() => {
      // Select a random restaurant
      if (orderData.length > 0) {
        const randomRestaurantIndex = Math.floor(Math.random() * orderData.length);
        const selectedRestaurant = orderData[randomRestaurantIndex];
        setCurrentRestaurantData(selectedRestaurant);
        
        // Select a random food item from the selected restaurant
        if (selectedRestaurant.foodItems && selectedRestaurant.foodItems.length > 0) {
          const randomFoodIndex = Math.floor(Math.random() * selectedRestaurant.foodItems.length);
          setCurrentFoodItem(selectedRestaurant.foodItems[randomFoodIndex]);
        }
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
  
  // Toggle the game modal
  const handleOpenGame = () => {
    setShowGameModal(true);
    setIsGameMinimized(false);
  };
  
  const handleMinimizeGame = () => {
    setIsGameMinimized(true);
  };
  
  const handleCloseGame = () => {
    setShowGameModal(false);
    setIsGameMinimized(false);
  };
  
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
                {isAiProcessing ? (
                  <Icon name="psychology" size={30} color="#FFFFFF" />
                ) : (
                  <Icon name="restaurant" size={30} color="#FFFFFF" />
                )}
              </View>
            </Animated.View>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.modalTitle}>
                {isAiProcessing ? 'AI Processing' : 'Fetching Orders'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {isAiProcessing ? 
                  'Processing complex emails with AI...' : 
                  `Loading your ${platformName} orders`
                }
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
            
            {isAiProcessing ? (
              <Text style={[styles.highlightMessage, { color: platformColor }]}>
                AI is helping analyze complex emails
                {aiProcessingTotalCount > 0 && (
                  <Text style={styles.aiCountText}>
                    {` (${aiProcessingCompletedCount}/${aiProcessingTotalCount})`}
                  </Text>
                )}
              </Text>
            ) : currentRestaurantData && (
              <Text style={[styles.highlightMessage, { color: platformColor }]}>
                Found your orders from <Text style={styles.boldText}>{currentRestaurantData.restaurantName}</Text>
              </Text>
            )}
            
            {!isAiProcessing && currentFoodItem && (
              <Text style={styles.foodItemText}>
                Processing your <Text style={styles.boldText}>{currentFoodItem}</Text> orders...
              </Text>
            )}
          </Animated.View>
          
          <View style={styles.progressContainer}>
            <ProgressBar 
              progress={progress} 
              color={platformColor}
              isAiProcessing={isAiProcessing}
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
            <View style={styles.timeRemainingContainer}>
              <Icon name="schedule" size={16} color="#888" style={styles.timeIcon} />
              <Text style={styles.timeRemaining}>
                {isAiProcessing ? 
                  `AI processing: Estimated time remaining: ${timeRemaining}` : 
                  `Estimated time remaining: ${timeRemaining}`
                }
              </Text>
            </View>
          )}
          
          <Text style={styles.noteText}>
            {isAiProcessing ? 
              "AI processing takes longer but ensures better order details extraction." :
              "This may take a while depending on the number of orders."
            }
          </Text>
          
          {/* New game button */}
          <TouchableOpacity 
            style={[styles.gameButton, { borderColor: platformColor, backgroundColor: platformColor + '15' }]}
            onPress={handleOpenGame}
          >
            <Icon name="videogame-asset" size={24} color={platformColor} />
            <Text style={[styles.gameButtonText, { color: platformColor }]}>
              Bored? Play a game while you wait!
            </Text>
          </TouchableOpacity>
          
          {/* Game minimized indicator button - shows when game is minimized */}
          {isGameMinimized && (
            <TouchableOpacity 
              style={[styles.minimizedIndicator, { backgroundColor: platformColor }]}
              onPress={() => setIsGameMinimized(false)}
            >
              <Icon name="videogame-asset" size={16} color="#FFFFFF" />
              <Text style={styles.minimizedText}>Resume Game</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        
        {showGameModal && (
            <GameOverlay 
                showGameModal={showGameModal} 
                isGameMinimized={isGameMinimized} 
                handleMinimizeGame={handleMinimizeGame} 
                handleCloseGame={handleCloseGame} 
            />
        )}

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
  aiProcessingBar: {
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
    backgroundSize: '1rem 1rem',
    animation: 'progress-bar-stripes 1s linear infinite',
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
  timeRemainingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeIcon: {
    marginRight: 5,
  },
  timeRemaining: {
    fontSize: 14,
    color: '#666666',
  },
  noteText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  aiCountText: {
    fontWeight: 'bold',
  },
  
  // Game button styles
  gameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  gameButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
  },
  
  // Minimized indicator styles
  minimizedIndicator: {
    position: 'absolute',
    bottom: -15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  minimizedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  
  // Game modal styles
  gameModalContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gameModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#222222',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  gameModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gameModalControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameModalButton: {
    padding: 8,
    marginLeft: 16,
  },
  gameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameComingSoonText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  }
});

export default AnimatedProgressModal;