// src/screens/OrderDetailsScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const OrderDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { order } = route.params || {};
  
  // Format currency
  const formatCurrency = (priceStr) => {
    if (!priceStr) return 'N/A';
    
    // If it's already a formatted string with currency symbol, return as is
    if (typeof priceStr === 'string' && priceStr.includes('₹')) {
      return priceStr;
    }
    
    // Otherwise format as currency
    const price = typeof priceStr === 'number' 
      ? priceStr 
      : parseFloat(priceStr.replace(/[^\d.-]/g, ''));
    
    if (isNaN(price)) return priceStr;
    return `₹${price.toFixed(2)}`;
  };

  // Get formatted date components
  const getFormattedDateDetails = () => {
    if (!order?.date) return { date: 'Unknown date', time: '', day: '' };
    
    const date = new Date(order.date);
    
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const formattedDay = date.toLocaleDateString('en-US', {
      weekday: 'long'
    });
    
    return {
      date: formattedDate,
      time: formattedTime,
      day: formattedDay
    };
  };
  
  const dateDetails = getFormattedDateDetails();
  
  // Determine order status icon and color
  const getOrderStatusInfo = () => {
    let statusText = 'Ordered';
    let statusIcon = 'receipt';
    let statusColor = Colors.primary;
    
    // Extract status from email if available
    if (order?.email?.orderDetails?.orderStatus) {
      statusText = order.email.orderDetails.orderStatus;
    }
    
    // Set icon and color based on status text
    if (statusText.toLowerCase().includes('delivered')) {
      statusIcon = 'check-circle';
      statusColor = '#4CAF50'; // Green
    } else if (statusText.toLowerCase().includes('cancelled')) {
      statusIcon = 'cancel';
      statusColor = Colors.accent; // Red
    } else if (statusText.toLowerCase().includes('shipping') || 
              statusText.toLowerCase().includes('out for delivery')) {
      statusIcon = 'local-shipping';
      statusColor = '#FF9800'; // Orange
    } else if (statusText.toLowerCase().includes('confirmed') || 
              statusText.toLowerCase().includes('processing')) {
      statusIcon = 'hourglass-bottom';
      statusColor = '#2196F3'; // Blue
    }
    
    return { statusText, statusIcon, statusColor };
  };
  
  const orderStatus = getOrderStatusInfo();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.headerRight} />
        </View>
        
        <ScrollView style={styles.content}>
          {/* Order Status */}
          <View style={[styles.statusContainer, { backgroundColor: orderStatus.statusColor + '15' }]}>
            <View style={[styles.statusIconContainer, { backgroundColor: orderStatus.statusColor }]}>
              <Icon name={orderStatus.statusIcon} size={24} color="#fff" />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>{orderStatus.statusText}</Text>
              <Text style={styles.statusDate}>
                {dateDetails.date} • {dateDetails.time}
              </Text>
            </View>
          </View>
          
          {/* Order ID and restaurant */}
          <View style={styles.section}>
            <View style={styles.orderIdContainer}>
              <Text style={styles.orderIdLabel}>Order ID</Text>
              <Text style={styles.orderId}>{order?.orderId || 'Unknown'}</Text>
            </View>
            
            <View style={styles.restaurantContainer}>
              <Icon name="restaurant" size={18} color="#555" style={styles.restaurantIcon} />
              <Text style={styles.restaurantName}>{order?.restaurant || 'Unknown Restaurant'}</Text>
            </View>
          </View>
          
          {/* Order Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            
            {order?.orderItems && order.orderItems.length > 0 ? (
              <View style={styles.orderItemsContainer}>
                {order.orderItems.map((item, index) => {
                  // Try to extract quantity if available
                  const match = typeof item === 'string' && item.match(/(\d+)\s*[Xx×]\s+(.*)/);
                  let quantity = '1';
                  let itemName = item;
                  
                  if (match && match[1] && match[2]) {
                    quantity = match[1];
                    itemName = match[2];
                  }
                  
                  return (
                    <View key={`item-${index}`} style={styles.orderItem}>
                      <View style={styles.orderItemDetails}>
                        <Text style={styles.orderItemQuantity}>{quantity}x</Text>
                        <Text style={styles.orderItemName}>{itemName}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noItemsText}>No items in this order</Text>
            )}
          </View>
          
          {/* Price Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Price Details</Text>
            
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Total</Text>
                <Text style={styles.priceValue}>{formatCurrency(order?.totalPrice)}</Text>
              </View>
            </View>
          </View>
          
          {/* Additional Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            <View style={styles.additionalInfo}>
              <View style={styles.infoRow}>
                <Icon name="event" size={16} color="#555" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Order Date:</Text>
                <Text style={styles.infoValue}>{dateDetails.date}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Icon name="access-time" size={16} color="#555" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Order Time:</Text>
                <Text style={styles.infoValue}>{dateDetails.time}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Icon name="today" size={16} color="#555" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Day:</Text>
                <Text style={styles.infoValue}>{dateDetails.day}</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  statusIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statusDate: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderIdContainer: {
    marginBottom: 12,
  },
  orderIdLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  restaurantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
  },
  restaurantIcon: {
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderItemsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItemQuantity: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginRight: 8,
    minWidth: 30,
  },
  orderItemName: {
    fontSize: 14,
    color: '#333',
  },
  noItemsText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    textAlign: 'center',
  },
  priceSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  additionalInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
    width: 85,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});

export default OrderDetailsScreen;