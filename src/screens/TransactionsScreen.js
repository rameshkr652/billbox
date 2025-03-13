// src/screens/TransactionsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import Colors from '../constants/colors';

const TransactionsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    allEmails,
    platformColor,
    filterOptions
  } = route.params || {};

  // State for table data
  const [transactions, setTransactions] = useState([]);
  const [displayedTransactions, setDisplayedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State for filtering and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('restaurants'); // 'restaurants', 'foodItems', 'date'
  
  // State for filters
  const [appliedFilters, setAppliedFilters] = useState({
    restaurant: null,
    foodItem: null,
    date: {
      start: null,
      end: null
    }
  });
  
  // State for custom date picker
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [markedDates, setMarkedDates] = useState({});

  // Process emails into transaction data
  useEffect(() => {
    if (allEmails && Array.isArray(allEmails)) {
      // Transform emails into a more table-friendly format
      const processedData = allEmails
        .filter(email => {
          // Filter out invalid records (unknown restaurant or N/A price)
          return email.orderDetails?.restaurantName && 
                 email.orderDetails?.restaurantName !== 'Unknown Restaurant' &&
                 email.orderDetails?.totalPrice && 
                 email.orderDetails?.totalPrice !== 'N/A';
        })
        .map(email => {
          // Get restaurant name and order info
          const restaurant = email.orderDetails?.restaurantName || '';
          const orderId = email.orderDetails?.orderId || email.id.substring(0, 8);
          const totalPrice = email.orderDetails?.totalPrice || '';
          const date = email.date ? new Date(email.date) : new Date();
          const formattedDate = date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          // Keep original order items for display
          const orderItems = email.orderDetails?.orderItems || [];
          
          // Extract food items without quantity for filtering
          const foodItemsForFiltering = orderItems.map(item => {
            const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
            return match && match[1] ? match[1].trim() : item;
          });
          
          return {
            id: email.id,
            orderId,
            restaurant,
            date,
            formattedDate,
            totalPrice,
            orderItems,
            foodItemsForFiltering,
            month: date.getMonth(),
            year: date.getFullYear(),
            email // Keep original email data for details
          };
        });
      
      setTransactions(processedData);
      setLoading(false);
    }
  }, [allEmails]);

  // Apply sorting, filtering, and searching
  useEffect(() => {
    if (transactions.length === 0) {
      setDisplayedTransactions([]);
      return;
    }
    
    let result = [...transactions];
    
    // Apply restaurant filter
    if (appliedFilters.restaurant) {
      result = result.filter(item => 
        item.restaurant === appliedFilters.restaurant
      );
    }
    
    // Apply food item filter
    if (appliedFilters.foodItem) {
      result = result.filter(item => 
        item.foodItemsForFiltering && item.foodItemsForFiltering.some(food => 
          food.toLowerCase().includes(appliedFilters.foodItem.toLowerCase())
        )
      );
    }
    
    // Apply date range filter
    if (appliedFilters.date.start && appliedFilters.date.end) {
      const startDate = new Date(appliedFilters.date.start);
      const endDate = new Date(appliedFilters.date.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      result = result.filter(item => 
        item.date >= startDate && item.date <= endDate
      );
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.restaurant.toLowerCase().includes(query) ||
        item.orderId.toLowerCase().includes(query) ||
        (item.orderItems && item.orderItems.some(food => 
          food.toLowerCase().includes(query)
        )) ||
        item.formattedDate.toLowerCase().includes(query) ||
        (item.totalPrice && item.totalPrice.toLowerCase().includes(query))
      );
    }
    
    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];
        
        // Handle string comparisons
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Handle date objects
        if (sortConfig.key === 'date') {
          aValue = a.date.getTime();
          bValue = b.date.getTime();
        }
        
        // Handle price as numeric value
        if (sortConfig.key === 'totalPrice') {
          aValue = parseFloat(a.totalPrice.replace(/[^\d.-]/g, '') || 0);
          bValue = parseFloat(b.totalPrice.replace(/[^\d.-]/g, '') || 0);
        }
        
        // Handle sorting direction
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    setDisplayedTransactions(result);
  }, [transactions, appliedFilters, searchQuery, sortConfig]);
  
  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    
    return (
      <Icon 
        name={sortConfig.direction === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
        size={14} 
        color={platformColor} 
        style={styles.sortIcon}
      />
    );
  };
  
  // Reset all filters
  const resetAllFilters = () => {
    setAppliedFilters({
      restaurant: null,
      foodItem: null,
      date: {
        start: null,
        end: null
      }
    });
    setCustomDateRange({ start: null, end: null });
    setSearchQuery('');
    updateMarkedDates({ start: null, end: null });
  };
  
  // Open filter modal
  const openFilterModal = () => {
    setShowFilterModal(true);
  };
  
  // Update marked dates for calendar
  const updateMarkedDates = (range) => {
    const newMarkedDates = {};
    
    // Mark start date
    if (range.start) {
      const startDateStr = range.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        startingDay: true,
        color: platformColor
      };
    }
    
    // Mark end date
    if (range.end) {
      const endDateStr = range.end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        selected: true,
        endingDay: true,
        color: platformColor
      };
    }
    
    // Mark dates in between
    if (range.start && range.end) {
      const start = new Date(range.start);
      const end = new Date(range.end);
      
      // Mark dates in the range
      const currentDate = new Date(start);
      currentDate.setDate(currentDate.getDate() + 1); // Start from next day
      
      while (currentDate < end) {
        const dateString = currentDate.toISOString().split('T')[0];
        newMarkedDates[dateString] = {
          selected: true,
          color: platformColor + '80'  // Add transparency
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    setMarkedDates(newMarkedDates);
  };
  
  // Show date picker
  const showDatePicker = (mode) => {
    setDatePickerMode(mode);
    setDatePickerVisible(true);
  };
  
  // Handle date selection in calendar
  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    
    if (datePickerMode === 'start') {
      setCustomDateRange(prev => {
        const updatedRange = {
          ...prev,
          start: selectedDate,
          // If end date exists and is before new start date, reset end date
          end: prev.end && prev.end < selectedDate ? null : prev.end
        };
        updateMarkedDates(updatedRange);
        return updatedRange;
      });
      // Switch to end date selection if we haven't selected an end date yet
      if (!customDateRange.end) {
        setDatePickerMode('end');
      } else {
        setDatePickerVisible(false);
      }
    } else {
      setCustomDateRange(prev => {
        const updatedRange = {
          ...prev,
          end: selectedDate
        };
        updateMarkedDates(updatedRange);
        return updatedRange;
      });
      setDatePickerVisible(false);
    }
  };
  
  // Apply custom date range
  const applyDateRange = () => {
    if (customDateRange.start && customDateRange.end) {
      setAppliedFilters(prev => ({
        ...prev,
        date: {
          start: customDateRange.start,
          end: customDateRange.end
        }
      }));
    }
  };
  
  // Apply a restaurant filter
  const applyRestaurantFilter = (restaurant) => {
    setAppliedFilters(prev => ({
      ...prev,
      restaurant
    }));
  };
  
  // Apply a food item filter
  const applyFoodItemFilter = (foodItem) => {
    setAppliedFilters(prev => ({
      ...prev,
      foodItem
    }));
  };
  
  // Render table header
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <TouchableOpacity 
        style={[styles.tableHeaderCell, { flex: 1.5 }]}
        onPress={() => handleSort('date')}
      >
        <Text style={styles.tableHeaderText}>Date {getSortIndicator('date')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tableHeaderCell, { flex: 2 }]}
        onPress={() => handleSort('restaurant')}
      >
        <Text style={styles.tableHeaderText}>Restaurant {getSortIndicator('restaurant')}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tableHeaderCell, { flex: 1.2 }]}
        onPress={() => handleSort('totalPrice')}
      >
        <Text style={styles.tableHeaderText}>Amount {getSortIndicator('totalPrice')}</Text>
      </TouchableOpacity>
    </View>
  );
  
  // Render table row
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.tableRow}
      onPress={() => navigation.navigate('OrderDetails', { order: item })}
    >
      <View style={[styles.tableCell, { flex: 1.5 }]}>
        <Text style={styles.cellText}>{item.formattedDate}</Text>
      </View>
      
      <View style={[styles.tableCell, { flex: 2 }]}>
        <Text style={styles.cellText} numberOfLines={1}>{item.restaurant}</Text>
        <Text style={styles.cellSubtext} numberOfLines={1}>
          {item.orderItems && item.orderItems.length > 0
            ? item.orderItems.join(', ')
            : 'No items'}
        </Text>
      </View>
      
      <View style={[styles.tableCell, { flex: 1.2 }]}>
        <Text style={styles.cellText}>{item.totalPrice}</Text>
      </View>
    </TouchableOpacity>
  );
  
  // Render active filters as chips
  const renderFilterChips = () => {
    const hasFilters = appliedFilters.restaurant || 
                      appliedFilters.foodItem || 
                      (appliedFilters.date.start && appliedFilters.date.end);
    
    if (!hasFilters) return null;
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    };
    
    return (
      <View style={styles.filterChipsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Restaurant Filter */}
          {appliedFilters.restaurant && (
            <TouchableOpacity 
              style={styles.filterChip}
              onPress={() => setAppliedFilters(prev => ({ ...prev, restaurant: null }))}
            >
              <Text style={styles.filterChipText}>
                Restaurant: {appliedFilters.restaurant}
              </Text>
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          )}
          
          {/* Food Item Filter */}
          {appliedFilters.foodItem && (
            <TouchableOpacity 
              style={styles.filterChip}
              onPress={() => setAppliedFilters(prev => ({ ...prev, foodItem: null }))}
            >
              <Text style={styles.filterChipText}>
                Food: {appliedFilters.foodItem}
              </Text>
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          )}
          
          {/* Date Range Filter */}
          {appliedFilters.date.start && appliedFilters.date.end && (
            <TouchableOpacity 
              style={styles.filterChip}
              onPress={() => {
                setAppliedFilters(prev => ({ ...prev, date: { start: null, end: null } }));
                setCustomDateRange({ start: null, end: null });
                updateMarkedDates({ start: null, end: null });
              }}
            >
              <Text style={styles.filterChipText}>
                Date: {formatDate(appliedFilters.date.start)} - {formatDate(appliedFilters.date.end)}
              </Text>
              <Icon name="close" size={16} color="#666" />
            </TouchableOpacity>
          )}
          
          {/* Clear All */}
          <TouchableOpacity 
            style={[styles.filterChip, styles.clearAllChip]}
            onPress={resetAllFilters}
          >
            <Text style={[styles.filterChipText, { color: Colors.accent }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };
  
  // Render the restaurant filter tab
  const renderRestaurantFilterTab = () => {
    const restaurants = filterOptions?.restaurants || [];
    
    return (
      <ScrollView style={styles.filterTabContent}>
        {restaurants.map((restaurant, index) => (
          <TouchableOpacity
            key={`restaurant-${index}`}
            style={[
              styles.filterOption,
              appliedFilters.restaurant === restaurant && styles.filterOptionSelected
            ]}
            onPress={() => applyRestaurantFilter(restaurant === appliedFilters.restaurant ? null : restaurant)}
          >
            <Text style={styles.filterOptionText}>{restaurant}</Text>
            {appliedFilters.restaurant === restaurant && (
              <Icon name="check" size={18} color={platformColor} />
            )}
          </TouchableOpacity>
        ))}
        {restaurants.length === 0 && (
          <Text style={styles.emptyListText}>No restaurants available</Text>
        )}
      </ScrollView>
    );
  };
  
  // Render the food items filter tab
  const renderFoodItemFilterTab = () => {
    const foodItems = filterOptions?.foodItems || [];
    
    return (
      <ScrollView style={styles.filterTabContent}>
        {foodItems.map((foodItem, index) => (
          <TouchableOpacity
            key={`food-${index}`}
            style={[
              styles.filterOption,
              appliedFilters.foodItem === foodItem && styles.filterOptionSelected
            ]}
            onPress={() => applyFoodItemFilter(foodItem === appliedFilters.foodItem ? null : foodItem)}
          >
            <Text style={styles.filterOptionText}>{foodItem}</Text>
            {appliedFilters.foodItem === foodItem && (
              <Icon name="check" size={18} color={platformColor} />
            )}
          </TouchableOpacity>
        ))}
        {foodItems.length === 0 && (
          <Text style={styles.emptyListText}>No food items available</Text>
        )}
      </ScrollView>
    );
  };
  
  // Render the date filter tab
  const renderDateFilterTab = () => {
    return (
      <View style={styles.filterTabContent}>
        <View style={styles.dateRangeContainer}>
          <Text style={styles.dateRangeTitle}>Select Date Range</Text>
          
          <View style={styles.dateInputsContainer}>
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => showDatePicker('start')}
            >
              <Icon name="event" size={18} color={platformColor} style={styles.dateInputIcon} />
              <Text style={[
                styles.dateInputText,
                !customDateRange.start && styles.dateInputPlaceholder
              ]}>
                {customDateRange.start 
                  ? customDateRange.start.toLocaleDateString()
                  : 'Start Date'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.dateRangeSeparator}>to</Text>
            
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => showDatePicker('end')}
            >
              <Icon name="event" size={18} color={platformColor} style={styles.dateInputIcon} />
              <Text style={[
                styles.dateInputText,
                !customDateRange.end && styles.dateInputPlaceholder
              ]}>
                {customDateRange.end 
                  ? customDateRange.end.toLocaleDateString()
                  : 'End Date'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[
              styles.applyDateButton,
              { backgroundColor: platformColor },
              (!customDateRange.start || !customDateRange.end) && styles.disabledButton
            ]}
            onPress={applyDateRange}
            disabled={!customDateRange.start || !customDateRange.end}
          >
            <Text style={styles.applyDateButtonText}>Apply Date Range</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.clearDateButton}
            onPress={() => {
              setCustomDateRange({ start: null, end: null });
              setAppliedFilters(prev => ({
                ...prev,
                date: { start: null, end: null }
              }));
              updateMarkedDates({ start: null, end: null });
            }}
          >
            <Text style={styles.clearDateButtonText}>Clear Date Filter</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.quickDateFilters}>
          <Text style={styles.quickDateFiltersTitle}>Quick Filters</Text>
          
          <View style={styles.quickDateButtonsRow}>
            <TouchableOpacity 
              style={styles.quickDateButton}
              onPress={() => {
                const today = new Date();
                const start = new Date(today);
                const end = new Date(today);
                
                setCustomDateRange({ start, end });
                setAppliedFilters(prev => ({
                  ...prev,
                  date: { start, end }
                }));
                updateMarkedDates({ start, end });
              }}
            >
              <Text style={styles.quickDateButtonText}>Today</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickDateButton}
              onPress={() => {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                
                setCustomDateRange({ start: startOfMonth, end: endOfMonth });
                setAppliedFilters(prev => ({
                  ...prev,
                  date: { start: startOfMonth, end: endOfMonth }
                }));
                updateMarkedDates({ start: startOfMonth, end: endOfMonth });
              }}
            >
              <Text style={styles.quickDateButtonText}>This Month</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickDateButtonsRow}>
            <TouchableOpacity 
              style={styles.quickDateButton}
              onPress={() => {
                const now = new Date();
                // Last month
                const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                
                setCustomDateRange({ start: startDate, end: endDate });
                setAppliedFilters(prev => ({
                  ...prev,
                  date: { start: startDate, end: endDate }
                }));
                updateMarkedDates({ start: startDate, end: endDate });
              }}
            >
              <Text style={styles.quickDateButtonText}>Last Month</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickDateButton}
              onPress={() => {
                const now = new Date();
                // Last 3 months
                const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                const endDate = new Date(now);
                
                setCustomDateRange({ start: startDate, end: endDate });
                setAppliedFilters(prev => ({
                  ...prev,
                  date: { start: startDate, end: endDate }
                }));
                updateMarkedDates({ start: startDate, end: endDate });
              }}
            >
              <Text style={styles.quickDateButtonText}>Last 3 Months</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: platformColor }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transactions</Text>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
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
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={openFilterModal}
          >
            <Icon name="filter-list" size={24} color={platformColor} />
            {(appliedFilters.restaurant || appliedFilters.foodItem || 
             (appliedFilters.date.start && appliedFilters.date.end)) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {(appliedFilters.restaurant ? 1 : 0) + 
                   (appliedFilters.foodItem ? 1 : 0) + 
                   ((appliedFilters.date.start && appliedFilters.date.end) ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Active filters display */}
        {renderFilterChips()}
        
        {loading ? (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={platformColor} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
            ) : (
            <>            
                <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                    Showing {displayedTransactions.length} of {transactions.length} transactions
                </Text>
                </View>
                
                {/* Table with transactions */}
                {displayedTransactions.length > 0 ? (
                <FlatList
                    data={displayedTransactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderTransactionItem}
                    ListHeaderComponent={renderTableHeader}
                    stickyHeaderIndices={[0]}
                />
                ) : (
                <>
                    <View style={styles.emptyContainer}>
                    <Icon name="receipt-long" size={60} color="#ddd" />
                    <Text style={styles.emptyText}>No transactions found</Text>
                    <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                    <TouchableOpacity 
                        style={[styles.resetButton, { backgroundColor: platformColor }]}
                        onPress={resetAllFilters}
                    >
                        <Text style={styles.resetAllFiltersButtonText}>Reset All Filters</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.applyFiltersButton, { backgroundColor: platformColor }]}
                        onPress={() => setShowFilterModal(false)}
                    >
                        <Text style={styles.applyFiltersButtonText}>Apply</Text>
                    </TouchableOpacity>
                    </View>
                    
                    <Modal
                    visible={datePickerVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setDatePickerVisible(false)}
                    >
                    <View style={styles.datePickerModalContainer}>
                        <View style={styles.datePickerModalContent}>
                        <View style={styles.datePickerModalHeader}>
                            <Text style={styles.datePickerModalTitle}>
                            Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
                            </Text>
                            <TouchableOpacity 
                            onPress={() => setDatePickerVisible(false)}
                            style={styles.closeButton}
                            >
                            <Icon name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>
                        
                        <Calendar
                            current={
                            datePickerMode === 'start'
                                ? (customDateRange.start?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
                                : (customDateRange.end?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
                            }
                            minDate={
                            datePickerMode === 'start' 
                                ? undefined 
                                : customDateRange.start ? customDateRange.start.toISOString().split('T')[0] : undefined
                            }
                            maxDate={new Date().toISOString().split('T')[0]}
                            onDayPress={handleDateSelect}
                            markedDates={markedDates}
                            markingType="period"
                            theme={{
                            selectedDayBackgroundColor: platformColor,
                            todayTextColor: platformColor,
                            arrowColor: platformColor,
                            dotColor: platformColor,
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '500',
                            textDisabledColor: '#d9e1e8',
                            }}
                        />
                        </View>
                    </View>
                    </Modal>
                </>
                )}
            </>
            )}
 </View>
 </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', 
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  filterChipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    color: '#333',
    marginRight: 5,
  },
  clearAllChip: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableHeaderCell: {
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  sortIcon: {
    marginLeft: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    color: '#333',
  },
  cellSubtext: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
    marginBottom: 20,
  },
  resetButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyListText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterOptionSelected: {
    backgroundColor: '#f8f8f8',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  // Filter tabs
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomWidth: 2,
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabContent: {
    maxHeight: 300,
  },
  // Date filter styles
  dateRangeContainer: {
    padding: 15,
  },
  dateRangeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dateInputIcon: {
    marginRight: 8,
  },
  dateInputText: {
    fontSize: 14,
    color: '#333',
  },
  dateInputPlaceholder: {
    color: '#999',
  },
  dateRangeSeparator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 10,
  },
  applyDateButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  applyDateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  clearDateButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  clearDateButtonText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  disabledButton: {
    opacity: 0.5,
  },
  quickDateFilters: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  quickDateFiltersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  quickDateButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quickDateButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  quickDateButtonText: {
    fontSize: 13,
    color: '#555',
  },
  datePickerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  datePickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  // Modal footer
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetAllFiltersButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  resetAllFiltersButtonText: {
    color: Colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  applyFiltersButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default TransactionsScreen