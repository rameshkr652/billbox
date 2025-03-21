// src/screens/RestaurantsScreen.js - Enhanced version
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import { advancedCombinedFoods } from '../utils/FoodPraser'; // Import the advanced food parser

const RestaurantsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { restaurants, allEmails, platformColor } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('orderCount'); // 'orderCount', 'totalSpent', 'name'
  
  useEffect(() => {
    if (allEmails && allEmails.length > 0) {
      analyzeData();
    } else {
      setLoading(false);
    }
  }, [allEmails]);
  
  // Enhanced search with partial matching and fuzzy search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRestaurants(allRestaurants);
    } else {
      const filtered = filterRestaurants(allRestaurants, searchQuery);
      setFilteredRestaurants(filtered);
    }
  }, [searchQuery, allRestaurants]);
  
  /**
   * Enhanced restaurant filtering function with partial matching
   */
  const filterRestaurants = (restaurantItems, query) => {
    if (!query || query.trim() === '') {
      return restaurantItems;
    }
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    // Calculate score for each restaurant based on how well it matches the search
    const scoredItems = restaurantItems.map(item => {
      // Create a searchable string with name and related data
      const searchableText = item.name.toLowerCase();
      
      // Calculate match score
      let score = 0;
      
      // Exact match bonus
      if (searchableText.includes(query.toLowerCase())) {
        score += 100; // High score for exact match
      }
      
      // Check each search term
      searchTerms.forEach(term => {
        // Full term match
        if (searchableText.includes(term)) {
          score += 20 * term.length; // Reward longer term matches more
        }
        
        // Partial word matches
        const words = searchableText.split(/\s+/);
        words.forEach(word => {
          if (word.startsWith(term)) {
            score += 15; // Good score for prefix match
          } else if (word.includes(term)) {
            score += 10; // Medium score for substring match
          }
          
          // Calculate Levenshtein distance for fuzzy matching
          const distance = levenshteinDistance(word, term);
          if (distance <= 2 && term.length > 3) { // Only for significant terms
            score += (10 - distance * 3); // Score based on similarity
          }
        });
      });
      
      return { item, score };
    });
    
    // Filter items with a minimum score and sort by score
    return scoredItems
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  };
  
  /**
   * Levenshtein distance calculation for fuzzy text matching
   */
  const levenshteinDistance = (str1, str2) => {
    const track = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }
    
    return track[str2.length][str1.length];
  };
  
  const analyzeData = () => {
    try {
      setLoading(true);
      
      // If we already have pre-normalized restaurant data from TopFavoritesSection
      if (restaurants && Array.isArray(restaurants) && restaurants.length > 0) {
        // Create new objects rather than mutating existing ones
        const preppedRestaurants = restaurants.map(restaurant => {
          // Create a fresh object with all the original properties
          return {
            ...restaurant,
            // Add default values for properties we'll access later
            topItems: restaurant.topItems || [],
            totalSpent: restaurant.totalSpent || 0,
            avgOrderValue: restaurant.avgOrderValue || 
              (restaurant.totalSpent ? restaurant.totalSpent / (restaurant.count || 1) : 0),
            monthlyStats: restaurant.monthlyStats || [],
            firstOrder: restaurant.firstOrder || null,
            lastOrder: restaurant.lastOrder || null
          };
        });
        
        // Sort by count (descending)
        preppedRestaurants.sort((a, b) => b.count - a.count);
        
        setAllRestaurants(preppedRestaurants);
        setFilteredRestaurants(preppedRestaurants);
        setLoading(false);
        return;
      }
      
      // Otherwise, process from scratch
      const restaurantMap = {};
      const foodItemsByRestaurant = {};
      
      // Filter valid emails
      const validEmails = allEmails.filter(email => 
        email.orderDetails?.restaurantName && 
        email.orderDetails?.totalPrice && 
        email.orderDetails?.totalPrice !== 'N/A'
      );
      
      // Count restaurant orders and calculate total spent
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
            
            // Initialize food tracking
            foodItemsByRestaurant[restaurant] = {};
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
          
          // Track most ordered items
          if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
            email.orderDetails.orderItems.forEach(item => {
              const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
              if (match && match[1]) {
                const foodName = match[1].trim();
                const normalizedFoodName = advancedCombinedFoods(foodName);
                
                if (!normalizedFoodName) return;
                
                if (!foodItemsByRestaurant[restaurant][normalizedFoodName]) {
                  foodItemsByRestaurant[restaurant][normalizedFoodName] = {
                    name: foodName,
                    normalizedName: normalizedFoodName,
                    count: 1,
                    variants: [foodName]
                  };
                } else {
                  foodItemsByRestaurant[restaurant][normalizedFoodName].count += 1;
                  
                  // Track variants only if this is a new name
                  if (!foodItemsByRestaurant[restaurant][normalizedFoodName].variants.includes(foodName)) {
                    foodItemsByRestaurant[restaurant][normalizedFoodName].variants.push(foodName);
                    
                    // Use the shortest name for display
                    if (foodName.length < foodItemsByRestaurant[restaurant][normalizedFoodName].name.length) {
                      foodItemsByRestaurant[restaurant][normalizedFoodName].name = foodName;
                    }
                  }
                }
              }
            });
          }
        }
      });
      
      // Convert to array and calculate additional metrics
      let restaurantsArray = Object.values(restaurantMap);
      
      // Add top food items to each restaurant
      restaurantsArray.forEach(restaurant => {
        const foodItems = foodItemsByRestaurant[restaurant.name] || {};
        const topItems = Object.values(foodItems)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map(item => ({
            name: item.name,
            normalizedName: item.normalizedName,
            count: item.count,
            variants: item.variants
          }));
        
        restaurant.topItems = topItems;
        
        // Add monthly data as array
        restaurant.monthlyStats = Object.entries(restaurant.monthlyData || {})
          .map(([monthYear, data]) => ({
            monthYear,
            orderCount: data.orderCount,
            totalSpent: data.totalSpent,
            avgOrderValue: data.totalSpent / data.orderCount
          }))
          .sort((a, b) => {
            const dateA = new Date(a.monthYear);
            const dateB = new Date(b.monthYear);
            return dateB - dateA; // Sort by date descending (newest first)
          });
      });
      
      // Initial sort by order count
      restaurantsArray.sort((a, b) => b.count - a.count);
      
      setAllRestaurants(restaurantsArray);
      setFilteredRestaurants(restaurantsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing restaurant data:', error);
      setLoading(false);
    }
  };
  
  const sortRestaurants = (option) => {
    let sorted = [...filteredRestaurants];
    
    switch(option) {
      case 'orderCount':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'totalSpent':
        sorted.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        // Default sort by order count
        sorted.sort((a, b) => b.count - a.count);
    }
    
    setFilteredRestaurants(sorted);
    setSortOption(option);
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Generate a color based on restaurant name
  const getColorFromName = (name) => {
    if (!name) return platformColor;
    
    const colors = [
      '#4CAF50', // green
      '#2196F3', // blue
      '#9C27B0', // purple
      '#FF9800', // orange
      '#E91E63', // pink
      '#00BCD4', // cyan
      '#FFC107', // amber
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };
  
  const renderRestaurantItem = ({ item, index }) => {
    const restaurantColor = getColorFromName(item.name);
    
    return (
      <TouchableOpacity 
        style={styles.restaurantCard}
        onPress={() => navigation.navigate('RestaurantDetails', { 
          restaurantName: item.name, 
          emails: allEmails,
          restaurantData: item,
          platformColor
        })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.restaurantIcon, { backgroundColor: `${restaurantColor}15` }]}>
            <Text style={[styles.restaurantInitial, { color: restaurantColor }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.restaurantMeta}>
              First order: {formatDate(item.firstOrder)}
            </Text>
          </View>
          
          <View style={[styles.orderCountBadge, { backgroundColor: restaurantColor }]}>
            <Text style={styles.orderCountText}>{item.count}</Text>
            <Text style={styles.orderCountLabel}>orders</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.statItem}>
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.statLabel}>Total Spent:</Text>
            <Text style={styles.statValue}>{formatCurrency(item.totalSpent)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="receipt" size={16} color="#666" />
            <Text style={styles.statLabel}>Avg Order:</Text>
            <Text style={styles.statValue}>{formatCurrency(item.avgOrderValue)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.statLabel}>Last Order:</Text>
            <Text style={styles.statValue}>{formatDate(item.lastOrder)}</Text>
          </View>
        </View>
        
        {/* Top Food Items Section */}
        {item.topItems && item.topItems.length > 0 && (
          <View style={styles.topItemsContainer}>
            <Text style={styles.topItemsTitle}>Most Ordered:</Text>
            <View style={styles.topItemsList}>
              {item.topItems.map((food, idx) => (
                <View key={`${item.name}-food-${idx}`} style={styles.topItemBadge}>
                  <Text style={styles.topItemText}>{food.name}</Text>
                  <View style={styles.topItemCount}>
                    <Text style={styles.topItemCountText}>{food.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Monthly Trends Section (condensed version) */}
        {item.monthlyStats && item.monthlyStats.length > 1 && (
          <View style={styles.monthlyTrendsContainer}>
            <Text style={styles.monthlyTrendsTitle}>
              <Icon name="trending-up" size={14} color="#666" /> Recent Trend:
            </Text>
            <View style={styles.trendLine}>
              {item.monthlyStats.slice(0, 3).map((month, idx) => (
                <View 
                  key={`trend-${idx}`} 
                  style={[
                    styles.trendBar, 
                    { 
                      height: Math.max(15, Math.min(60, month.orderCount * 10)),
                      backgroundColor: `${restaurantColor}${70 + (idx * 10)}`
                    }
                  ]}
                >
                  <Text style={styles.trendCount}>{month.orderCount}</Text>
                  <Text style={styles.trendMonth}>{month.monthYear.split(' ')[0]}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={platformColor} />
        <Text style={styles.loadingText}>Analyzing your restaurant data...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: platformColor }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Restaurants</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity 
          style={[
            styles.sortButton, 
            sortOption === 'orderCount' && [styles.activeSortButton, { borderColor: platformColor }]
          ]}
          onPress={() => sortRestaurants('orderCount')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'orderCount' && { color: platformColor }
          ]}>Order Count</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.sortButton, 
            sortOption === 'totalSpent' && [styles.activeSortButton, { borderColor: platformColor }]
          ]}
          onPress={() => sortRestaurants('totalSpent')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'totalSpent' && { color: platformColor }
          ]}>Total Spent</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.sortButton, 
            sortOption === 'name' && [styles.activeSortButton, { borderColor: platformColor }]
          ]}
          onPress={() => sortRestaurants('name')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'name' && { color: platformColor }
          ]}>Name</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{filteredRestaurants.length}</Text>
          <Text style={styles.statTitle}>Restaurants</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {formatCurrency(filteredRestaurants.reduce((sum, r) => sum + r.totalSpent, 0))}
          </Text>
          <Text style={styles.statTitle}>Total Spent</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {filteredRestaurants.reduce((sum, r) => sum + r.count, 0)}
          </Text>
          <Text style={styles.statTitle}>Orders</Text>
        </View>
      </View>
      
      <FlatList
        data={filteredRestaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={(item, index) => `restaurant-${index}-${item.name}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="restaurant" size={60} color="#ddd" />
            <Text style={styles.emptyText}>No restaurants found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#333',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  sortButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: '#f0f0f0',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContainer: {
    padding: 12,
  },
  restaurantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  restaurantIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restaurantInitial: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantMeta: {
    fontSize: 12,
    color: '#888',
  },
  orderCountBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderCountLabel: {
    color: '#fff',
    fontSize: 10,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 85,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  topItemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  topItemsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  topItemsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topItemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  topItemText: {
    fontSize: 12,
    color: '#666',
  },
  topItemCount: {
    backgroundColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  topItemCountText: {
    fontSize: 10,
    color: '#666',
    fontWeight: 'bold',
  },
  monthlyTrendsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  monthlyTrendsTitle: {
    fontSize: 14,
    fontWeight: '500', 
    color: '#666',
    marginBottom: 8,
  },
  trendLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 70,
    paddingHorizontal: 10,
  },
  trendBar: {
    width: 50,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  trendCount: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  trendMonth: {
    color: '#fff',
    fontSize: 9,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default RestaurantsScreen;