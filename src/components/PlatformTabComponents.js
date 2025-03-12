// src/components/PlatformTabComponents.js
import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, Platform, ProgressBarAndroid as RNProgressBarAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import { formatDate } from '../utils/PlatformTabUtils';

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
 * List header component with action buttons
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
}) => (
  <View style={PlatformTabStyles.listHeader}>
    {!lastFetched ? (
      // Show "Load All Orders" button when no data has been fetched yet
      <TouchableOpacity
        style={[
          PlatformTabStyles.loadOrdersButton, 
          { backgroundColor: platformColor },
          loading && PlatformTabStyles.disabledButton
        ]}
        onPress={onFetchAll}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="download" size={20} color="#FFFFFF" />
            <Text style={PlatformTabStyles.loadOrdersButtonText}>Load All Orders</Text>
          </>
        )}
      </TouchableOpacity>
    ) : (
      // Show both "Load Latest" and "Load All" buttons when data exists
      <View style={PlatformTabStyles.buttonContainer}>
        <TouchableOpacity
          style={[
            PlatformTabStyles.loadLatestButton, 
            { backgroundColor: platformColor },
            loading && PlatformTabStyles.disabledButton
          ]}
          onPress={onFetchLatest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="update" size={18} color="#FFFFFF" />
              <Text style={PlatformTabStyles.buttonText}>Load Latest</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            PlatformTabStyles.loadAllButton,
            loading && PlatformTabStyles.disabledButton
          ]}
          onPress={onFetchAll}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : (
            <>
             <TouchableOpacity 
          style={PlatformTabStyles.clearButton}
          onPress={onClear}
        >
          <Icon name="delete-outline" size={20} color={Colors.accent} />
          <Text style={PlatformTabStyles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </View>
    )}
    
    {lastFetched && (
      <Text style={PlatformTabStyles.lastUpdated}>
        Last updated: {formatDate(lastFetched)}
      </Text>
    )}
  </View>
);

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