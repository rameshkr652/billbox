// src/components/TopFavoritesSection.js - Enhanced version
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Colors from '../constants/colors';
import { advancedCombinedFoods } from '../utils/FoodPraser'; // Import the advanced food parser

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
        
        // Process food items with improved normalization
        if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
          email.orderDetails.orderItems.forEach(item => {
            // Extract food name from format like "1 X Food Name"
            const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
            if (match && match[1]) {
              const originalFoodName = match[1].trim();
              
              // Enhanced: Use advanced food normalization
              const normalizedFoodName = advancedCombinedFoods(originalFoodName);
              
              if (!foodItemsMap[normalizedFoodName]) {
                foodItemsMap[normalizedFoodName] = {
                  name: originalFoodName, // Keep original name for display
                  normalizedName: normalizedFoodName, // Normalized for grouping
                  count: 1,
                  restaurants: {[restaurant]: 1},
                  variants: [originalFoodName]
                };
              } else {
                foodItemsMap[normalizedFoodName].count += 1;
                
                // Track which restaurants this food is from
                if (foodItemsMap[normalizedFoodName].restaurants[restaurant]) {
                  foodItemsMap[normalizedFoodName].restaurants[restaurant] += 1;
                } else {
                  foodItemsMap[normalizedFoodName].restaurants[restaurant] = 1;
                }
                
                // Track variants if this is a different name than we've seen
                const isNewVariant = !foodItemsMap[normalizedFoodName].variants.includes(originalFoodName);
                if (isNewVariant) {
                  foodItemsMap[normalizedFoodName].variants.push(originalFoodName);
                  
                  // Use the shortest name for display (usually the base version)
                  if (originalFoodName.length < foodItemsMap[normalizedFoodName].name.length) {
                    foodItemsMap[normalizedFoodName].name = originalFoodName;
                  }
                }
              }
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
    
    // Enhance top foods with additional data
    const enhancedTopFoods = foodItemsArray.slice(0, 5).map(food => {
      // Get top restaurants for this food
      const topRestaurantsForFood = Object.entries(food.restaurants)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([restaurantName, count]) => ({ name: restaurantName, count }));
      
      return {
        ...food,
        topRestaurants: topRestaurantsForFood,
        variantCount: food.variants.length
      };
    });
    
    // Get top 5
    setTopRestaurants(restaurantsArray.slice(0, 5));
    setTopFoods(enhancedTopFoods);
  };
  
  const navigateToAllRestaurants = () => {
    // Create a map to process all restaurants from all emails
    const restaurantMap = {};
    
    // Filter valid emails
    const validEmails = emails.filter(email => 
      email.orderDetails?.restaurantName && 
      email.orderDetails?.totalPrice && 
      email.orderDetails?.totalPrice !== 'N/A'
    );
    
    // Process all restaurants from all valid emails
    validEmails.forEach(email => {
      const restaurant = email.orderDetails.restaurantName;
      if (restaurant) {
        const price = parseFloat(email.orderDetails.totalPrice.replace(/[^\d.-]/g, '') || 0);
        const date = new Date(email.date);
        
        // Initialize restaurant data if first encounter
        if (!restaurantMap[restaurant]) {
          restaurantMap[restaurant] = {
            name: restaurant,
            count: 1,
            totalSpent: price,
            firstOrder: date,
            lastOrder: date,
            avgOrderValue: price,
            monthlyData: {},
            emailIds: [email.id]
          };
        } else {
          // Update counts
          restaurantMap[restaurant].count += 1;
          restaurantMap[restaurant].totalSpent += price;
          restaurantMap[restaurant].avgOrderValue = 
            restaurantMap[restaurant].totalSpent / restaurantMap[restaurant].count;
          
          // Track email IDs
          restaurantMap[restaurant].emailIds.push(email.id);
          
          // Update first & last order dates
          if (date < restaurantMap[restaurant].firstOrder) {
            restaurantMap[restaurant].firstOrder = date;
          }
          if (date > restaurantMap[restaurant].lastOrder) {
            restaurantMap[restaurant].lastOrder = date;
          }
        }
        
        // Track monthly data
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!restaurantMap[restaurant].monthlyData[monthYear]) {
          restaurantMap[restaurant].monthlyData[monthYear] = {
            orderCount: 1,
            totalSpent: price
          };
        } else {
          restaurantMap[restaurant].monthlyData[monthYear].orderCount += 1;
          restaurantMap[restaurant].monthlyData[monthYear].totalSpent += price;
        }
      }
    });
    
    // Convert to array and enhance with additional metrics
    const allRestaurants = Object.values(restaurantMap);
    
    // Add monthly stats as array
    allRestaurants.forEach(restaurant => {
      restaurant.monthlyStats = Object.entries(restaurant.monthlyData || {})
        .map(([monthYear, data]) => ({
          monthYear,
          orderCount: data.orderCount,
          totalSpent: data.totalSpent,
          avgOrderValue: data.totalSpent / data.orderCount
        }))
        .sort((a, b) => {
          // Sort by date descending (newest first)
          const dateA = new Date(a.monthYear);
          const dateB = new Date(b.monthYear);
          return dateB - dateA;
        });
        
      delete restaurant.monthlyData; // Clean up the original data structure
    });
    
    // Sort by count (descending)
    allRestaurants.sort((a, b) => b.count - a.count);
    
    // Navigate with ALL restaurants, not just the top ones
    navigation.navigate('RestaurantsScreen', {
      restaurants: allRestaurants,
      allEmails: emails,
      platformColor
    });
  };
  
  const navigateToAllFoods = () => {
    // When "See All" is clicked for foods, we should process ALL food items from all emails
    // Not just pass the top 5 foods we're displaying in TopFavoritesSection
    
    // Create a map to process all food items
    const foodItemsMap = {};
    
    // Filter valid emails
    const validEmails = emails.filter(email => 
      email.orderDetails?.restaurantName && 
      email.orderDetails?.orderItems && 
      Array.isArray(email.orderDetails.orderItems)
    );
    
    // Process all food items from all valid emails
    validEmails.forEach(email => {
      const restaurant = email.orderDetails.restaurantName;
      const orderDate = new Date(email.date);
      
      if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
        email.orderDetails.orderItems.forEach(item => {
          // Extract food name from format like "1 X Food Name"
          const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
          if (match && match[1]) {
            const originalFoodName = match[1].trim();
            
            // Enhanced: Use advanced food normalization
            const normalizedFoodName = advancedCombinedFoods(originalFoodName);
            
            if (!foodItemsMap[normalizedFoodName]) {
              foodItemsMap[normalizedFoodName] = {
                name: originalFoodName, // Keep original name for display
                normalizedName: normalizedFoodName, // Normalized for grouping
                count: 1,
                restaurants: {[restaurant]: 1},
                variants: [originalFoodName],
                firstOrdered: orderDate,
                lastOrdered: orderDate
              };
            } else {
              foodItemsMap[normalizedFoodName].count += 1;
              
              // Track which restaurants this food is from
              if (foodItemsMap[normalizedFoodName].restaurants[restaurant]) {
                foodItemsMap[normalizedFoodName].restaurants[restaurant] += 1;
              } else {
                foodItemsMap[normalizedFoodName].restaurants[restaurant] = 1;
              }
              
              // Track variants if this is a different name than we've seen
              const isNewVariant = !foodItemsMap[normalizedFoodName].variants.includes(originalFoodName);
              if (isNewVariant) {
                foodItemsMap[normalizedFoodName].variants.push(originalFoodName);
                
                // Use the shortest name for display (usually the base version)
                if (originalFoodName.length < foodItemsMap[normalizedFoodName].name.length) {
                  foodItemsMap[normalizedFoodName].name = originalFoodName;
                }
              }
              
              // Update first & last order dates
              if (orderDate < foodItemsMap[normalizedFoodName].firstOrdered) {
                foodItemsMap[normalizedFoodName].firstOrdered = orderDate;
              }
              if (orderDate > foodItemsMap[normalizedFoodName].lastOrdered) {
                foodItemsMap[normalizedFoodName].lastOrdered = orderDate;
              }
            }
          }
        });
      }
    });
    
    // Convert map to array
    const allFoods = Object.values(foodItemsMap);
    
    // Process and enhance with additional data
    allFoods.forEach(food => {
      // Get variant count
      food.variantCount = food.variants.length;
      
      // Process restaurant data into top restaurants
      const restaurantEntries = Object.entries(food.restaurants);
      food.uniqueRestaurants = restaurantEntries.length;
      
      // Get top restaurants for this food
      food.topRestaurants = restaurantEntries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
    });
    
    // Sort by count (default sorting)
    allFoods.sort((a, b) => b.count - a.count);
    
    // Navigate with ALL foods, not just the top ones
    navigation.navigate('FoodsScreen', {
      foods: allFoods,
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
  
  // Enhanced: Render food item with more details
  const renderFoodItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[styles.itemCard, { borderLeftColor: platformColor }]}
      onPress={() => navigation.navigate('FoodDetails', { 
        foodName: item.name, 
        emails, 
        platformColor,
        foodData: {
          name: item.name,
          count: item.count,
          variants: item.variants,
          normalizedName: item.normalizedName,
          topRestaurants: item.topRestaurants
        }
      })}
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
          
          {/* Show variant count if more than one */}
          {item.variantCount > 1 && (
            <View style={styles.variantBadge}>
              <Text style={styles.variantBadgeText}>{item.variantCount} variants</Text>
            </View>
          )}
        </View>
        
        {/* Top restaurant for this food */}
        {item.topRestaurants && item.topRestaurants.length > 0 && (
          <View style={styles.topRestaurantForFood}>
            <Text style={styles.topRestaurantText} numberOfLines={1}>
              <Icon name="star" size={12} color={platformColor} /> {item.topRestaurants[0].name}
            </Text>
          </View>
        )}
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
            keyExtractor={(item) => `food-${item.normalizedName}`}
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
    flexWrap: 'wrap',
  },
  itemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  itemStatText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  // Enhanced styles for variant badge
  variantBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    marginBottom: 4,
  },
  variantBadgeText: {
    fontSize: 11,
    color: '#666',
  },
  // Style for top restaurant for a food item
  topRestaurantForFood: {
    marginTop: 4,
  },
  topRestaurantText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default TopFavoritesSection;