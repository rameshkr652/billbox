// src/screens/RestaurantsScreen.js
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
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRestaurants(allRestaurants);
    } else {
      const filtered = allRestaurants.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRestaurants(filtered);
    }
  }, [searchQuery, allRestaurants]);
  
  const analyzeData = () => {
    try {
      setLoading(true);
      
      // Process restaurant data
      const restaurantMap = {};
      
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
          
          if (!restaurantMap[restaurant]) {
            restaurantMap[restaurant] = {
              name: restaurant,
              count: 1,
              totalSpent: price,
              firstOrder: date,
              lastOrder: date,
              avgOrderValue: price,
              mostOrdered: {}
            };
          } else {
            restaurantMap[restaurant].count += 1;
            restaurantMap[restaurant].totalSpent += price;
            restaurantMap[restaurant].avgOrderValue = restaurantMap[restaurant].totalSpent / restaurantMap[restaurant].count;
            
            // Update first & last order dates
            if (date < restaurantMap[restaurant].firstOrder) {
              restaurantMap[restaurant].firstOrder = date;
            }
            if (date > restaurantMap[restaurant].lastOrder) {
              restaurantMap[restaurant].lastOrder = date;
            }
          }
          
          // Track most ordered items
          if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
            email.orderDetails.orderItems.forEach(item => {
              const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
              if (match && match[1]) {
                const foodName = match[1].trim();
                if (!restaurantMap[restaurant].mostOrdered[foodName]) {
                  restaurantMap[restaurant].mostOrdered[foodName] = 1;
                } else {
                  restaurantMap[restaurant].mostOrdered[foodName] += 1;
                }
              }
            });
          }
        }
      });
      
      // Convert to array
      let restaurantsArray = Object.values(restaurantMap);
      
      // Process most ordered items into arrays
      restaurantsArray.forEach(restaurant => {
        const topItems = Object.entries(restaurant.mostOrdered)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));
        
        restaurant.topItems = topItems;
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
        
        {item.topItems && item.topItems.length > 0 && (
          <View style={styles.topItemsContainer}>
            <Text style={styles.topItemsTitle}>Most Ordered:</Text>
            <View style={styles.topItemsList}>
              {item.topItems.map((food, idx) => (
                <View key={`${item.name}-food-${idx}`} style={styles.topItemBadge}>
                  <Text style={styles.topItemText}>{food.name}</Text>
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