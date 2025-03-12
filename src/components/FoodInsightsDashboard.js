// src/components/FoodInsightsDashboard.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const FoodInsightsDashboard = ({ emails = [], platformColor }) => {
  // State for time filter
  const [timeFilter, setTimeFilter] = useState('month'); // 'month', 'year', 'custom'
  
  // State for insights data
  const [insights, setInsights] = useState({
    totalSpending: 0,
    mostOrderedFoods: [],
    topRestaurants: [],
    healthRating: {
      overall: 'healthy',
      sugar: 'lower',
      protein: 'higher',
      fiber: 'higher'
    }
  });
  
  // Process emails/orders when they change or time filter changes
  useEffect(() => {
    if (emails.length > 0) {
      processOrders();
    }
  }, [emails, timeFilter]);
  
  // Process orders to generate insights
  const processOrders = () => {
    try {
      // Filter orders based on time filter
      const filteredOrders = filterOrdersByTime(emails);
      
      // Calculate total spending
      const totalSpending = calculateTotalSpending(filteredOrders);
      
      // Get most ordered foods
      const mostOrderedFoods = getMostOrderedFoods(filteredOrders);
      
      // Get top restaurants
      const topRestaurants = getTopRestaurants(filteredOrders);
      
      // Calculate health metrics
      const healthRating = calculateHealthRating(filteredOrders);
      
      // Update insights
      setInsights({
        totalSpending,
        mostOrderedFoods,
        topRestaurants,
        healthRating
      });
    } catch (error) {
      console.error('Error processing orders:', error);
    }
  };
  
  // Filter orders based on selected time period
  const filterOrdersByTime = (orders) => {
    const now = new Date();
    let startDate;
    
    switch (timeFilter) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        // For now, default to last 3 months if custom is selected
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return orders.filter(email => {
      // Try to get date from email
      let orderDate;
      try {
        // First try to get date from orderDetails
        if (email.orderDetails && email.orderDetails.orderDateTime) {
          orderDate = new Date(email.orderDetails.orderDateTime);
        } else {
          // Fall back to email date
          orderDate = new Date(email.date);
        }
        
        // Check if valid date
        if (isNaN(orderDate.getTime())) {
          return false;
        }
        
        // Include if date is after start date
        return orderDate >= startDate;
      } catch (error) {
        return false;
      }
    });
  };
  
  // Calculate total spending from orders
  const calculateTotalSpending = (orders) => {
    let total = 0;
    
    orders.forEach(email => {
      try {
        if (email.orderDetails && email.orderDetails.totalPrice) {
          // Extract numeric value from price
          const priceString = email.orderDetails.totalPrice.toString();
          const priceMatch = priceString.match(/(\d+([.,]\d+)?)/);
          
          if (priceMatch && priceMatch[1]) {
            // Convert to number, replacing comma with dot if needed
            const price = parseFloat(priceMatch[1].replace(',', '.'));
            if (!isNaN(price)) {
              total += price;
            }
          }
        }
      } catch (error) {
        console.error('Error calculating price:', error);
      }
    });
    
    return Math.round(total);
  };
  
  // Extract and count food items
  const getMostOrderedFoods = (orders) => {
    const foodCounts = {};
    
    // Process each order
    orders.forEach(email => {
      try {
        if (email.orderDetails && email.orderDetails.orderItems && email.orderDetails.orderItems.length > 0) {
          // Process each item in the order
          email.orderDetails.orderItems.forEach(item => {
            // Try to extract food name
            const itemString = item.toString();
            // Assume format like "1 X Food Name"
            const foodMatch = itemString.match(/\d+\s*[Xx×]\s*(.+)/);
            
            if (foodMatch && foodMatch[1]) {
              const foodName = foodMatch[1].trim();
              // Simplify to broader categories
              const category = categorizeFoodItem(foodName);
              
              // Count the food item
              if (category) {
                foodCounts[category] = (foodCounts[category] || 0) + 1;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error processing food items:', error);
      }
    });
    
    // Convert to array and sort
    const foodItems = Object.keys(foodCounts).map(name => ({
      name,
      count: foodCounts[name]
    }));
    
    foodItems.sort((a, b) => b.count - a.count);
    
    // Return top 5 items
    return foodItems.slice(0, 5);
  };
  
  // Helper to categorize food items
  const categorizeFoodItem = (foodName) => {
    // Define common categories and keywords
    const categories = {
      'Biryani': ['biryani', 'briyani', 'biriyani'],
      'Pizza': ['pizza', 'margherita', 'pepperoni'],
      'Burger': ['burger', 'hamburger', 'cheeseburger'],
      'Chinese': ['noodles', 'manchurian', 'fried rice', 'hakka', 'schezwan', 'chinese'],
      'South Indian': ['dosa', 'idli', 'vada', 'uttapam', 'sambhar'],
      'North Indian': ['paneer', 'naan', 'roti', 'dal', 'kadhai', 'butter chicken'],
      'Dessert': ['cake', 'ice cream', 'brownie', 'sweet', 'dessert']
    };
    
    // Convert food name to lowercase for comparison
    const lowerFoodName = foodName.toLowerCase();
    
    // Check each category
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerFoodName.includes(keyword))) {
        return category;
      }
    }
    
    // If no match, return 'Other'
    return 'Other';
  };
  
  // Get top restaurants
  const getTopRestaurants = (orders) => {
    const restaurantCounts = {};
    
    // Count orders by restaurant
    orders.forEach(email => {
      try {
        let restaurantName = null;
        
        // Try to get restaurant name from orderDetails
        if (email.orderDetails && email.orderDetails.restaurantName) {
          restaurantName = email.orderDetails.restaurantName;
        } else {
          // Try to extract from email sender
          if (email.from) {
            // Extract name part from "Name <email>" format
            const nameMatch = email.from.match(/^"?([^"<]+)"?\s*<?[^>]*>?$/);
            if (nameMatch && nameMatch[1]) {
              restaurantName = nameMatch[1].trim();
            }
          }
        }
        
        if (restaurantName) {
          restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1;
        }
      } catch (error) {
        console.error('Error processing restaurant:', error);
      }
    });
    
    // Convert to array and sort
    const restaurants = Object.keys(restaurantCounts).map(name => ({
      name,
      count: restaurantCounts[name]
    }));
    
    restaurants.sort((a, b) => b.count - a.count);
    
    // Return top 5 restaurants
    return restaurants.slice(0, 5);
  };
  
  // Calculate health metrics
  const calculateHealthRating = (orders) => {
    // This would normally analyze food items to determine nutritional content
    // For this demo, we'll use a simple heuristic based on food categories
    
    // Count food categories
    const categories = {};
    let totalItems = 0;
    
    orders.forEach(email => {
      try {
        if (email.orderDetails && email.orderDetails.orderItems) {
          email.orderDetails.orderItems.forEach(item => {
            const itemString = item.toString();
            const foodMatch = itemString.match(/\d+\s*[Xx×]\s*(.+)/);
            
            if (foodMatch && foodMatch[1]) {
              const foodName = foodMatch[1].trim();
              const category = categorizeFoodItem(foodName);
              
              if (category) {
                categories[category] = (categories[category] || 0) + 1;
                totalItems++;
              }
            }
          });
        }
      } catch (error) {
        console.error('Error analyzing health metrics:', error);
      }
    });
    
    // Define health scores for categories (simplified)
    const healthScores = {
      'Biryani': { sugar: 'medium', protein: 'high', fiber: 'medium' },
      'Pizza': { sugar: 'medium', protein: 'medium', fiber: 'low' },
      'Burger': { sugar: 'high', protein: 'medium', fiber: 'low' },
      'Chinese': { sugar: 'medium', protein: 'medium', fiber: 'medium' },
      'South Indian': { sugar: 'low', protein: 'medium', fiber: 'high' },
      'North Indian': { sugar: 'medium', protein: 'high', fiber: 'medium' },
      'Dessert': { sugar: 'high', protein: 'low', fiber: 'low' },
      'Other': { sugar: 'medium', protein: 'medium', fiber: 'medium' }
    };
    
    // Calculate weighted scores
    let sugarScore = 0;
    let proteinScore = 0;
    let fiberScore = 0;
    
    // Convert textual ratings to numbers for calculation
    const scoreMap = {
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    // Calculate weighted scores
    for (const [category, count] of Object.entries(categories)) {
      if (healthScores[category]) {
        const weight = count / totalItems;
        
        sugarScore += scoreMap[healthScores[category].sugar] * weight;
        proteinScore += scoreMap[healthScores[category].protein] * weight;
        fiberScore += scoreMap[healthScores[category].fiber] * weight;
      }
    }
    
    // Calculate averages
    const avgSugar = 2; // Baseline average
    const avgProtein = 2; // Baseline average
    const avgFiber = 2; // Baseline average
    
    // Determine ratings compared to average
    const sugarRating = sugarScore < avgSugar ? 'lower' : sugarScore > avgSugar ? 'higher' : 'average';
    const proteinRating = proteinScore > avgProtein ? 'higher' : proteinScore < avgProtein ? 'lower' : 'average';
    const fiberRating = fiberScore > avgFiber ? 'higher' : fiberScore < avgFiber ? 'lower' : 'average';
    
    // Overall health rating is positive if protein and fiber are higher and sugar is lower
    const isHealthy = (proteinRating === 'higher' || fiberRating === 'higher') && sugarRating !== 'higher';
    
    return {
      overall: isHealthy ? 'healthy' : 'needs improvement',
      sugar: sugarRating,
      protein: proteinRating,
      fiber: fiberRating
    };
  };
  
  // Render food item row
  const renderFoodItem = (item, index) => (
    <View key={index} style={styles.itemRow}>
      <View style={styles.itemIconContainer}>
        <Text style={styles.itemIcon}>🍲</Text>
      </View>
      <View style={styles.itemInfoContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>{item.count} orders</Text>
      </View>
    </View>
  );
  
  // Render restaurant row
  const renderRestaurantItem = (item, index) => (
    <View key={index} style={styles.itemRow}>
      <View style={styles.itemIconContainer}>
        <Text style={styles.itemIcon}>🏪</Text>
      </View>
      <View style={styles.itemInfoContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>{item.count} orders</Text>
      </View>
    </View>
  );
  
  // Render health metric row
  const renderHealthMetric = (title, value) => (
    <View style={styles.healthMetricRow}>
      <View style={styles.healthMetricIcon}>
        <Icon name={
          title === 'Rating' ? 'star' :
          title === 'Sugar' ? 'cake' :
          title === 'Protein' ? 'fitness-center' :
          title === 'Fiber' ? 'eco' : 'info'
        } size={24} color="#555" />
      </View>
      <View style={styles.healthMetricInfo}>
        <Text style={styles.healthMetricTitle}>{title}</Text>
        <Text style={styles.healthMetricValue}>
          {title === 'Rating' 
            ? `You're eating ${insights.healthRating.overall}` 
            : `${value} than average`}
        </Text>
      </View>
    </View>
  );
  
  return (
    <ScrollView style={styles.container}>
      {/* Monthly Spending Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {timeFilter === 'month' ? 'This Month\'s Spending' :
           timeFilter === 'year' ? 'This Year\'s Spending' : 'Custom Period Spending'}
        </Text>
        <Text style={styles.spendingAmount}>₹{insights.totalSpending}</Text>
        
        {/* Time Filter Buttons */}
        <View style={styles.timeFilterContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              timeFilter === 'month' && [styles.activeFilterButton, {backgroundColor: platformColor}]
            ]}
            onPress={() => setTimeFilter('month')}
          >
            <Text style={[
              styles.filterButtonText,
              timeFilter === 'month' && styles.activeFilterButtonText
            ]}>This Month</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              timeFilter === 'year' && [styles.activeFilterButton, {backgroundColor: platformColor}]
            ]}
            onPress={() => setTimeFilter('year')}
          >
            <Text style={[
              styles.filterButtonText,
              timeFilter === 'year' && styles.activeFilterButtonText
            ]}>This Year</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              timeFilter === 'custom' && [styles.activeFilterButton, {backgroundColor: platformColor}]
            ]}
            onPress={() => setTimeFilter('custom')}
          >
            <Text style={[
              styles.filterButtonText,
              timeFilter === 'custom' && styles.activeFilterButtonText
            ]}>Custom</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.viewTransactionsButton}>
          <Text style={styles.viewTransactionsText}>View Transactions</Text>
        </TouchableOpacity>
      </View>
      
      {/* Most Ordered Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Most Ordered</Text>
        
        {insights.mostOrderedFoods.length > 0 ? (
          <View style={styles.itemsContainer}>
            {insights.mostOrderedFoods.slice(0, 2).map(renderFoodItem)}
          </View>
        ) : (
          <Text style={styles.emptyStateText}>No orders found in this time period</Text>
        )}
        
        {insights.mostOrderedFoods.length > 2 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>Show More</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Top Restaurants Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Restaurants</Text>
        
        {insights.topRestaurants.length > 0 ? (
          <View style={styles.itemsContainer}>
            {insights.topRestaurants.slice(0, 2).map(renderRestaurantItem)}
          </View>
        ) : (
          <Text style={styles.emptyStateText}>No restaurants found in this time period</Text>
        )}
        
        {insights.topRestaurants.length > 2 && (
          <TouchableOpacity style={styles.showMoreButton}>
            <Text style={styles.showMoreText}>Show More</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Health Rating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Health rating</Text>
        
        <View style={styles.healthMetricsContainer}>
          {renderHealthMetric('Rating', null)}
          {renderHealthMetric('Sugar', insights.healthRating.sugar)}
          {renderHealthMetric('Protein', insights.healthRating.protein)}
          {renderHealthMetric('Fiber', insights.healthRating.fiber)}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  spendingAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#2196F3',
  },
  filterButtonText: {
    color: '#555',
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewTransactionsButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewTransactionsText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  itemsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 24,
  },
  itemInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 14,
    color: '#666',
  },
  showMoreButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  healthMetricsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  healthMetricRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  healthMetricIcon: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  healthMetricInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  healthMetricTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  healthMetricValue: {
    fontSize: 14,
    color: '#666',
  },
});

export default FoodInsightsDashboard;