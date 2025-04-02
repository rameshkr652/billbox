// src/components/ExpenseSummary.js - Modified
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import Colors from '../constants/colors';
import { useNavigation } from '@react-navigation/native';
import RNFS from 'react-native-fs';

const TIME_FRAMES = {
  CURRENT_MONTH: 'current_month',
  LAST_MONTH: 'last_month',
  LAST_3_MONTHS: 'last_3_months',
  LAST_YEAR: 'last_year',
  ALL_TIME: 'all_time',
  CUSTOM: 'custom'
};

const ExpenseSummary = ({ emails, platformColor }) => {
  const navigation = useNavigation();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(TIME_FRAMES.CURRENT_MONTH);
  const [totalSpent, setTotalSpent] = useState(0);
  const [filteredEmails, setFilteredEmails] = useState([]);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'
  const [earliestDate, setEarliestDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [isNavigating, setIsNavigating] = useState(false);
  // Find earliest date in emails
  useEffect(() => {
    if (emails && emails.length > 0) {
      findEarliestDate();
    }
  }, [emails]);

  useEffect(() => {
    calculateTotalSpent();
    updateMarkedDates();
  }, [emails, selectedTimeFrame, customDateRange]);

  const findEarliestDate = () => {
    try {
      let earliest = new Date();
      
      emails.forEach(email => {
        if (email.date) {
          const emailDate = new Date(email.date);
          if (!isNaN(emailDate.getTime()) && emailDate < earliest) {
            earliest = emailDate;
          }
        }
      });
      
      // Ensure we're not setting a future date as earliest
      const today = new Date();
      if (earliest > today) {
        earliest = today;
      }
      
      setEarliestDate(earliest);
    } catch (error) {
      console.error('Error finding earliest date:', error);
      setEarliestDate(new Date(2020, 0, 1)); // Default to Jan 1, 2020
    }
  };

  const updateMarkedDates = () => {
    const newMarkedDates = {};
    
    // Mark start date
    if (customDateRange.start) {
      const startDateStr = customDateRange.start.toISOString().split('T')[0];
      newMarkedDates[startDateStr] = {
        selected: true,
        startingDay: true,
        color: platformColor
      };
    }
    
    // Mark end date
    if (customDateRange.end) {
      const endDateStr = customDateRange.end.toISOString().split('T')[0];
      newMarkedDates[endDateStr] = {
        selected: true,
        endingDay: true,
        color: platformColor
      };
    }
    
    // Mark dates in between
    if (customDateRange.start && customDateRange.end) {
      const start = new Date(customDateRange.start);
      const end = new Date(customDateRange.end);
      
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

  const calculateTotalSpent = () => {
    if (!emails || emails.length === 0) {
      setTotalSpent(0);
      setFilteredEmails([]);
      return;
    }

    // Get date ranges based on selected time frame
    const now = new Date();
    let startDate = null;
    let endDate = now;

    switch (selectedTimeFrame) {
      case TIME_FRAMES.CURRENT_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case TIME_FRAMES.LAST_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case TIME_FRAMES.LAST_3_MONTHS:
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case TIME_FRAMES.LAST_YEAR:
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      case TIME_FRAMES.ALL_TIME:
        startDate = earliestDate || new Date(2000, 0, 1); // Far in the past to include all orders
        break;
      case TIME_FRAMES.CUSTOM:
        if (customDateRange.start && customDateRange.end) {
          startDate = customDateRange.start;
          endDate = customDateRange.end;
          // Set end date to end of day
          const endWithTime = new Date(endDate);
          endWithTime.setHours(23, 59, 59, 999);
          endDate = endWithTime;
        } else {
          // Default to current month if custom is not set
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
    }

    // Filter emails by date and calculate total
    let total = 0;
    const filtered = emails.filter(email => {
      // Parse date from email
      const emailDate = email.date ? new Date(email.date) : null;
      if (!emailDate) return false;

      // Check if the date is within the range
      const isInRange = emailDate >= startDate && emailDate <= endDate;
      
      // Sum up total price if in range
      if (isInRange && email.orderDetails && email.orderDetails.totalPrice) {
        // Remove currency symbol and convert to number
        const price = parseFloat(email.orderDetails.totalPrice.replace(/[^\d.-]/g, ''));
        if (!isNaN(price)) {
          total += price;
        }
      }
      
      return isInRange;
    });

    setTotalSpent(total);
    setFilteredEmails(filtered);
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getTimeFrameLabel = () => {
    switch (selectedTimeFrame) {
      case TIME_FRAMES.CURRENT_MONTH:
        const now = new Date();
        return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      case TIME_FRAMES.LAST_MONTH:
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return `${lastMonth.toLocaleString('default', { month: 'long' })} ${lastMonth.getFullYear()}`;
      case TIME_FRAMES.LAST_3_MONTHS:
        return "Last 3 Months";
      case TIME_FRAMES.LAST_YEAR:
        return "Last 12 Months";
      case TIME_FRAMES.ALL_TIME:
        return "All Time";
      case TIME_FRAMES.CUSTOM:
        if (customDateRange.start && customDateRange.end) {
          const formatDate = (date) => {
            return date.toLocaleDateString('en-US', { 
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          };
          return `${formatDate(customDateRange.start)} - ${formatDate(customDateRange.end)}`;
        }
        return "Custom Range";
    }
  };

  // Show date picker for custom range
  const showCustomDatePicker = () => {
    setDatePickerMode('start');
    setIsDatePickerVisible(true);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    
    if (datePickerMode === 'start') {
      setCustomDateRange(prev => ({
        ...prev,
        start: selectedDate
      }));
      
      // Move to end date selection
      setDatePickerMode('end');
    } else {
      setCustomDateRange(prev => ({
        ...prev,
        end: selectedDate
      }));
      
      // Close the picker and apply the custom filter
      setIsDatePickerVisible(false);
      setSelectedTimeFrame(TIME_FRAMES.CUSTOM);
    }
  };

  // Get the minimum date for the calendar
  const getMinDate = () => {
    if (datePickerMode === 'start') {
      // For start date, minimum is earliest order date
      return earliestDate ? earliestDate.toISOString().split('T')[0] : undefined;
    } else {
      // For end date, minimum is selected start date
      return customDateRange.start ? customDateRange.start.toISOString().split('T')[0] : undefined;
    }
  };

  // Get the maximum date for the calendar
  const getMaxDate = () => {
    // Max date is today
    return new Date().toISOString().split('T')[0];
  };

  // Reset filter to current month
  const resetToCurrentMonth = () => {
    setCustomDateRange({ start: null, end: null });
    setSelectedTimeFrame(TIME_FRAMES.CURRENT_MONTH);
    setIsDatePickerVisible(false);
  };

  // Handle navigation to the transactions screen
  const navigateToTransactions = () => {
    // Show loader
    setIsNavigating(true);
    
    // Use setTimeout to allow the loader to render before heavy processing
    setTimeout(() => {
      try {
        // Extract unique restaurant names and food items from ALL emails
        const validEmails = emails.filter(email => 
          email.orderDetails?.restaurantName && 
          email.orderDetails?.totalPrice && 
          email.orderDetails?.totalPrice !== 'N/A'
        );
        console.log(validEmails, "email.orderDetails")
        const uniqueRestaurants = [...new Set(validEmails
          .map(email => email.orderDetails.restaurantName))];
        
        // Extract food items from order details
        const allFoodItems = [];
        validEmails.forEach(email => {
          if (email.orderDetails?.orderItems && Array.isArray(email.orderDetails.orderItems)) {
            email.orderDetails.orderItems.forEach(item => {
              console.log(item, "email.orderDetails")
              allFoodItems.push(item.trim());
              // // Extract food name from format like "1 X Food Name"
              // const match = item.match(/\d+\s*[Xx×]\s+(.*)/);
              // if (match && match[1]) {
              //   allFoodItems.push(match[1].trim());
              // }
            });
          }
        });
        
        // Get unique food items
        const uniqueFoodItems = [...new Set(allFoodItems)];
        
        // Navigate to Transactions screen with ALL data (not filtered)
        navigation.navigate('TransactionsScreen', {
          allEmails: validEmails,
          platformColor,
          filterOptions: {
            restaurants: uniqueRestaurants,
            foodItems: uniqueFoodItems
          }
        });
      } catch (error) {
        console.error("Error preparing transaction data:", error);
        // Show error message if needed
      } finally {
        // Hide loader
        setIsNavigating(false);
      }
    }, 100); // Small delay to ensure loader appears
  };

  return (
    <View style={styles.container}>
      {/* Expense Summary Card */}
      <View style={[styles.summaryCard, { borderColor: platformColor }]}>
      <View style={styles.summaryCardHeader}>
        <Text style={styles.summaryTitle}>Total Spent</Text>
        <Text style={styles.orderCountText}>
          {filteredEmails.length} order{filteredEmails.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Text style={[styles.totalAmount, { color: platformColor }]}>
        {formatCurrency(totalSpent)}
      </Text>
      <Text style={styles.timeFrameLabel}>{getTimeFrameLabel()}</Text>
        
        {/* Time Frame Filters */}
        <View style={styles.filterRow}>
          <ScrollableButton 
            text="This Month" 
            selected={selectedTimeFrame === TIME_FRAMES.CURRENT_MONTH}
            onPress={() => setSelectedTimeFrame(TIME_FRAMES.CURRENT_MONTH)}
            color={platformColor}
          />
          <ScrollableButton 
            text="Last Month" 
            selected={selectedTimeFrame === TIME_FRAMES.LAST_MONTH}
            onPress={() => setSelectedTimeFrame(TIME_FRAMES.LAST_MONTH)}
            color={platformColor}
          />
          <ScrollableButton 
            text="3 Months" 
            selected={selectedTimeFrame === TIME_FRAMES.LAST_3_MONTHS}
            onPress={() => setSelectedTimeFrame(TIME_FRAMES.LAST_3_MONTHS)}
            color={platformColor}
          />
          <ScrollableButton 
            text="1 Year" 
            selected={selectedTimeFrame === TIME_FRAMES.LAST_YEAR}
            onPress={() => setSelectedTimeFrame(TIME_FRAMES.LAST_YEAR)}
            color={platformColor}
          />
          <ScrollableButton 
            text="All" 
            selected={selectedTimeFrame === TIME_FRAMES.ALL_TIME}
            onPress={() => setSelectedTimeFrame(TIME_FRAMES.ALL_TIME)}
            color={platformColor}
          />
          <ScrollableButton 
            text="Custom" 
            selected={selectedTimeFrame === TIME_FRAMES.CUSTOM}
            onPress={showCustomDatePicker}
            color={platformColor}
          />
          
          {/* Reset button */}
          {selectedTimeFrame !== TIME_FRAMES.CURRENT_MONTH && (
            <ScrollableButton 
              text="Reset" 
              onPress={resetToCurrentMonth}
              color={Colors.accent}
              selected={false}
            />
          )}
        </View>
      </View>

      {/* Order List - Replaced with "See All Transactions" button */}
      <View style={styles.orderListContainer}>        
        {/* New "See All Transactions" Button */}
        <TouchableOpacity 
          style={[styles.seeAllButton, { backgroundColor: platformColor }]}
          onPress={navigateToTransactions}
          disabled={isNavigating}
        >
          {isNavigating ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.seeAllButtonText}>Preparing Transactions...</Text>
            </>
          ) : (
            <>
              <Icon name="assignment" size={20} color="#fff" />
              <Text style={styles.seeAllButtonText}>See All Transactions</Text>
              <Icon name="chevron-right" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
              </Text>
              <TouchableOpacity 
                onPress={() => setIsDatePickerVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalInstructions}>
              <Icon 
                name={datePickerMode === 'start' ? 'event' : 'event-available'} 
                size={20} 
                color={platformColor} 
                style={styles.instructionIcon}
              />
              <Text style={styles.instructionText}>
                {datePickerMode === 'start' 
                  ? 'Select the first date of your range' 
                  : 'Now select the last date of your range'}
              </Text>
            </View>
            
            <Calendar
              current={
                datePickerMode === 'start'
                  ? (customDateRange.start?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
                  : (customDateRange.end?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0])
              }
              minDate={getMinDate()}
              maxDate={getMaxDate()}
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
              style={styles.calendar}
            />
            
            <View style={styles.modalButtons}>
              {/* Reset button */}
              <TouchableOpacity 
                style={[styles.modalButton, styles.resetButton]}
                onPress={resetToCurrentMonth}
              >
                <Icon name="refresh" size={16} color={Colors.accent} />
                <Text style={[styles.buttonText, { color: Colors.accent }]}>
                  Reset
                </Text>
              </TouchableOpacity>
              
              {/* Cancel button */}
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDatePickerVisible(false)}
              >
                <Text style={styles.buttonText}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              {/* Apply button (only if start date is already selected) */}
              {datePickerMode === 'end' && customDateRange.start && (
                <TouchableOpacity 
                  style={[styles.modalButton, styles.applyButton, { backgroundColor: platformColor }]}
                  onPress={() => {
                    // If end date is not selected, use today
                    if (!customDateRange.end) {
                      setCustomDateRange(prev => ({
                        ...prev,
                        end: new Date()
                      }));
                    }
                    setIsDatePickerVisible(false);
                    setSelectedTimeFrame(TIME_FRAMES.CUSTOM);
                  }}
                >
                  <Icon name="check" size={16} color="#fff" />
                  <Text style={[styles.buttonText, { color: '#fff' }]}>
                    Apply
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Button component for the scrollable filter
const ScrollableButton = ({ text, selected, onPress, color }) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      selected && { backgroundColor: color, borderColor: color }
    ]}
    onPress={onPress}
  >
    <Text style={[
      styles.filterButtonText,
      selected && { color: '#fff' }
    ]}>
      {text}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 15,
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timeFrameLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  orderListContainer: {
    flex: 1,
    marginHorizontal: 15,
    marginBottom: 10,
    marginTop: 10
  },
  orderListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  orderCountText: {
    fontSize: 14,
    color: '#666',
  },
  // New styles for "See All Transactions" button and summary
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom:10,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  seeAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  transactionsSummary: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  transactionsPreviewText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  // Existing modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  instructionIcon: {
    marginRight: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  calendar: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  applyButton: {
    // Color set dynamically
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#666',
  },
  orderCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default ExpenseSummary;