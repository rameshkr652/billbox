// src/screens/FoodsScreen.js - Enhanced with consistent food normalization
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

const FoodsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { foods, allEmails, platformColor } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allFoods, setAllFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('orderCount'); // 'orderCount', 'totalSpent', 'name'
  
  useEffect(() => {
    if (allEmails && allEmails.length > 0) {
      analyzeData();
    } else if (foods && foods.length > 0) {
      // If preprocessed foods data is passed, use it directly
      setAllFoods(foods);
      setFilteredFoods(foods);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [allEmails, foods]);
  
  // Enhanced food search with partial matching and fuzzy search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFoods(allFoods);
    } else {
      const filtered = filterFoodItems(allFoods, searchQuery);
      setFilteredFoods(filtered);
    }
  }, [searchQuery, allFoods]);
  
  /**
   * Enhanced food item filtering function with partial matching
   */
  const filterFoodItems = (foodItems, query) => {
    if (!query || query.trim() === '') {
      return foodItems;
    }
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    
    // Calculate score for each food item based on how well it matches the search
    const scoredItems = foodItems.map(item => {
      // Create a searchable string of all variants
      const searchableText = [
        item.name.toLowerCase(),
        item.normalizedName?.toLowerCase() || '',
        ...(item.variants ? item.variants.map(variant => variant.toLowerCase()) : [])
      ].join(' ');
      
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
      
      // If we already have pre-normalized foods data from TopFavoritesSection
      if (foods && Array.isArray(foods) && foods.length > 0 && foods[0].normalizedName) {
        // If we received already normalized foods, use them directly
        const enhancedFoods = [...foods];
        
        // Sort by count (descending)
        enhancedFoods.sort((a, b) => b.count - a.count);
        
        setAllFoods(enhancedFoods);
        setFilteredFoods(enhancedFoods);
        setLoading(false);
        return;
      }
      
      // Otherwise, process from scratch
      const foodItemsMap = {};
      
      // Filter valid emails
      const validEmails = allEmails.filter(email => 
        email.orderDetails?.restaurantName && 
        email.orderDetails?.orderItems && 
        Array.isArray(email.orderDetails.orderItems)
      );
      
      // Extract and count food items with improved normalization
      validEmails.forEach(email => {
        const restaurant = email.orderDetails.restaurantName;
        const orderDate = new Date(email.date);
        
        email.orderDetails.orderItems.forEach(item => {
          // Extract food name from format like "1 X Food Name"
          const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
          let originalFoodName = item
          if (match && match[1]) {
            originalFoodName = match[1].trim();            
          }
            
            // Use advanced food normalization
            const normalizedFoodName = advancedCombinedFoods(originalFoodName);
            
            // Skip if empty after normalization
            if (!normalizedFoodName) return;
            
            if (!foodItemsMap[normalizedFoodName]) {
              foodItemsMap[normalizedFoodName] = {
                name: originalFoodName,
                normalizedName: normalizedFoodName,
                count: 1,
                restaurants: { [restaurant]: 1 },
                variants: [originalFoodName],
                firstOrdered: orderDate,
                lastOrdered: orderDate
              };
            } else {
              foodItemsMap[normalizedFoodName].count += 1;
              
              // Update restaurant count
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
        });
      });
      
      // Convert to array
      let foodsArray = Object.values(foodItemsMap);
      
      // Process and enhance with additional data
      foodsArray.forEach(food => {
        // Get variant count
        food.variantCount = food.variants.length;
        
        // Process restaurant data into top restaurants
        const restaurantEntries = Object.entries(food.restaurants);
        food.uniqueRestaurants = restaurantEntries.length;
        
        // Get top 3 restaurants
        food.topRestaurants = restaurantEntries
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));
      });
      
      // Initial sort by order count
      foodsArray.sort((a, b) => b.count - a.count);
      
      setAllFoods(foodsArray);
      setFilteredFoods(foodsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing food data:', error);
      setLoading(false);
    }
  };
  
  const sortFoods = (option) => {
    let sorted = [...filteredFoods];
    
    switch(option) {
      case 'orderCount':
        sorted.sort((a, b) => b.count - a.count);
        break;
      case 'totalSpent':
        sorted.sort((a, b) => {
          const aTotal = Object.values(a.restaurants).reduce((sum, count) => sum + count, 0);
          const bTotal = Object.values(b.restaurants).reduce((sum, count) => sum + count, 0);
          return bTotal - aTotal;
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'restaurants':
        sorted.sort((a, b) => b.uniqueRestaurants - a.uniqueRestaurants);
        break;
      default:
        // Default sort by order count
        sorted.sort((a, b) => b.count - a.count);
    }
    
    setFilteredFoods(sorted);
    setSortOption(option);
  };
  
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Generate a color based on food name
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
  
  const renderFoodItem = ({ item, index }) => {
    const foodColor = getColorFromName(item.name);
    
    return (
      <TouchableOpacity 
        style={styles.foodCard}
        onPress={() => navigation.navigate('FoodDetails', { 
          foodName: item.name, 
          emails: allEmails,
          foodData: item,
          platformColor
        })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.foodIcon, { backgroundColor: `${foodColor}15` }]}>
            <Text style={[styles.foodInitial, { color: foodColor }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.foodInfo}>
            <Text style={styles.foodName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.foodMeta}>
              Ordered from {item.uniqueRestaurants} restaurant{item.uniqueRestaurants !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={[styles.orderCountBadge, { backgroundColor: foodColor }]}>
            <Text style={styles.orderCountText}>{item.count}</Text>
            <Text style={styles.orderCountLabel}>times</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.statItem}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.statLabel}>First ordered:</Text>
            <Text style={styles.statValue}>{formatDate(item.firstOrdered)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.statLabel}>Last ordered:</Text>
            <Text style={styles.statValue}>{formatDate(item.lastOrdered)}</Text>
          </View>
        </View>
        
        {/* Enhanced: Show variants if applicable */}
        {item.variantCount > 1 && (
          <View style={styles.variantsContainer}>
            <Text style={styles.variantsTitle}>
              <Icon name="layers" size={14} color="#888" /> {item.variantCount} variants:
            </Text>
            <View style={styles.variantsList}>
              {item.variants.slice(0, 3).map((variant, idx) => (
                <View key={`variant-${idx}`} style={styles.variantBadge}>
                  <Text style={styles.variantText} numberOfLines={1}>
                    {variant}
                  </Text>
                </View>
              ))}
              {item.variants.length > 3 && (
                <View style={styles.variantBadge}>
                  <Text style={styles.variantText}>+{item.variants.length - 3} more</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Enhanced: Show top restaurants */}
        {item.topRestaurants && item.topRestaurants.length > 0 && (
          <View style={styles.topItemsContainer}>
            <Text style={styles.topItemsTitle}>Top Restaurants:</Text>
            <View style={styles.topItemsList}>
              {item.topRestaurants.map((restaurant, idx) => (
                <View key={`${item.name}-restaurant-${idx}`} style={styles.topItemBadge}>
                  <Text style={styles.topItemText}>{restaurant.name}</Text>
                  <View style={styles.topItemCount}>
                    <Text style={styles.topItemCountText}>{restaurant.count}</Text>
                  </View>
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
        <Text style={styles.loadingText}>Analyzing your food data...</Text>
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
        <Text style={styles.headerTitle}>Your Food Items</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search food items..."
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
          onPress={() => sortFoods('orderCount')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'orderCount' && { color: platformColor }
          ]}>Most Ordered</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.sortButton, 
            sortOption === 'restaurants' && [styles.activeSortButton, { borderColor: platformColor }]
          ]}
          onPress={() => sortFoods('restaurants')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'restaurants' && { color: platformColor }
          ]}>Restaurant Count</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.sortButton, 
            sortOption === 'name' && [styles.activeSortButton, { borderColor: platformColor }]
          ]}
          onPress={() => sortFoods('name')}
        >
          <Text style={[
            styles.sortButtonText, 
            sortOption === 'name' && { color: platformColor }
          ]}>Name</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{filteredFoods.length}</Text>
          <Text style={styles.statTitle}>Unique Items</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {filteredFoods.reduce((sum, f) => sum + f.count, 0)}
          </Text>
          <Text style={styles.statTitle}>Items Ordered</Text>
        </View>
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>
            {Math.max(...filteredFoods.map(f => f.count), 0)}
          </Text>
          <Text style={styles.statTitle}>Most Popular</Text>
        </View>
      </View>
      
      <FlatList
        data={filteredFoods}
        renderItem={renderFoodItem}
        keyExtractor={(item, index) => `food-${index}-${item.normalizedName || item.name}`}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="fastfood" size={60} color="#ddd" />
            <Text style={styles.emptyText}>No food items found</Text>
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
  foodCard: {
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
  foodIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodInitial: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  foodMeta: {
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
  // Enhanced: Variants display
  variantsContainer: {
    borderTopWidth: 1, 
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  variantsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  variantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantBadge: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4, 
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  variantText: {
    fontSize: 12,
    color: '#666',
    maxWidth: 120,
  },
  // Enhanced: Top restaurants display
  topItemsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
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

export default FoodsScreen;