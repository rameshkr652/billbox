// src/screens/TransactionsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
import { advancedCombinedFoods } from '../utils/FoodPraser';

const ITEMS_PER_PAGE = 10;

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
  const [paginatedTransactions, setPaginatedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);
  
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
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [foodItemSearch, setFoodItemSearch] = useState('');
  const [normalizedFoodItems, setNormalizedFoodItems] = useState([]);
  const [tempFilters, setTempFilters] = useState({
    restaurant: null,
    foodItem: null,
    date: {
      start: null,
      end: null
    }
  });
  

  const normalizeFoodItems = (foodItems) => {
    if (!foodItems || !Array.isArray(foodItems)) return [];
    
    // Group similar food items
    const foodGroups = {};
    
    foodItems.forEach(item => {
      // Skip empty items
      if (!item) return;
      
      // Clean up the item name: remove quantities, brackets, parentheses
      let cleanName = item
        .replace(/^\d+\s*[Xx×]\s+/i, '')      // Remove "2 X" format
        .replace(/\s*\[[^\]]*\]/g, '')        // Remove [2 pieces]
        .replace(/\s*\([^\)]*\)/g, '')        // Remove (3 pcs)
        .replace(/^\d+\s+/i, '')              // Remove "2 Idli" format
        .trim();
      
      // Handle common spelling variations
      let normalizedName = cleanName.toLowerCase()
        .replace(/biriyani/i, 'biryani')
        .replace(/idly/i, 'idli');
      
      // Handle items with modifiers (like "X + Y")
      if (normalizedName.includes('+')) {
        normalizedName = normalizedName.split('+')[0].trim();
      }
      
      // Create a key for grouping - use main dish name
      // For multi-word items like "Mutton Biryani", keep the full normalized name
      const groupKey = normalizedName;
      
      // Add to food groups
      if (!foodGroups[groupKey]) {
        foodGroups[groupKey] = {
          displayName: cleanName,
          originalItems: [item],
          count: 1
        };
      } else {
        // Only add if it's a new variant
        if (!foodGroups[groupKey].originalItems.includes(item)) {
          foodGroups[groupKey].originalItems.push(item);
          foodGroups[groupKey].count++;
          
          // Use the shortest name as display name (usually the base version)
          if (cleanName.length < foodGroups[groupKey].displayName.length) {
            foodGroups[groupKey].displayName = cleanName;
          }
        }
      }
    });
    
    // Convert to array for rendering
    return Object.entries(foodGroups)
      .map(([key, data]) => ({
        key,
        displayName: data.displayName,
        originalItems: data.originalItems,
        count: data.count
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  };
  
  // Add this useEffect to process food items when filterOptions change
  useEffect(() => {
    if (filterOptions?.foodItems) {
      const normalized = normalizeFoodItems(filterOptions.foodItems);
      setNormalizedFoodItems(normalized);
    }
  }, [filterOptions]);

  // Process emails into transaction data
  useEffect(() => {
    if (allEmails && Array.isArray(allEmails)) {
      const invalidRecords = allEmails.filter(email => {
        return !email.orderDetails?.restaurantName || 
               email.orderDetails?.restaurantName === "Unknown Restaurant" || 
               !email.orderDetails?.totalPrice || 
               email.orderDetails?.totalPrice === "N/A";
      });
      
      console.log(invalidRecords);
      
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
        console.log(processedData.length)
      
      setTransactions(processedData);
      setLoading(false);
    }
  }, [allEmails]);

  // Apply sorting, filtering, and searching to get displayedTransactions
  useEffect(() => {
    if (transactions.length === 0) {
      setDisplayedTransactions([]);
      setTotalAmount(0);
      setTotalPages(1);
      return;
    }
    
    let result = [...transactions];
    
    // Apply restaurant filter
    if (appliedFilters.restaurant) {
      result = result.filter(item => 
        item.restaurant === appliedFilters.restaurant
      );
    }
    
    if (appliedFilters.foodItem) {
      result = result.filter(item => {
        if (!item.foodItemsForFiltering || !Array.isArray(item.foodItemsForFiltering)) {
          return false;
        }
        
        return item.foodItemsForFiltering.some(food => {
          // Guard against undefined values
          if (!food) return false;
          
          try {
            // Clean and normalize the food string
            const normalizedFood = typeof food === 'string' ? 
              advancedCombinedFoods(food) : '';
            console.log(normalizedFood);
            // If normalizedFood is empty or undefined, skip this item
            if (!normalizedFood) return false;
            
            // If the food contains a plus sign, only consider the main item
            const mainItem = normalizedFood.includes('+') ? 
              normalizedFood.split('+')[0].trim() : 
              normalizedFood;
            
            // Match if it's the same as our filter key or contains it
            return mainItem === appliedFilters.foodItem || 
                   mainItem.includes(appliedFilters.foodItem);
          } catch (error) {
            console.log('Error processing food item:', food, error);
            return false;
          }
        });
      });
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
    
    // Calculate total amount spent
    const total = result.reduce((sum, item) => {
      const price = parseFloat(item.totalPrice.replace(/[^\d.-]/g, '') || 0);
      return sum + price;
    }, 0);
    
    setTotalAmount(total);
    setDisplayedTransactions(result);
    setTotalPages(Math.ceil(result.length / ITEMS_PER_PAGE));
    
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [transactions, appliedFilters, searchQuery, sortConfig]);

  // Handle pagination
  useEffect(() => {
    if (displayedTransactions.length === 0) {
      setPaginatedTransactions([]);
      return;
    }
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = displayedTransactions.slice(startIndex, endIndex);
    
    setPaginatedTransactions(paginatedData);
  }, [displayedTransactions, currentPage]);
  
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
    const emptyFilters = {
      restaurant: null,
      foodItem: null,
      date: {
        start: null,
        end: null
      }
    };
    
    // Reset temp filters
    setTempFilters(emptyFilters);
    setCustomDateRange({ start: null, end: null });
    updateMarkedDates({ start: null, end: null });
    
    // If called from modal footer, don't apply yet
    if (!showFilterModal) {
      setAppliedFilters(emptyFilters);
      setSearchQuery('');
    }
  };
  
  
  // Open filter modal
  const openFilterModal = () => {
    setTempFilters({...appliedFilters});
    setShowFilterModal(true);
  };
  
  // Close filter modal
  const closeFilterModal = () => {
    setShowFilterModal(false);
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
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
      // Update custom date range visual state
      setCustomDateRange(prev => {
        const updatedRange = {
          ...prev,
          start: selectedDate,
          end: prev.end && prev.end < selectedDate ? null : prev.end
        };
        updateMarkedDates(updatedRange);
        return updatedRange;
      });
      
      // Update temp filters instead of applied filters
      setTempFilters(prev => ({
        ...prev,
        date: {
          ...prev.date,
          start: selectedDate
        }
      }));
      
      // Handle mode switching
      if (!customDateRange.end) {
        setDatePickerMode('end');
      } else {
        setDatePickerVisible(false);
      }
    } else {
      // Similar changes for end date selection
      setCustomDateRange(prev => {
        const updatedRange = {
          ...prev,
          end: selectedDate
        };
        updateMarkedDates(updatedRange);
        return updatedRange;
      });
      
      setTempFilters(prev => ({
        ...prev,
        date: {
          ...prev.date,
          end: selectedDate
        }
      }));
      
      setDatePickerVisible(false);
    }
  };
  
  const applyAllFilters = () => {
    // Create a sanitized version of filters
    const sanitizedFilters = {
      restaurant: tempFilters.restaurant || null,
      foodItem: tempFilters.foodItem || null,
      date: {
        start: tempFilters.date?.start || null,
        end: tempFilters.date?.end || null
      }
    };
    
    setAppliedFilters(sanitizedFilters);
    closeFilterModal();
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
      closeFilterModal();
    }
  };
  
  // Apply a restaurant filter
  const applyRestaurantFilter = (restaurant) => {
    setTempFilters(prev => ({
      ...prev,
      restaurant: restaurant === tempFilters.restaurant ? null : restaurant
    }));
  };
  
  // Apply a food item filter
  const applyFoodItemFilter = (key, foodItem) => {
  
    setTempFilters(prev => ({
      ...prev,
      foodItem: key === prev.foodItem ? null : key
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
      onPress={() => navigation.navigate('OrderDetails', { 
        order: {
          restaurant: item.restaurant,
          orderId: item.orderId,
          orderItems: item.orderItems,
          totalPrice: item.totalPrice,
          date: item.date,
          email: item.email
        }
      })}
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
  
  // Render pagination controls
  const renderPagination = () => {
    if (displayedTransactions.length <= ITEMS_PER_PAGE) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(page => Math.max(1, page - 1))}
          disabled={currentPage === 1}
        >
          <Icon name="chevron-left" size={24} color={currentPage === 1 ? '#ccc' : '#666'} />
        </TouchableOpacity>
        
        <Text style={styles.paginationText}>
          Page {currentPage} of {totalPages}
        </Text>
        
        <TouchableOpacity 
          style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
          onPress={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
          disabled={currentPage === totalPages}
        >
          <Icon name="chevron-right" size={24} color={currentPage === totalPages ? '#ccc' : '#666'} />
        </TouchableOpacity>
      </View>
    );
  };
  
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
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={closeFilterModal}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Transactions</Text>
            <TouchableOpacity onPress={closeFilterModal} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterTabs}>
            <TouchableOpacity 
              style={[
                styles.filterTab,
                activeFilterTab === 'restaurants' && [styles.activeFilterTab, { borderBottomColor: platformColor }]
              ]}
              onPress={() => setActiveFilterTab('restaurants')}
            >
              <Text style={[
                styles.filterTabText, 
                activeFilterTab === 'restaurants' && { color: platformColor, fontWeight: 'bold' }
              ]}>
                Restaurants
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterTab,
                activeFilterTab === 'foodItems' && [styles.activeFilterTab, { borderBottomColor: platformColor }]
              ]}
              onPress={() => setActiveFilterTab('foodItems')}
            >
              <Text style={[
                styles.filterTabText, 
                activeFilterTab === 'foodItems' && { color: platformColor, fontWeight: 'bold' }
              ]}>
                Food Items
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterTab,
                activeFilterTab === 'date' && [styles.activeFilterTab, { borderBottomColor: platformColor }]
              ]}
              onPress={() => setActiveFilterTab('date')}
            >
              <Text style={[
                styles.filterTabText, 
                activeFilterTab === 'date' && { color: platformColor, fontWeight: 'bold' }
              ]}>
                Date Range
              </Text>
            </TouchableOpacity>
          </View>
          
          {activeFilterTab === 'restaurants' && (
            <View style={styles.filterTabContainer}>
              {/* Search Input */}
              <View style={styles.filterSearchContainer}>
                <Icon name="search" size={18} color="#666" />
                <TextInput
                  style={styles.filterSearchInput}
                  placeholder="Search restaurants..."
                  value={restaurantSearch}
                  onChangeText={setRestaurantSearch}
                  placeholderTextColor="#999"
                />
                {restaurantSearch ? (
                  <TouchableOpacity onPress={() => setRestaurantSearch('')}>
                    <Icon name="close" size={18} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <ScrollView style={styles.filterTabContent} contentContainerStyle={{paddingBottom: 70}}>
                {filterOptions?.restaurants
                  ?.slice() // Create a copy to avoid mutating original
                  .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
                  .filter(restaurant => restaurant.toLowerCase().includes(restaurantSearch.toLowerCase()))
                  .map((restaurant, index) => (
                    <TouchableOpacity
                      key={`restaurant-${index}`}
                      style={[
                        styles.filterOption,
                        tempFilters.restaurant === restaurant && [styles.filterOptionSelected, { backgroundColor: `${platformColor}15` }]
                      ]}
                      onPress={() => applyRestaurantFilter(restaurant)}
                    >
                      <Text style={styles.filterOptionText}>{restaurant}</Text>
                      {tempFilters.restaurant === restaurant && (
                        <Icon name="check" size={18} color={platformColor} />
                      )}
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}
          
          {activeFilterTab === 'foodItems' && (
            <View style={styles.filterTabContainer}>
              {/* Search Input */}
              <View style={styles.filterSearchContainer}>
                <Icon name="search" size={18} color="#666" />
                <TextInput
                  style={styles.filterSearchInput}
                  placeholder="Search food items..."
                  value={foodItemSearch}
                  onChangeText={setFoodItemSearch}
                  placeholderTextColor="#999"
                />
                {foodItemSearch ? (
                  <TouchableOpacity onPress={() => setFoodItemSearch('')}>
                    <Icon name="close" size={18} color="#666" />
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <ScrollView 
                style={styles.filterTabContent} 
                contentContainerStyle={{paddingBottom: 120}}
                showsVerticalScrollIndicator={true}
              >
                {normalizedFoodItems
                  .filter(item => 
                    item.displayName.toLowerCase().includes(foodItemSearch.toLowerCase())
                  )
                  .map((foodItem, index) => (
                    <TouchableOpacity
                        key={`food-${index}`}
                        style={[
                          styles.filterOption,
                          tempFilters.foodItem === foodItem.key && 
                            [styles.filterOptionSelected, { backgroundColor: `${platformColor}15` }]
                        ]}
                        onPress={() => applyFoodItemFilter(foodItem.key, foodItem)}
                      >
                        <Text style={styles.filterOptionText}>
                          {foodItem.displayName}
                          {foodItem.count > 1 && 
                            <Text style={styles.variantCount}> ({foodItem.count} varieties)</Text>
                          }
                        </Text>
                        {tempFilters.foodItem === foodItem.key && (
                          <Icon name="check" size={18} color={platformColor} />
                        )}
                      </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}
          
          {activeFilterTab === 'date' && (
             <View style={[styles.filterTabContent, {marginBottom: 80}]}>
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
                    setTempFilters(prev => ({
                      ...prev,
                      date: { start, end }
                    }));
                    updateMarkedDates({ start, end });
                    // Don't close modal or apply yet
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
                      closeFilterModal();
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
                      closeFilterModal();
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
                      closeFilterModal();
                    }}
                  >
                    <Text style={styles.quickDateButtonText}>Last 3 Months</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.resetAllFiltersButton}
              onPress={() => {
                resetAllFilters();
                closeFilterModal();
              }}
            >
              <Text style={styles.resetAllFiltersButtonText}>Reset All Filters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.applyFiltersButton, { backgroundColor: platformColor }]}
              onPress={applyAllFilters}
            >
              <Text style={styles.applyFiltersButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Render Date Picker Modal
 // Render Date Picker Modal
 const renderDatePickerModal = () => (
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
);

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
      
      {/* Total Amount Card */}
      <View style={styles.totalAmountCard}>
        <View style={styles.totalAmountContent}>
          <Text style={styles.totalAmountLabel}>Total Spent</Text>
          <Text style={[styles.totalAmountValue, { color: platformColor }]}>
            {formatCurrency(totalAmount)}
          </Text>
          <Text style={styles.totalAmountSubtext}>
            {displayedTransactions.length} transaction{displayedTransactions.length !== 1 ? 's' : ''}
            {appliedFilters.restaurant ? ` from ${appliedFilters.restaurant}` : ''}
            {appliedFilters.foodItem ? ` with "${appliedFilters.foodItem}"` : ''}
          </Text>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={platformColor} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      ) : (
        <>
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
          
          {/* Table with transactions */}
          {displayedTransactions.length > 0 ? (
            <>
              <FlatList
                data={paginatedTransactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransactionItem}
                ListHeaderComponent={renderTableHeader}
                stickyHeaderIndices={[0]}
                ListFooterComponent={renderPagination}
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="receipt-long" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              <TouchableOpacity 
                style={[styles.resetButton, { backgroundColor: platformColor }]}
                onPress={resetAllFilters}
              >
                <Text style={styles.resetButtonText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
      
      {/* Filter Modal */}
      {renderFilterModal()}
      
      {/* Date Picker Modal */}
      {renderDatePickerModal()}
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
  paddingTop: 15,
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
totalAmountCard: {
  backgroundColor: '#fff',
  margin: 15,
  marginTop: 10,
  borderRadius: 12,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
},
totalAmountContent: {
  padding: 16,
  alignItems: 'center',
},
totalAmountLabel: {
  fontSize: 14,
  color: '#666',
  marginBottom: 6,
},
totalAmountValue: {
  fontSize: 28,
  fontWeight: 'bold',
  marginBottom: 6,
},
totalAmountSubtext: {
  fontSize: 13,
  color: '#888',
  textAlign: 'center',
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
paginationContainer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 12,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#eee',
  paddingBottom:50,
  paddingTop:40
},
paginationButton: {
  padding: 8,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 4,
},
paginationButtonDisabled: {
  borderColor: '#eee',
  backgroundColor: '#f9f9f9',
},
paginationText: {
  fontSize: 14,
  color: '#666',
  marginHorizontal: 15,
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
  marginTop: 15,
},
resetButtonText: {
  color: '#fff',
  fontWeight: 'bold',
  fontSize: 14,
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
  paddingBottom: 80,
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
},
filterSearchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
  borderRadius: 8,
  paddingHorizontal: 12,
  margin: 10,
},
filterSearchInput: {
  flex: 1,
  paddingVertical: 8,
  paddingHorizontal: 8,
  fontSize: 14,
  color: '#333',
},
variantCount: {
  fontSize: 12,
  color: '#777',
  fontStyle: 'italic'
}
});

export default TransactionsScreen;