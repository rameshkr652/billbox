import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const FoodsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { foods, allEmails, platformColor } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState('');
  const [allFoods, setAllFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState('orderCount'); // 'orderCount', 'name'
  
  useEffect(() => {
    if (allEmails && allEmails.length > 0) {
      analyzeData();
    } else {
      setLoading(false);
    }
  }, [allEmails]);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFoods(allFoods);
    } else {
      const filtered = allFoods.filter(food => 
        food.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFoods(filtered);
    }
  }, [searchQuery, allFoods]);
  
  const analyzeData = () => {
    try {
      setLoading(true);
      
      // Process food items data
      const foodMap = {};
      
      // Filter valid emails
      const validEmails = allEmails.filter(email => 
        email.orderDetails?.restaurantName && 
        email.orderDetails?.orderItems && 
        Array.isArray(email.orderDetails.orderItems)
      );
      
      // Extract and count food items
      validEmails.forEach(email => {
        const restaurant = email.orderDetails.restaurantName;
        const orderDate = new Date(email.date);
        
        email.orderDetails.orderItems.forEach(item => {
          // Extract food name from format like "1 X Food Name"
          const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
          if (match && match[1]) {
            const foodName = match[1].trim();
            
            if (!foodMap[foodName]) {
              foodMap[foodName] = {
                name: foodName,
                count: 1,
                restaurants: { [restaurant]: 1 },
                firstOrdered: orderDate,
                lastOrdered: orderDate
              };
            } else {
              foodMap[foodName].count += 1;
              
              // Update restaurant count
              if (foodMap[foodName].restaurants[restaurant]) {
                foodMap[foodName].restaurants[restaurant] += 1;
              } else {
                foodMap[foodName].restaurants[restaurant] = 1;
              }
              
              // Update first & last order dates
              if (orderDate < foodMap[foodName].firstOrdered) {
                foodMap[foodName].firstOrdered = orderDate;
              }
              if (orderDate > foodMap[foodName].lastOrdered) {
                foodMap[foodName].lastOrdered = orderDate;
              }
            }
          }
        });
      });
      
      // Process and convert to array
      let foodsArray = Object.values(foodMap);
      
      // Process restaurant data into top restaurants
      foodsArray.forEach(food => {
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
            <Icon name="fastfood" size={22} color={foodColor} />
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
        
        {item.topRestaurants && item.topRestaurants.length > 0 && (
          <View style={styles.topRestaurantsContainer}>
            <Text style={styles.topRestaurantsTitle}>Top Restaurants:</Text>
            <View style={styles.topRestaurantsList}>
              {item.topRestaurants.map((restaurant, idx) => (
                <View key={`${item.name}-restaurant-${idx}`} style={styles.topRestaurantBadge}>
                  <Text style={styles.topRestaurantText}>{restaurant.name}</Text>
                  <View style={styles.topRestaurantCount}>
                    <Text style={styles.topRestaurantCountText}>{restaurant.count}</Text>
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
        keyExtractor={(item, index) => `food-${index}-${item.name}`}
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
    width: 100,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  topRestaurantsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  topRestaurantsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  topRestaurantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topRestaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  topRestaurantText: {
    fontSize: 12,
    color: '#666',
  },
  topRestaurantCount: {
    backgroundColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  topRestaurantCountText: {
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