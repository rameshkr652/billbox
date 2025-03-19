// src/components/TopFavoritesSection.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/colors';

const TopFavoritesSection = ({ emails, platformColor }) => {
  const navigation = useNavigation();
  const [topRestaurants, setTopRestaurants] = useState([]);
  const [topFoods, setTopFoods] = useState([]);
  
  useEffect(() => {
    if (emails && emails.length > 0) {
      analyzeData();
    }
  }, [emails]);
  
  const analyzeData = () => {
    // Process restaurant data
    const restaurantMap = {};
    const foodItemsMap = {};
    
    // Filter valid emails
    const validEmails = emails.filter(email => 
      email.orderDetails?.restaurantName && 
      email.orderDetails?.totalPrice && 
      email.orderDetails?.totalPrice !== 'N/A'
    );
    
    // Count restaurant orders
    validEmails.forEach(email => {
      const restaurant = email.orderDetails.restaurantName;
      if (restaurant) {
        // Add to restaurant count
        if (!restaurantMap[restaurant]) {
          restaurantMap[restaurant] = {
            name: restaurant,
            count: 1,
            totalSpent: parseFloat(email.orderDetails.totalPrice.replace(/[^\d.-]/g, '') || 0)
          };
        } else {
          restaurantMap[restaurant].count += 1;
          restaurantMap[restaurant].totalSpent += parseFloat(email.orderDetails.totalPrice.replace(/[^\d.-]/g, '') || 0);
        }
        
        // Process food items
        if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
          email.orderDetails.orderItems.forEach(item => {
            // Extract food name from format like "1 X Food Name"
            const foodName = item.trim()
            if (!foodItemsMap[foodName]) {
              foodItemsMap[foodName] = {
                name: foodName,
                count: 1
              };
            } else {
              foodItemsMap[foodName].count += 1;
            }
          });
        }
      }
    });
    
    // Convert to arrays and sort
    const restaurantsArray = Object.values(restaurantMap);
    const foodItemsArray = Object.values(foodItemsMap);
    
    // Sort by count (descending)
    restaurantsArray.sort((a, b) => b.count - a.count);
    foodItemsArray.sort((a, b) => b.count - a.count);
    
    // Get top 5
    setTopRestaurants(restaurantsArray.slice(0, 5));
    setTopFoods(foodItemsArray.slice(0, 5));
  };
  
  const navigateToAllRestaurants = () => {
    navigation.navigate('RestaurantsScreen', {
      restaurants: Object.values(topRestaurants),
      allEmails: emails,
      platformColor
    });
  };
  
  const navigateToAllFoods = () => {
    navigation.navigate('FoodsScreen', {
      foods: Object.values(topFoods),
      allEmails: emails,
      platformColor
    });
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  // Render restaurant item
  const renderRestaurantItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[styles.itemCard, { borderLeftColor: platformColor }]}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurantName: item.name, emails, platformColor })}
    >
      <View style={styles.rankCircle}>
        <Text style={[styles.rankText, { color: platformColor }]}>{index + 1}</Text>
      </View>
      
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemDetails}>
          <View style={styles.itemStat}>
            <Icon name="receipt" size={16} color="#666" />
            <Text style={styles.itemStatText}>{item.count} orders</Text>
          </View>
          <View style={styles.itemStat}>
            <Text style={styles.itemStatText}>{formatCurrency(item.totalSpent)}</Text>
          </View>
        </View>
      </View>
      
      <Icon name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );
  
  // Render food item
  const renderFoodItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[styles.itemCard, { borderLeftColor: platformColor }]}
      onPress={() => navigation.navigate('FoodDetails', { foodName: item.name, emails, platformColor })}
    >
      <View style={styles.rankCircle}>
        <Text style={[styles.rankText, { color: platformColor }]}>{index + 1}</Text>
      </View>
      
      <View style={styles.itemContent}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.itemDetails}>
          <View style={styles.itemStat}>
            <Icon name="restaurant" size={16} color="#666" />
            <Text style={styles.itemStatText}>Ordered {item.count} times</Text>
          </View>
        </View>
      </View>
      
      <Icon name="chevron-right" size={20} color="#ccc" />
    </TouchableOpacity>
  );
  
  // Don't render if no data
  if (topRestaurants.length === 0 && topFoods.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {/* Top Restaurants Section */}
      {topRestaurants.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="restaurant" size={20} color={platformColor} />
              <Text style={styles.sectionTitle}>Top Restaurants</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllLink}
              onPress={navigateToAllRestaurants}
            >
              <Text style={[styles.seeAllText, { color: platformColor }]}>See All</Text>
              <Icon name="arrow-forward" size={16} color={platformColor} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={topRestaurants}
            renderItem={renderRestaurantItem}
            keyExtractor={(item) => `restaurant-${item.name}`}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>
      )}
      
      {/* Top Food Items Section */}
      {topFoods.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Icon name="fastfood" size={20} color={platformColor} />
              <Text style={styles.sectionTitle}>Top Ordered Foods</Text>
            </View>
            <TouchableOpacity 
              style={styles.seeAllLink}
              onPress={navigateToAllFoods}
            >
              <Text style={[styles.seeAllText, { color: platformColor }]}>See All</Text>
              <Icon name="arrow-forward" size={16} color={platformColor} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={topFoods}
            renderItem={renderFoodItem}
            keyExtractor={(item) => `food-${item.name}`}
            horizontal={false}
            scrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      marginHorizontal: 15,
      marginTop: 10,
      marginBottom: 20,
    },
    section: {
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: 15,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
      paddingBottom: 10,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      marginLeft: 8,
    },
    seeAllLink: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    seeAllText: {
      fontSize: 14,
      marginRight: 4,
    },
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    rankCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#f5f5f5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rankText: {
      fontSize: 14,
      fontWeight: 'bold',
    },
    itemContent: {
      flex: 1,
    },
    itemName: {
      fontSize: 15,
      fontWeight: 'bold',
      color: '#333',
      marginBottom: 4,
    },
    itemDetails: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    itemStat: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    itemStatText: {
      fontSize: 13,
      color: '#666',
      marginLeft: 4,
    },
  });

export default TopFavoritesSection;