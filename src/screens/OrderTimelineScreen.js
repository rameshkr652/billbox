// src/screens/OrderTimelineScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions,
  TextInput
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as AccountService from '../services/AccountService';
import * as StorageService from '../services/StorageService';

const { width, height } = Dimensions.get('window');

const OrderTimelineScreen = ({ navigation, route }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [ordersForSelectedDate, setOrdersForSelectedDate] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Loading your food journey...");
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'memory'
  const [allOrders, setAllOrders] = useState([]);
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [platformColor, setPlatformColor] = useState(Colors.primary);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of memories per page

  // Get platform color from route params or use default
  useEffect(() => {
    const color = route.params?.platformColor || Colors.primary;
    setPlatformColor(color);
  }, [route.params]);

  // Load current account and order data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadCurrentAccount();
      loadOrderData();
    }, [])
  );

  // Get current account
  const loadCurrentAccount = async () => {
    try {
      const account = await AccountService.getCurrentAccount();
      setCurrentAccount(account);
    } catch (error) {
      console.error("Error loading current account:", error);
    }
  };

  // Main function to load all order data
  const loadOrderData = async () => {
    try {
      setIsLoading(true);
      setLoadingText("Discovering your food journey...");
      
      const accounts = await AccountService.getAccounts();
      const platforms = ['swiggy', 'zomato'];
      const marked = {};
      const allOrdersData = [];
      
      for (const account of accounts) {
        setLoadingText(`Loading orders for ${account.email}...`);
        for (const platform of platforms) {
          const storageKey = `emails_${platform}_${account.email}`;
          const emailsJson = await AsyncStorage.getItem(storageKey);
          
          if (emailsJson) {
            const emails = JSON.parse(emailsJson);
            emails.forEach(email => {
              if (email.date) {
                const orderDate = new Date(email.date);
                const dateStr = orderDate.toISOString().split('T')[0];
                
                if (!marked[dateStr]) {
                  marked[dateStr] = { marked: true, dotColor: getPlatformColor(platform) };
                } else if (marked[dateStr].dotColor !== getPlatformColor(platform)) {
                  marked[dateStr] = { ...marked[dateStr], dotColor: platformColor, marked: true };
                }
                
                let formattedPrice = email.orderDetails?.totalPrice || 'N/A';
                if (formattedPrice === 'N/A' && email.subject && email.subject.match(/[₹₨Rs\.]?\s*\d+/)) {
                  const priceMatch = email.subject.match(/[₹₨Rs\.]?\s*(\d+)/);
                  if (priceMatch && priceMatch[1]) formattedPrice = `₹${priceMatch[1]}`;
                }
                
                allOrdersData.push({
                  id: email.id,
                  date: orderDate,
                  dateStr,
                  platform,
                  restaurant: email.orderDetails?.restaurantName || 'Unknown Restaurant',
                  items: email.orderDetails?.orderItems || [],
                  totalPrice: formattedPrice,
                  orderStatus: email.orderDetails?.orderStatus || 'Order Placed',
                  accountEmail: account.email,
                  subject: email.subject,
                  orderData: email
                });
              }
            });
          }
        }
      }
      
      setMarkedDates(marked);
      allOrdersData.sort((a, b) => b.date - a.date);
      setAllOrders(allOrdersData);
      prepareMemoryData(allOrdersData);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading order data:", error);
      setIsLoading(false);
      setLoadingText("Error loading order data");
    }
  };

  // Prepare memory data
  const prepareMemoryData = (orders) => {
    try {
      const today = new Date();
      const memories = [];
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      const foundYears = new Set();

      // "On This Day" memories
      orders.forEach(order => {
        const orderDate = new Date(order.date);
        const orderYear = orderDate.getFullYear();
        const orderMonth = orderDate.getMonth();
        const orderDay = orderDate.getDate();
        
        if (orderMonth === currentMonth && orderDay === currentDay && orderYear !== today.getFullYear() && !foundYears.has(orderYear)) {
          foundYears.add(orderYear);
          const ordersOnThisDay = orders.filter(o => {
            const d = new Date(o.date);
            return d.getDate() === orderDay && d.getMonth() === orderMonth && d.getFullYear() === orderYear;
          });
          memories.push({
            id: `memory-${orderYear}`,
            type: 'onThisDay',
            year: orderYear,
            yearsAgo: today.getFullYear() - orderYear,
            date: orderDate,
            orders: ordersOnThisDay
          });
        }
      });

      // "First Time" memories
      const restaurantCountMap = {};
      orders.forEach(order => {
        if (order.restaurant && order.restaurant !== 'Unknown Restaurant') {
          if (!restaurantCountMap[order.restaurant]) {
            restaurantCountMap[order.restaurant] = { count: 1, firstOrder: order };
          } else {
            restaurantCountMap[order.restaurant].count += 1;
            if (new Date(order.date) < new Date(restaurantCountMap[order.restaurant].firstOrder.date)) {
              restaurantCountMap[order.restaurant].firstOrder = order;
            }
          }
        }
      });

      Object.keys(restaurantCountMap)
        .filter(restaurant => restaurantCountMap[restaurant].count >= 3)
        .sort((a, b) => restaurantCountMap[b].count - restaurantCountMap[a].count)
        .forEach(restaurant => {
          const firstOrderDate = new Date(restaurantCountMap[restaurant].firstOrder.date);
          const daysSince = Math.floor((today - firstOrderDate) / (1000 * 60 * 60 * 24));
          if (daysSince > 30) {
            memories.push({
              id: `first-${restaurant}`,
              type: 'firstTime',
              restaurant,
              orderCount: restaurantCountMap[restaurant].count,
              date: firstOrderDate,
              daysSince,
              order: restaurantCountMap[restaurant].firstOrder
            });
          }
        });

      memories.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'onThisDay' ? -1 : 1;
        if (a.type === 'onThisDay') return b.year - a.year;
        return b.orderCount - a.orderCount;
      });

      setMemories(memories);
      setFilteredMemories(memories); // Initially set filtered to all memories
    } catch (error) {
      console.error("Error preparing memory data:", error);
    }
  };

  // Handle date selection in calendar view
  const handleDateSelect = (day) => {
    const today = new Date();
    const selected = new Date(day.dateString);
    if (selected > today) return; // Prevent future date selection
    setSelectedDate(day.dateString);
    const ordersForDate = allOrders.filter(order => order.dateStr === day.dateString);
    setOrdersForSelectedDate(ordersForDate);
  };

  // Search memories by restaurant
  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
    if (!query.trim()) {
      setFilteredMemories(memories);
    } else {
      const filtered = memories.filter(memory => 
        memory.type === 'firstTime' && memory.restaurant.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredMemories(filtered);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredMemories.length / itemsPerPage);
  const paginatedMemories = filteredMemories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get platform color
  const getPlatformColor = (platform) => {
    switch(platform.toLowerCase()) {
      case 'swiggy': return Colors.swiggy;
      case 'zomato': return Colors.zomato;
      case 'flipkart': return Colors.flipkart;
      case 'amazon': return Colors.amazon;
      default: return platformColor;
    }
  };

  // Format price
  const formatPrice = (price) => {
    if (!price || price === 'N/A') return 'N/A';
    if (price.includes('₹')) return price;
    const numericPrice = parseFloat(price.replace(/[^\d.-]/g, '') || 0);
    if (isNaN(numericPrice)) return price;
    return `₹${numericPrice.toFixed(2)}`;
  };

  // Format date
  const formatDate = (date, includeYear = true) => {
    if (!date) return '';
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    if (includeYear) options.year = 'numeric';
    return date.toLocaleDateString('en-US', options);
  };

  // Get ordinal suffix
  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  // Format date with ordinal
  const formatDateWithOrdinal = (date) => {
    const day = date.getDate();
    const suffix = getOrdinalSuffix(day);
    return `${day}${suffix} ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  };

  // Get status icon
  const getStatusIcon = (status) => {
    if (!status) return 'receipt';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('deliver')) return 'check-circle';
    if (statusLower.includes('confirm')) return 'assignment-turned-in';
    if (statusLower.includes('prepar')) return 'restaurant';
    if (statusLower.includes('ship')) return 'local-shipping';
    if (statusLower.includes('cancel')) return 'cancel';
    if (statusLower.includes('refund')) return 'replay';
    return 'receipt';
  };

  // Render calendar order item
  const renderCalendarOrderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderItem}
      onPress={() => navigation.navigate('OrderDetails', { 
        order: {
          restaurant: item.restaurant,
          orderId: item.orderData?.orderDetails?.orderId || '',
          orderItems: item.items,
          totalPrice: item.totalPrice,
          date: item.date,
          email: item.orderData
        }
      })}
    >
      <View style={[styles.platformIndicator, { backgroundColor: getPlatformColor(item.platform) }]} />
      <View style={styles.orderDetails}>
        <Text style={styles.restaurantName}>{item.restaurant}</Text>
        <Text style={styles.orderItems}>
          {item.items && item.items.length > 0 
            ? item.items.slice(0, 2).join(', ') + (item.items.length > 2 ? ` +${item.items.length - 2} more` : '')
            : 'No items found'}
        </Text>
      </View>
      <View style={styles.orderPrice}>
        <Icon name={getStatusIcon(item.orderStatus)} size={16} color="#888" style={styles.statusIcon} />
        <Text style={styles.priceText}>{formatPrice(item.totalPrice)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render memory item
  const renderMemoryItem = ({ item }) => {
    if (item.type === 'onThisDay') return renderOnThisDayMemory(item);
    if (item.type === 'firstTime') return renderFirstTimeMemory(item);
    return null;
  };

  // Render "On This Day" memory
  const renderOnThisDayMemory = (memory) => (
    <View style={styles.memoryCard}>
      <View style={styles.memoryHeader}>
        <Icon name="event-note" size={24} color={platformColor} />
        <Text style={styles.memoryTitle}>On this day, {memory.yearsAgo} year{memory.yearsAgo !== 1 ? 's' : ''} ago</Text>
      </View>
      <Text style={styles.memoryDate}>{formatDate(memory.date)}</Text>
      <View style={styles.memoryOrders}>
        {memory.orders.map((order, index) => (
          <TouchableOpacity 
            key={`memory-order-${index}`}
            style={styles.memoryOrderItem}
            onPress={() => navigation.navigate('OrderDetails', { 
              order: {
                restaurant: order.restaurant,
                orderId: order.orderData?.orderDetails?.orderId || '',
                orderItems: order.items,
                totalPrice: order.totalPrice,
                date: order.date,
                email: order.orderData
              }
            })}
          >
            <View style={[styles.memoryPlatformIndicator, { backgroundColor: getPlatformColor(order.platform) }]} />
            <View style={styles.memoryOrderDetails}>
              <Text style={styles.memoryRestaurantName}>{order.restaurant}</Text>
              <Text style={styles.memoryOrderItems}>
                {order.items && order.items.length > 0 
                  ? order.items.slice(0, 2).join(', ') + (order.items.length > 2 ? ` +${order.items.length - 2} more` : '')
                  : 'No items found'}
              </Text>
            </View>
            <Text style={styles.memoryOrderPrice}>{formatPrice(order.totalPrice)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render "First Time" memory
  const renderFirstTimeMemory = (memory) => (
    <View style={styles.memoryCard}>
      <View style={styles.memoryHeader}>
        <Icon name="star" size={24} color={platformColor} />
        <Text style={styles.memoryTitle}>First time at {memory.restaurant}</Text>
      </View>
      <Text style={styles.memoryDescription}>
        You first ordered from {memory.restaurant} on {formatDateWithOrdinal(memory.date)}.
        Since then, you've ordered {memory.orderCount} time{memory.orderCount !== 1 ? 's' : ''}!
      </Text>
      <TouchableOpacity 
        style={styles.memoryFirstOrder}
        onPress={() => navigation.navigate('OrderDetails', { 
          order: {
            restaurant: memory.order.restaurant,
            orderId: memory.order.orderData?.orderDetails?.orderId || '',
            orderItems: memory.order.items,
            totalPrice: memory.order.totalPrice,
            date: memory.order.date,
            email: memory.order.orderData
          }
        })}
      >
        <View style={styles.memoryFirstOrderHeader}>
          <Text style={styles.memoryFirstOrderTitle}>Your first order:</Text>
          <Text style={styles.memoryFirstOrderDate}>{formatDate(memory.date, true)}</Text>
        </View>
        {memory.order.items && memory.order.items.length > 0 && (
          <View style={styles.memoryFirstOrderItems}>
            {memory.order.items.map((item, index) => (
              <Text key={`first-item-${index}`} style={styles.memoryFirstOrderItem}>• {item}</Text>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render empty state
  const renderEmptyState = (mode) => {
    let title, message, icon;
    switch(mode) {
      case 'calendar':
        title = "No orders found";
        message = "Select a date with orders or try loading orders from other platforms.";
        icon = "event-busy";
        break;
      case 'memory':
        title = "No memories yet";
        message = searchQuery ? "No matching restaurants found." : "As you continue ordering, we'll show you interesting memories.";
        icon = "auto-awesome";
        break;
      default:
        title = "No data available";
        message = "Try adding more order data to see your food journey.";
        icon = "inbox";
    }
    return (
      <View style={styles.emptyState}>
        <Icon name={icon} size={60} color="#ddd" />
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateMessage}>{message}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={platformColor} />
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: platformColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Time Machine</Text>
        </View>
        
        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'calendar' && [styles.activeToggle, { borderColor: platformColor }]]} 
            onPress={() => setViewMode('calendar')}
          >
            <Icon name="calendar-today" size={18} color={viewMode === 'calendar' ? platformColor : '#666'} style={styles.toggleIcon} />
            <Text style={[styles.toggleText, viewMode === 'calendar' && { color: platformColor, fontWeight: 'bold' }]}>Calendar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'memory' && [styles.activeToggle, { borderColor: platformColor }]]} 
            onPress={() => setViewMode('memory')}
          >
            <Icon name="auto-awesome" size={18} color={viewMode === 'memory' ? platformColor : '#666'} style={styles.toggleIcon} />
            <Text style={[styles.toggleText, viewMode === 'memory' && { color: platformColor, fontWeight: 'bold' }]}>Memories</Text>
          </TouchableOpacity>
        </View>
        
        {/* Loading state */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={platformColor} />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        ) : (
          <>
            {/* Calendar View */}
            {viewMode === 'calendar' && (
              <ScrollView style={styles.calendarView}>
                <View style={styles.calendarContainer}>
                  <Calendar
                    markedDates={{
                      ...markedDates,
                      [selectedDate]: { ...markedDates[selectedDate], selected: true, selectedColor: platformColor }
                    }}
                    onDayPress={handleDateSelect}
                    maxDate={new Date().toISOString().split('T')[0]} // Restrict future dates
                    theme={{
                      selectedDayBackgroundColor: platformColor,
                      todayTextColor: platformColor,
                      arrowColor: platformColor,
                      dotColor: platformColor,
                      'stylesheet.calendar.header': {
                        dayTextAtIndex0: { color: 'red' },
                        dayTextAtIndex6: { color: 'blue' }
                      }
                    }}
                  />
                </View>
                {selectedDate && (
                  <View style={styles.selectedDateOrders}>
                    <Text style={styles.selectedDateTitle}>
                      {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </Text>
                    {ordersForSelectedDate.length > 0 ? (
                      <FlatList
                        data={ordersForSelectedDate}
                        keyExtractor={(item) => item.id}
                        renderItem={renderCalendarOrderItem}
                        scrollEnabled={false}
                      />
                    ) : (
                      <Text style={styles.noOrdersText}>No orders on this date</Text>
                    )}
                  </View>
                )}
                {!selectedDate && Object.keys(markedDates).length === 0 && renderEmptyState('calendar')}
              </ScrollView>
            )}
            
            {/* Memory View */}
            {viewMode === 'memory' && (
              <View style={styles.memoryView}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by restaurant name..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                />
                {paginatedMemories.length > 0 ? (
                  <>
                    <FlatList
                      data={paginatedMemories}
                      keyExtractor={(item) => item.id}
                      renderItem={renderMemoryItem}
                      contentContainerStyle={styles.memoriesList}
                    />
                    <View style={styles.pagination}>
                      <TouchableOpacity
                        style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
                        onPress={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <Icon name="chevron-left" size={24} color={currentPage === 1 ? '#ccc' : platformColor} />
                      </TouchableOpacity>
                      <Text style={styles.pageText}>{`Page ${currentPage} of ${totalPages}`}</Text>
                      <TouchableOpacity
                        style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
                        onPress={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <Icon name="chevron-right" size={24} color={currentPage === totalPages ? '#ccc' : platformColor} />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  renderEmptyState('memory')
                )}
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  viewToggle: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee', paddingHorizontal: 10 },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeToggle: { borderBottomWidth: 2 },
  toggleIcon: { marginRight: 6 },
  toggleText: { fontSize: 14, color: '#666' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666', textAlign: 'center' },
  calendarView: { flex: 1 },
  calendarContainer: { backgroundColor: '#fff', margin: 10, borderRadius: 10, padding: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  selectedDateOrders: { padding: 10, marginTop: 10 },
  selectedDateTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, padding: 10, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1, elevation: 1 },
  orderItem: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 10, borderRadius: 10, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
  platformIndicator: { width: 4, borderRadius: 2, marginRight: 12 },
  orderDetails: { flex: 1 },
  restaurantName: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  orderItems: { fontSize: 13, color: '#666' },
  orderPrice: { alignItems: 'flex-end', justifyContent: 'center' },
  statusIcon: { marginBottom: 4 },
  priceText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  noOrdersText: { fontSize: 14, color: '#888', fontStyle: 'italic', textAlign: 'center', padding: 20 },
  memoryView: { flex: 1 },
  searchInput: { backgroundColor: '#fff', padding: 10, margin: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  memoriesList: { padding: 10 },
  memoryCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  memoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  memoryTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 10 },
  memoryDate: { fontSize: 14, color: '#555', marginBottom: 16 },
  memoryDescription: { fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 20 },
  memoryOrders: { marginTop: 8 },
  memoryOrderItem: { flexDirection: 'row', backgroundColor: '#f9f9f9', marginVertical: 6, borderRadius: 8, padding: 12 },
  memoryPlatformIndicator: { width: 4, borderRadius: 2, marginRight: 12 },
  memoryOrderDetails: { flex: 1 },
  memoryRestaurantName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  memoryOrderItems: { fontSize: 12, color: '#666' },
  memoryOrderPrice: { fontSize: 13, fontWeight: 'bold', color: '#333', alignSelf: 'center' },
  memoryFirstOrder: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginTop: 8 },
  memoryFirstOrderHeader: { marginBottom: 8 },
  memoryFirstOrderTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  memoryFirstOrderDate: { fontSize: 13, color: '#666', marginBottom: 8 },
  memoryFirstOrderItems: { marginTop: 4 },
  memoryFirstOrderItem: { fontSize: 13, color: '#555', marginBottom: 4, paddingLeft: 4 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10 },
  pageButton: { padding: 10 },
  disabledButton: { opacity: 0.5 },
  pageText: { fontSize: 14, color: '#333' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 30 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 16, marginBottom: 8 },
  emptyStateMessage: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 }
});

export default OrderTimelineScreen;