import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const EmailItem = ({ email, platformColor, platform }) => {
  const navigation = useNavigation();
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  
  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Unknown date';
    }
  };
  
  // Extract sender name from email
  const getSenderName = (fromString) => {
    if (!fromString) return 'Unknown';
    
    try {
      // Try to match name from "Name <email>" format
      const nameMatch = fromString.match(/^"?([^"<]+)"?\s*(?:<.*>)?$/);
      if (nameMatch && nameMatch[1]) {
        return nameMatch[1].trim();
      }
      
      // Fallback to removing the email part
      return fromString.replace(/<.*>/, '').trim();
    } catch (error) {
      return fromString;
    }
  };
  
  // Toggle expanded state with animation
  const toggleExpand = () => {
    const newValue = !expanded;
    setExpanded(newValue);
    
    Animated.timing(animatedHeight, {
      toValue: newValue ? 1 : 0,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();
  };
  
  // Get icon based on subject content (could be improved with more pattern matching)
  const getOrderIcon = () => {
    // Use extracted status if available
    if (email.orderDetails && email.orderDetails.orderStatus) {
      const status = email.orderDetails.orderStatus.toLowerCase();
      
      if (status.includes('delivered')) {
        return 'check-circle';
      } else if (status.includes('out for delivery')) {
        return 'local-shipping';
      } else if (status.includes('confirmed') || status.includes('preparing')) {
        return 'receipt';
      } else if (status.includes('cancel')) {
        return 'cancel';
      } else if (status.includes('picked up') || status.includes('ready')) {
        return 'takeout-dining';
      }
    }
    
    // Fallback to using the subject
    const subject = email.subject.toLowerCase();
    
    if (subject.includes('shipped') || subject.includes('shipping') || subject.includes('delivery')) {
      return 'local-shipping';
    } else if (subject.includes('delivered') || subject.includes('arrived')) {
      return 'check-circle';
    } else if (subject.includes('confirmed') || subject.includes('order placed')) {
      return 'receipt';
    } else if (subject.includes('canceled') || subject.includes('cancelled')) {
      return 'cancel';
    } else {
      return 'restaurant';
    }
  };
  
  // Get order status from extracted data or subject
  const getOrderStatus = () => {
    // Use extracted status if available
    if (email.orderDetails && email.orderDetails.orderStatus) {
      return email.orderDetails.orderStatus;
    }
    
    // Fallback to using the subject
    const subject = email.subject.toLowerCase();
    
    if (subject.includes('shipped') || subject.includes('shipping')) {
      return 'Shipped';
    } else if (subject.includes('delivered') || subject.includes('arrived')) {
      return 'Delivered';
    } else if (subject.includes('confirmed') || subject.includes('order placed')) {
      return 'Confirmed';
    } else if (subject.includes('canceled') || subject.includes('cancelled')) {
      return 'Cancelled';
    } else {
      return 'Order';
    }
  };
  
  const animatedStyle = {
    maxHeight: animatedHeight.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 100],
    }),
    opacity: animatedHeight,
  };
  
  // Get restaurant name from extracted data
  const getRestaurantName = () => {
    if (email.orderDetails && email.orderDetails.restaurantName) {
      return email.orderDetails.restaurantName;
    }
    
    // Fallback to sender name
    return getSenderName(email.from);
  };
  
  // Get order price from extracted data
  const getOrderPrice = () => {
    if (email.orderDetails && email.orderDetails.totalPrice) {
      return email.orderDetails.totalPrice;
    }
    return '';
  };
  
  // Get order ID from extracted data
  const getOrderId = () => {
    if (email.orderDetails && email.orderDetails.orderId) {
      return email.orderDetails.orderId;
    }
    return '';
  };
  
  // Get order items
  const getOrderItems = () => {
    if (email.orderDetails && email.orderDetails.orderItems && email.orderDetails.orderItems.length > 0) {
      return email.orderDetails.orderItems;
    }
    return [];
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.item}
        onPress={toggleExpand} 
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${platformColor}20` }]}>
            <Icon 
              name={getOrderIcon()} 
              size={22} 
              color={platformColor} 
            />
          </View>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.orderStatus}>
              {getOrderStatus()}
            </Text>
            <Text style={styles.date}>
              {email.date}
            </Text>
          </View>
          
          <Text 
            style={styles.restaurantName}
            numberOfLines={1}
          >
            {getRestaurantName()}
          </Text>
          
          {getOrderId() ? (
            <Text style={styles.orderId}>Order #{getOrderId()}</Text>
          ) : (
            <Text 
              style={styles.subject}
              numberOfLines={1}
            >
              {email.subject}
            </Text>
          )}
          
          <View style={styles.senderRow}>
            {getOrderPrice() ? (
              <Text style={styles.price}>{getOrderPrice()}</Text>
            ) : (
              <Text style={styles.sender}>
                From: {getSenderName(email.from)}
              </Text>
            )}
            <Icon 
              name={expanded ? 'expand-less' : 'expand-more'} 
              size={20} 
              color="#9CA3AF" 
            />
          </View>
        </View>
      </TouchableOpacity>
      
      <Animated.View style={[styles.expandedContent, animatedStyle]}>
        {getOrderItems().length > 0 ? (
          <>
            <Text style={styles.itemsTitle}>Order Items:</Text>
            {getOrderItems().map((item, index) => (
              <Text key={index} style={styles.orderItem}>• {item}</Text>
            ))}
          </>
        ) : (
          <Text style={styles.snippet}>
            {email.snippet}
          </Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  item: {
    flexDirection: 'row',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
      restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subject: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 20,
  },
  orderId: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sender: {
    fontSize: 13,
    color: '#6B7280',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857', // Green
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  snippet: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  orderItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 4,
  }
});

export default EmailItem;