// src/screens/FoodDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 96; // Account for padding and margins

const FoodDetailsScreen = () => {

const saveJsonToFile = async (messageData) => {
  const filePath = `${RNFS.DocumentDirectoryPath}/foodetails.json`;

  try {
    await RNFS.writeFile(filePath, JSON.stringify(messageData, null, 2), 'utf8');
    console.log('Data saved successfully at:', filePath);
  } catch (error) {
    console.error('Error saving JSON file:', error);
  }
};
  const navigation = useNavigation();
  const route = useRoute();
  const { foodName, emails, foodData, platformColor } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState({
    count: foodData?.count || 0,
    firstOrdered: foodData?.firstOrdered,
    lastOrdered: foodData?.lastOrdered,
    avgPrice: 0,
    totalSpent: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  
  useEffect(() => {
    if (emails && foodName) {
      analyzeFoodData();
    } else {
      setLoading(false);
    }
  }, [emails, foodName]);
  
  const analyzeFoodData = async() => {
    try {
      setLoading(true);
      
      // Filter emails containing this food item
      const foodOrders = [];
      const restaurantMap = {};
      let totalPrice = 0;
      
      emails.forEach(email => {
        if (!email.orderDetails?.orderItems || !Array.isArray(email.orderDetails.orderItems)) {
          return;
        }
        
        // Check if any order item contains the food name
        const hasFoodItem = email.orderDetails.orderItems.some(item => {
          const itemName = item?.replace(/^\d+\s*[Xx×]\s+/i, '').trim();
          return itemName.toLowerCase().includes(foodName.toLowerCase());
        });
        
        if (hasFoodItem) {
          const orderDate = new Date(email.date);
          const price = parseFloat(email?.orderDetails?.totalPrice?.replace(/[^\d.-]/g, '') || 0);
          const restaurant = email.orderDetails.restaurantName;
          // Add to orders
          foodOrders.push({
            id: email.id,
            date: orderDate,
            formattedDate: formatDate(orderDate),
            price: price,
            formattedPrice: `₹${price.toFixed(2)}`,
            items: email.orderDetails.orderItems,
            restaurant: restaurant,
            orderId: email.orderDetails.orderId
          });
          
          // Update restaurant data
          if (restaurant) {
            if (!restaurantMap[restaurant]) {
              restaurantMap[restaurant] = {
                name: restaurant,
                count: 1,
                totalSpent: price
              };
            } else {
              restaurantMap[restaurant].count += 1;
              restaurantMap[restaurant].totalSpent += price;
            }
          }
          
          // Update total price
          totalPrice += price;
        }
      });
      
      // Sort orders by date (newest first)
      foodOrders.sort((a, b) => b.date - a.date);
      
      // Process restaurant data
      const restaurantList = Object.values(restaurantMap).sort((a, b) => b.count - a.count);
      
      // Calculate restaurant percentages for bar chart
      if (restaurantList.length > 0) {
        const totalCount = restaurantList.reduce((sum, r) => sum + r.count, 0);
        restaurantList.forEach(r => {
          r.percentage = (r.count / totalCount) * 100;
          r.barWidth = (r.percentage / 100) * BAR_WIDTH;
        });
      }
      
      // Group by month for trend analysis
      const monthlyDataMap = {};
      foodOrders.forEach(order => {
        const monthYear = order.date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!monthlyDataMap[monthYear]) {
          monthlyDataMap[monthYear] = {
            monthYear,
            orderCount: 0,
            totalSpent: 0
          };
        }
        
        monthlyDataMap[monthYear].orderCount += 1;
        monthlyDataMap[monthYear].totalSpent += order.price;
      });
      
      // Convert to array and sort by date
      const monthlyDataArray = Object.values(monthlyDataMap).sort((a, b) => {
        const dateA = new Date(a.monthYear);
        const dateB = new Date(b.monthYear);
        return dateB - dateA;
      });
      // Update the stats
      setOrders(foodOrders);
      setRestaurants(restaurantList.slice(0, 5)); // Show top 5
      setMonthlyData(monthlyDataArray.slice(0, 6)); // Show last 6 months
      await saveJsonToFile(foodOrders);
      setStats({
        count: foodOrders.length,
        firstOrdered: foodOrders.length > 0 ? foodOrders[foodOrders.length - 1].date : null,
        lastOrdered: foodOrders.length > 0 ? foodOrders[0].date : null,
        avgPrice: foodOrders.length > 0 ? totalPrice / foodOrders.length : 0,
        totalSpent: totalPrice
      });
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing food data:', error);
      setLoading(false);
    }
  };
  
  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };
  
  const renderOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderItem}
      onPress={() => navigation.navigate('OrderDetails', { 
        order: {
          restaurant: item.restaurant,
          date: item.date,
          totalPrice: item.formattedPrice,
          orderItems: item.items,
          orderId: item.orderId
        }
      })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderDate}>{item.formattedDate}</Text>
        <Text style={styles.orderPrice}>{item.formattedPrice}</Text>
      </View>
      
      <Text style={styles.orderRestaurant} numberOfLines={1}>
        <Icon name="restaurant" size={14} color="#666" /> {item.restaurant}
      </Text>
      
      <View style={styles.orderItemsList}>
        {item.items.map((foodItem, index) => {
          // Highlight the target food item
          const isTargetFood = foodItem.toLowerCase().includes(foodName.toLowerCase());
          
          return (
            <Text 
              key={`food-${index}`} 
              style={[
                styles.orderFoodItem, 
                isTargetFood && { fontWeight: 'bold', color: platformColor }
              ]} 
              numberOfLines={1}
            >
              • {foodItem}
            </Text>
          );
        })}
      </View>
    </TouchableOpacity>
  );
  
  const renderRestaurantItem = ({ item, index }) => (
    <View style={styles.restaurantItem}>
      <View style={styles.restaurantHeader}>
        <View style={styles.restaurantNameContainer}>
          <Text style={styles.restaurantRank}>{index + 1}.</Text>
          <Text style={styles.restaurantName} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={styles.restaurantCount}>{item.count} times</Text>
      </View>
      
      <View style={styles.barContainer}>
        <View 
          style={[
            styles.bar, 
            { 
              width: item.barWidth, 
              backgroundColor: index === 0 ? platformColor : `${platformColor}80`
            }
          ]}
        />
        <Text style={styles.barPercentage}>{Math.round(item.percentage)}%</Text>
      </View>
    </View>
  );
  
  const renderMonthlyDataItem = ({ item }) => (
    <View style={styles.monthDataItem}>
      <Text style={styles.monthLabel}>{item.monthYear}</Text>
      <View style={styles.monthlyStats}>
        <View style={styles.monthlyStat}>
          <Text style={styles.monthlyStatValue}>{item.orderCount}</Text>
          <Text style={styles.monthlyStatLabel}>Orders</Text>
        </View>
        
        <View style={styles.monthlyStat}>
          <Text style={styles.monthlyStatValue}>{formatCurrency(item.totalSpent)}</Text>
          <Text style={styles.monthlyStatLabel}>Spent</Text>
        </View>
        
        <View style={styles.monthlyStat}>
          <Text style={styles.monthlyStatValue}>
            {formatCurrency(item.totalSpent / item.orderCount)}
          </Text>
          <Text style={styles.monthlyStatLabel}>Avg</Text>
        </View>
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={platformColor} />
        <Text style={styles.loadingText}>Analyzing food data...</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{foodName}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Overview Card */}
        <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Food Overview</Text>
            <View style={[styles.foodIcon, { backgroundColor: `${platformColor}15` }]}>
              <Icon name="fastfood" size={22} color={platformColor} />
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="event-note" size={18} color={platformColor} />
              <Text style={styles.statValue}>{stats.count}</Text>
              <Text style={styles.statLabel}>Times Ordered</Text>
            </View>
            
            <View style={styles.statCard}>
            <Text style={{fontSize: 18, color: platformColor}}>₹</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            
            <View style={styles.statCard}>
              <Icon name="show-chart" size={18} color={platformColor} />
              <Text style={styles.statValue}>{formatCurrency(stats.avgPrice)}</Text>
              <Text style={styles.statLabel}>Avg Price</Text>
            </View>
          </View>
          
          {stats.firstOrdered && (
            <View style={styles.firstLastContainer}>
              <View style={styles.firstLastItem}>
                <Text style={styles.firstLastLabel}>First Ordered:</Text>
                <Text style={styles.firstLastValue}>{formatDate(stats.firstOrdered)}</Text>
              </View>
              
              <View style={styles.firstLastItem}>
                <Text style={styles.firstLastLabel}>Last Ordered:</Text>
                <Text style={styles.firstLastValue}>{formatDate(stats.lastOrdered)}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Top Restaurants Card */}
        {restaurants.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Where You Order It From</Text>
            
            <FlatList
              data={restaurants}
              renderItem={renderRestaurantItem}
              keyExtractor={(item, index) => `restaurant-${index}`}
              scrollEnabled={false}
            />
          </View>
        )}
        
        {/* Monthly Trends */}
        {monthlyData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ordering Trends</Text>
            <FlatList
              data={monthlyData}
              renderItem={renderMonthlyDataItem}
              keyExtractor={(item) => item.monthYear}
              scrollEnabled={false}
            />
          </View>
        )}
        
        {/* Recent Orders */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>Your Orders</Text>
            <Text style={styles.cardSubtitle}>Last {Math.min(5, orders.length)} of {orders.length} times</Text>
          </View>
          
          {orders.length > 0 ? (
            <FlatList
              data={orders.slice(0, 5)}
              renderItem={renderOrderItem}
              keyExtractor={(item, index) => `order-${index}`}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noOrdersText}>No orders found for this food item</Text>
          )}
          
          {orders.length > 5 && (
            <TouchableOpacity 
            style={[styles.viewAllButton, { borderColor: platformColor }]}
            onPress={() => {
              // Filter emails containing this food item
              const foodEmails = emails.filter(email => {
                if (!email.orderDetails?.orderItems || !Array.isArray(email.orderDetails.orderItems)) {
                  return false;
                }
                
                // Check if any order item contains the food name
                return email.orderDetails.orderItems.some(item => {
                  const itemName = item?.replace(/^\d+\s*[Xx×]\s+/i, '').trim();
                  return itemName.toLowerCase().includes(foodName.toLowerCase());
                });
              });
              console.log(foodEmails.length,"foodEmails")
              // Get unique restaurants for this food
              const uniqueRestaurants = [...new Set(foodEmails
                .map(email => email.orderDetails.restaurantName)
                .filter(name => name))];
              
              // Navigate to TransactionsScreen with food-filtered data
              navigation.navigate('TransactionsScreen', {
                allEmails: foodEmails,
                platformColor,
                filterOptions: {
                  restaurants: uniqueRestaurants,
                  foodItems: [foodName]
                },
                initialFilter: {
                  foodItem: foodName
                }
              });
            }}
          >
            <Text style={[styles.viewAllText, { color: platformColor }]}>View All Orders</Text>
            <Icon name="arrow-forward" size={16} color={platformColor} />
          </TouchableOpacity>
          )}
        </View>        
      </ScrollView>
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
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  foodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  firstLastContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  firstLastItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  firstLastLabel: {
    fontSize: 14,
    color: '#666',
  },
  firstLastValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  restaurantItem: {
    marginBottom: 16,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  restaurantNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  restaurantRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 24,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  restaurantCount: {
    fontSize: 14,
    color: '#666',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
  },
  bar: {
    height: 8,
    borderRadius: 4,
  },
  barPercentage: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  monthDataItem: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  monthlyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthlyStat: {
    alignItems: 'center',
  },
  monthlyStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: '#999',
  },
  orderItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  orderDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  orderPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  orderRestaurant: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  orderItemsList: {
    marginBottom: 8,
  },
  orderFoodItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  noOrdersText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 12,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  featuresList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
});

export default FoodDetailsScreen;