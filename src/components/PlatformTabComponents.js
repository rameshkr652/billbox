// src/components/PlatformTabComponents.js
import React, {useState} from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Platform, ProgressBarAndroid as RNProgressBarAndroid, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import { formatDate } from '../utils/PlatformTabUtils';
import { Calendar } from 'react-native-calendars';

// Safely handle progress bar based on platform
const ProgressBar = ({ progress, color }) => {
  if (Platform.OS === 'android') {
    return (
      <RNProgressBarAndroid
        styleAttr="Horizontal"
        indeterminate={false}
        progress={progress}
        color={color}
        style={PlatformTabStyles.progressBar}
      />
    );
  } else {
    // For iOS, render a simple progress indicator since RNProgressBarAndroid may not be available
    return (
      <View style={[PlatformTabStyles.progressBar, { backgroundColor: '#f0f0f0' }]}>
        <View 
          style={{
            height: '100%', 
            width: `${progress * 100}%`, 
            backgroundColor: color
          }} 
        />
      </View>
    );
  }
};

/**
 * Empty state component when no emails are found
 */
export const EmptyState = ({ platformIcon, platformName, onRefresh }) => (
  <View style={PlatformTabStyles.emptyContainer}>
    <Icon name={platformIcon} size={60} color="#D1D5DB" />
    <Text style={PlatformTabStyles.emptyText}>No orders found</Text>
    <Text style={PlatformTabStyles.emptySubtext}>
      Tap 'Load All Orders' to fetch your {platformName} orders
    </Text>
  </View>
);

/**
 * Loading indicator component
 */
export const LoadingIndicator = ({ platformName, platformColor }) => (
  <View style={PlatformTabStyles.loadingContainer}>
    <ActivityIndicator size="large" color={platformColor} />
    <Text style={PlatformTabStyles.loadingText}>
      Loading {platformName} orders...
    </Text>
  </View>
);

/**
 * Error message component
 */
export const ErrorMessage = ({ error }) => (
  <View style={PlatformTabStyles.errorContainer}>
    <Icon name="error" size={20} color={Colors.accent} />
    <Text style={PlatformTabStyles.errorText}>{error}</Text>
  </View>
);
/**
 * List header component with action buttons and time frame selection
 */
export const ListHeader = ({ 
  platformName, 
  platformColor, 
  lastFetched, 
  loading, 
  emails, 
  onFetchAll, 
  onFetchLatest, 
  onClear 
}) => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('THIS_MONTH');
  const [showTimeFrameModal, setShowTimeFrameModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('start'); // 'start' or 'end'
  const [markedDates, setMarkedDates] = useState({});

  // Get current date for default time frames
  const now = new Date();
  
  // Time frame options
  const timeFrames = {
    THIS_MONTH: {
      label: 'This Month',
      getDateRange: () => {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start, end };
      }
    },
    LAST_MONTH: {
      label: 'Last Month',
      getDateRange: () => {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start, end };
      }
    },
    LAST_3_MONTHS: {
      label: 'Last 3 Months',
      getDateRange: () => {
        const start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const end = new Date(now);
        return { start, end };
      }
    },
    LAST_6_MONTHS: {
      label: 'Last 6 Months',
      getDateRange: () => {
        const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const end = new Date(now);
        return { start, end };
      }
    },
    THIS_YEAR: {
      label: 'This Year',
      getDateRange: () => {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now);
        return { start, end };
      }
    },
    ALL_TIME: {
      label: 'All Time',
      getDateRange: () => {
        const start = new Date(2000, 0, 1); // Far in the past
        const end = new Date(now);
        return { start, end };
      }
    },
    CUSTOM: {
      label: 'Custom Range',
      getDateRange: () => {
        return customDateRange;
      }
    }
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
  const openDatePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  // Handle date selection in calendar
  const handleDateSelect = (date) => {
    const selectedDate = new Date(date.dateString);
    
    if (datePickerMode === 'start') {
      setCustomDateRange(prev => {
        const newRange = { 
          ...prev, 
          start: selectedDate,
          // Clear end date if it's before the new start date
          end: prev.end && prev.end < selectedDate ? null : prev.end
        };
        updateMarkedDates(newRange);
        return newRange;
      });
      
      // Switch to end date selection if not already set
      if (!customDateRange.end) {
        setDatePickerMode('end');
      } else {
        setShowDatePicker(false);
      }
    } else {
      // Ensure end date is not before start date
      if (customDateRange.start && selectedDate < customDateRange.start) {
        // Show alert
        Alert.alert(
          'Invalid Date Range',
          'End date cannot be before start date',
          [{ text: 'OK' }]
        );
        return;
      }
      
      setCustomDateRange(prev => {
        const newRange = { ...prev, end: selectedDate };
        updateMarkedDates(newRange);
        return newRange;
      });
      
      setShowDatePicker(false);
      setSelectedTimeFrame('CUSTOM');
      setShowTimeFrameModal(false);
    }
  };

  // Get formatted date range text for display
  const getDateRangeText = () => {
    const range = timeFrames[selectedTimeFrame].getDateRange();
    
    if (selectedTimeFrame === 'CUSTOM') {
      if (range.start && range.end) {
        return `${formatDateDisplay(range.start)} - ${formatDateDisplay(range.end)}`;
      }
      return 'Select Custom Range';
    }
    
    return timeFrames[selectedTimeFrame].label;
  };

  // Format date for display
  const formatDateDisplay = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle fetch with the selected time frame
  const handleFetchWithTimeFrame = () => {
    const dateRange = timeFrames[selectedTimeFrame].getDateRange();
    
    if (selectedTimeFrame === 'CUSTOM' && (!dateRange.start || !dateRange.end)) {
      Alert.alert('Incomplete Date Range', 'Please select both start and end dates for custom range.');
      return;
    }
    
    onFetchAll(dateRange);
  };

  // Render time frame options
  const renderTimeFrameOptions = () => {
    return (
      <View style={PlatformTabStyles.timeFrameOptions}>
        {Object.keys(timeFrames).map(key => (
          <TouchableOpacity 
            key={key} 
            style={[
              PlatformTabStyles.timeFrameOption,
              selectedTimeFrame === key && [
                PlatformTabStyles.timeFrameOptionSelected,
                { borderColor: platformColor }
              ]
            ]}
            onPress={() => {
              if (key === 'CUSTOM') {
                if (!customDateRange.start || !customDateRange.end) {
                  openDatePicker('start');
                }
              } else {
                setSelectedTimeFrame(key);
                setShowTimeFrameModal(false);
              }
            }}
          >
            <Text style={[
              PlatformTabStyles.timeFrameOptionText,
              selectedTimeFrame === key && { color: platformColor, fontWeight: 'bold' }
            ]}>
              {timeFrames[key].label}
            </Text>
            {key === 'CUSTOM' && selectedTimeFrame === 'CUSTOM' && customDateRange.start && customDateRange.end && (
              <Text style={PlatformTabStyles.timeFrameCustomText}>
                {formatDateDisplay(customDateRange.start)} - {formatDateDisplay(customDateRange.end)}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render date picker modal
  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={PlatformTabStyles.datePickerModalContainer}>
        <View style={PlatformTabStyles.datePickerModalContent}>
          <View style={PlatformTabStyles.datePickerModalHeader}>
            <Text style={PlatformTabStyles.datePickerModalTitle}>
              Select {datePickerMode === 'start' ? 'Start' : 'End'} Date
            </Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(false)}
              style={PlatformTabStyles.closeButton}
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
            maxDate={new Date().toISOString().split('T')[0]} // Can't select future dates
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
          
          <View style={PlatformTabStyles.datePickerModalFooter}>
            <TouchableOpacity
              style={PlatformTabStyles.datePickerCancelButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={PlatformTabStyles.datePickerCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            {datePickerMode === 'end' && customDateRange.start && (
              <TouchableOpacity
                style={[PlatformTabStyles.datePickerApplyButton, { backgroundColor: platformColor }]}
                onPress={() => {
                  setShowDatePicker(false);
                  setSelectedTimeFrame('CUSTOM');
                  setShowTimeFrameModal(false);
                }}
              >
                <Text style={PlatformTabStyles.datePickerApplyButtonText}>Apply Range</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  // Time frame selection modal
  const renderTimeFrameModal = () => (
    <Modal
      visible={showTimeFrameModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTimeFrameModal(false)}
    >
      <View style={PlatformTabStyles.timeFrameModalContainer}>
        <View style={PlatformTabStyles.timeFrameModalContent}>
          <View style={PlatformTabStyles.timeFrameModalHeader}>
            <Text style={PlatformTabStyles.timeFrameModalTitle}>Select Time Period</Text>
            <TouchableOpacity 
              onPress={() => setShowTimeFrameModal(false)}
              style={PlatformTabStyles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {renderTimeFrameOptions()}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={PlatformTabStyles.listHeader}>
      {!lastFetched ? (
        // Show "Load Orders" button with time frame selector when no data has been fetched yet
        <View style={PlatformTabStyles.loadOrdersContainer}>
          <TouchableOpacity
            style={[
              PlatformTabStyles.timeFrameSelector,
              { borderColor: platformColor }
            ]}
            onPress={() => setShowTimeFrameModal(true)}
          >
            <Icon name="date-range" size={18} color={platformColor} />
            <Text style={[
              PlatformTabStyles.timeFrameSelectorText,
              { color: platformColor }
            ]}>
              {getDateRangeText()}
            </Text>
            <Icon name="arrow-drop-down" size={20} color={platformColor} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              PlatformTabStyles.loadOrdersButton, 
              { backgroundColor: platformColor },
              loading && PlatformTabStyles.disabledButton
            ]}
            onPress={handleFetchWithTimeFrame}
            disabled={loading || (selectedTimeFrame === 'CUSTOM' && (!customDateRange.start || !customDateRange.end))}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="download" size={20} color="#FFFFFF" />
                <Text style={PlatformTabStyles.loadOrdersButtonText}>Load Orders</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Show only "Load Latest" and "Clear" buttons when data exists
        <View style={PlatformTabStyles.buttonContainer}>
          <TouchableOpacity
            style={[
              PlatformTabStyles.loadLatestButton, 
              { backgroundColor: platformColor },
              loading && PlatformTabStyles.disabledButton
            ]}
            onPress={() => {
              // Use the current time frame for the next fetch
              const dateRange = timeFrames[selectedTimeFrame].getDateRange();
              onFetchLatest(dateRange);
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ): (
              <>
                <Icon name="update" size={18} color="#FFFFFF" />
                <Text style={PlatformTabStyles.buttonText}>Load Latest</Text>
              </>
            )}
          </TouchableOpacity>        
          
          {/* Clear button */}
          <TouchableOpacity 
            style={PlatformTabStyles.clearButton}
            onPress={onClear}
          >
            <Icon name="delete-outline" size={20} color={Colors.accent} />
            <Text style={PlatformTabStyles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {lastFetched && (
        <Text style={PlatformTabStyles.lastUpdated}>
          Last updated: {formatDate(lastFetched)}
        </Text>
      )}

      {/* Time Frame Modal */}
      {renderTimeFrameModal()}
      
      {/* Date Picker Modal */}
      {renderDatePickerModal()}
    </View>
  );
};

/**
 * Progress modal component
 */
export const ProgressModal = ({ 
  visible, 
  platformName, 
  platformColor, 
  progressText, 
  progress, 
  timeRemaining = null 
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
  >
    <View style={PlatformTabStyles.progressModalOverlay}>
      <View style={PlatformTabStyles.progressModalContent}>
        <Text style={PlatformTabStyles.progressModalTitle}>Fetching Orders</Text>
        <Text style={PlatformTabStyles.progressModalSubtitle}>
          Please wait while we fetch your {platformName} orders.
        </Text>
        <Text style={PlatformTabStyles.progressModalText}>{progressText}</Text>
        
        {timeRemaining !== null && (
          <Text style={PlatformTabStyles.progressModalTimeRemaining}>
            Estimated time remaining: {timeRemaining}
          </Text>
        )}
        
        <ProgressBar
          progress={progress}
          color={platformColor}
        />
        
        <Text style={PlatformTabStyles.progressModalNote}>>
          This may take a while depending on the number of orders.
        </Text>
      </View>
    </View>
  </Modal>
);

export default {
  EmptyState,
  LoadingIndicator,
  ErrorMessage,
  ListHeader,
  ProgressModal
};