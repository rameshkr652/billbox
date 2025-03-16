// src/screens/RestaurantDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const RestaurantDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { restaurantName, emails, restaurantData, platformColor } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    orderCount: 0,
    totalSpent: 0,
    avgOrderValue: 0,
    topItems: []
  });
  const [monthlyData, setMonthlyData] = useState([]);
  
  useEffect(() => {
    if (restaurantData) {
      setStats({
        orderCount: restaurantData.count || 0,
        totalSpent: restaurantData.totalSpent || 0,
        avgOrderValue: restaurantData.avgOrderValue || 0,
        topItems: restaurantData.topItems || []
      });
    }
  }, [restaurantData]);
  useEffect(() => {
    if (emails && restaurantName) {
      analyzeRestaurantData();
    } else {
      setLoading(false);
    }
  }, [emails, restaurantName]);
  
  const analyzeRestaurantData = () => {
    try {
      setLoading(true);
      
      // Filter emails for this restaurant
      const restaurantEmails = emails.filter(email => 
        email.orderDetails?.restaurantName === restaurantName
      );
      
      // Sort by date (newest first)
      restaurantEmails.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      
      // Process orders
      const processedOrders = restaurantEmails.map(email => {
        const orderDate = new Date(email.date);
        const price = parseFloat(email.orderDetails.totalPrice.replace(/[^\d.-]/g, '') || 0);
        
        return {
          id: email.id,
          date: orderDate,
          formattedDate: formatDate(orderDate),
          price: price,
          formattedPrice: `₹${price.toFixed(2)}`,
          items: email.orderDetails?.orderItems || [],
          status: email.orderDetails?.orderStatus || 'Order Placed'
        };
      });
      
      // Group by month for analysis
      const monthlyDataMap = {};
      processedOrders.forEach(order => {
        const monthYear = order.date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!monthlyDataMap[monthYear]) {
          monthlyDataMap[monthYear] = {
            monthYear,
            orderCount: 0,
            totalSpent: 0,
            avgOrderValue: 0
          };
        }
        
        monthlyDataMap[monthYear].orderCount += 1;
        monthlyDataMap[monthYear].totalSpent += order.price;
      });
      
      // Calculate monthly averages
      Object.values(monthlyDataMap).forEach(month => {
        month.avgOrderValue = month.totalSpent / month.orderCount;
      });
      
      // Convert to array and sort by date (most recent first)
      const monthlyDataArray = Object.values(monthlyDataMap).sort((a, b) => {
        const dateA = new Date(a.monthYear);
        const dateB = new Date(b.monthYear);
        return dateB - dateA;
      });
      
      // Update state
      setOrders(processedOrders);
      setMonthlyData(monthlyDataArray.slice(0, 6)); // Show last 6 months
      setStats({
        orderCount: processedOrders.length,
        totalSpent: processedOrders.reduce((sum, order) => sum + order.price, 0),
        avgOrderValue: processedOrders.length > 0 
          ? processedOrders.reduce((sum, order) => sum + order.price, 0) / processedOrders.length 
          : 0,
        topItems: restaurantData?.topItems || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error analyzing restaurant data:', error);
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
          restaurant: restaurantName,
          date: item.date,
          totalPrice: item.formattedPrice,
          orderItems: item.items
        }
      })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.orderDate}>{item.formattedDate}</Text>
        <Text style={styles.orderPrice}>{item.formattedPrice}</Text>
      </View>
      
      <View style={styles.orderItemsList}>
        {item.items.slice(0, 2).map((foodItem, index) => (
          <Text key={`food-${index}`} style={styles.orderFoodItem} numberOfLines={1}>
            • {foodItem}
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
        )}
      </View>
      
      <View style={styles.orderFooter}>
        <View style={[styles.orderStatusBadge, { backgroundColor: `${platformColor}20` }]}>
          <Text style={[styles.orderStatusText, { color: platformColor }]}>
            {item.status}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
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
          <Text style={styles.monthlyStatValue}>{formatCurrency(item.avgOrderValue)}</Text>
          <Text style={styles.monthlyStatLabel}>Avg</Text>
        </View>
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={platformColor} />
        <Text style={styles.loadingText}>Analyzing restaurant data...</Text>
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
        <Text style={styles.headerTitle} numberOfLines={1}>{restaurantName}</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Restaurant Overview</Text>
            <View style={[styles.restaurantIcon, { backgroundColor: `${platformColor}15` }]}>
              <Text style={[styles.restaurantInitial, { color: platformColor }]}>
                {restaurantName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="receipt" size={18} color={platformColor} />
              <Text style={styles.statValue}>{stats.orderCount}</Text>
              <Text style={styles.statLabel}>Orders</Text>
            </View>
            
            <View style={styles.statCard}>
            <Text style={{fontSize: 18, color: platformColor}}>₹</Text>
              <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            
            <View style={styles.statCard}>
              <Icon name="show-chart" size={18} color={platformColor} />
              <Text style={styles.statValue}>{formatCurrency(stats.avgOrderValue)}</Text>
              <Text style={styles.statLabel}>Avg Order</Text>
            </View>
          </View>
          
          {restaurantData?.firstOrder && (
            <View style={styles.firstLastContainer}>
              <View style={styles.firstLastItem}>
                <Text style={styles.firstLastLabel}>First Order:</Text>
                <Text style={styles.firstLastValue}>{formatDate(restaurantData.firstOrder)}</Text>
              </View>
              
              <View style={styles.firstLastItem}>
                <Text style={styles.firstLastLabel}>Last Order:</Text>
                <Text style={styles.firstLastValue}>{formatDate(restaurantData.lastOrder)}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Top Items Card */}
        {stats.topItems && stats.topItems.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Most Ordered Items</Text>
            
            <View style={styles.topItemsList}>
              {stats.topItems.map((item, index) => (
                <View key={`item-${index}`} style={styles.topItem}>
                  <Text style={styles.topItemRank}>{index + 1}</Text>
                  <View style={styles.topItemDetails}>
                    <Text style={styles.topItemName}>{item.name}</Text>
                    <Text style={styles.topItemCount}>Ordered {item.count} times</Text>
                  </View>
                  <Icon name="favorite" size={16} color={index === 0 ? platformColor : '#ddd'} />
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Monthly Trends */}
        {monthlyData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Monthly Trends</Text>
            <FlatList
              data={monthlyData}
              renderItem={renderMonthlyDataItem}
              keyExtractor={(item) => item.monthYear}
              horizontal={false}
              scrollEnabled={false}
            />
          </View>
        )}
        
        {/* Recent Orders */}
        <View style={styles.card}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitle}>Recent Orders</Text>
            <Text style={styles.cardSubtitle}>Last {Math.min(5, orders.length)} of {orders.length} orders</Text>
          </View>
          
          {orders.length > 0 ? (
            <FlatList
              data={orders.slice(0, 5)}
              renderItem={renderOrderItem}
              keyExtractor={(item) => `order-${item.id}`}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noOrdersText}>No orders found for this restaurant</Text>
          )}
          
          {orders.length > 5 && (
            <TouchableOpacity 
            style={[styles.viewAllButton, { borderColor: platformColor }]}
            onPress={() => {
              // Extract unique restaurant names and food items
              const validEmails = emails.filter(email => 
                email.orderDetails?.restaurantName === restaurantName
              );
              
              // Get all food items from this restaurant
              const allFoodItems = [];
              validEmails.forEach(email => {
                if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
                  email.orderDetails.orderItems.forEach(item => {
                    const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
                    if (match && match[1]) {
                      allFoodItems.push(match[1].trim());
                    }
                  });
                }
              });
              
              // Get unique food items
              const uniqueFoodItems = [...new Set(allFoodItems)];
              
              // Navigate to TransactionsScreen with restaurant-filtered data
              navigation.navigate('TransactionsScreen', {
                allEmails: validEmails,
                platformColor,
                filterOptions: {
                  restaurants: [restaurantName],
                  foodItems: uniqueFoodItems
                },
                initialFilter: {
                  restaurant: restaurantName
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
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restaurantInitial: {
    fontSize: 20,
    fontWeight: 'bold',
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
  topItemsList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topItemRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eee',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 12,
  },
  topItemDetails: {
    flex: 1,
  },
  topItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  topItemCount: {
    fontSize: 12,
    color: '#999',
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
    marginBottom: 8,
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
  orderItemsList: {
    marginBottom: 8,
  },
  orderFoodItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  orderStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '500',
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
});

export default RestaurantDetailsScreen;