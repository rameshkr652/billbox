// src/components/PlatformTabComponents.js - Modified for game persistence
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Platform as RNPlatform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';
import PlatformTabStyles from '../styles/PlatformTabStyles';
import { formatDate } from '../utils/PlatformTabUtils';
import AnimatedProgressModal from './AnimatedProgressModal';
import GameOverlay from './GameOverlay';

// Global game state to persist across component lifecycles
const gameState = {
  showGameModal: false,
  isGameMinimized: false
};

// Safely handle progress bar based on platform
const ProgressBar = ({ progress, color }) => {
  // Use a simple custom progress indicator
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
      // Show only "Load Latest" and "Clear" buttons when data exists
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
  </View>
);

/**
 * Progress modal component with game persistence
 */
export const ProgressModal = ({ 
  visible, 
  platformName, 
  platformColor, 
  progressText, 
  progress, 
  timeRemaining = null,
  emails = []
}) => {
  // Use local state that syncs with the global gameState
  const [showGameModal, setShowGameModal] = useState(gameState.showGameModal);
  const [isGameMinimized, setIsGameMinimized] = useState(gameState.isGameMinimized);

  // Init from global state on mount
  useEffect(() => {
    setShowGameModal(gameState.showGameModal);
    setIsGameMinimized(gameState.isGameMinimized);
  }, []);

  // Update global state when local state changes
  useEffect(() => {
    gameState.showGameModal = showGameModal;
    gameState.isGameMinimized = isGameMinimized;
  }, [showGameModal, isGameMinimized]);

  // Handle opening the game
  const handleOpenGame = () => {
    setShowGameModal(true);
    setIsGameMinimized(false);
  };
  
  // Handle minimizing the game
  const handleMinimizeGame = () => {
    setIsGameMinimized(true);
  };
  
  // Handle closing the game
  const handleCloseGame = () => {
    setShowGameModal(false);
    setIsGameMinimized(false);
  };

  return (
    <>
      {/* Progress Modal Component */}
      <AnimatedProgressModal
        visible={visible}
        platformName={platformName}
        platformColor={platformColor}
        progressText={progressText}
        progress={progress}
        timeRemaining={timeRemaining}
        emails={emails}
        // Pass game state and handlers
        showGameModal={showGameModal}
        isGameMinimized={isGameMinimized}
        handleOpenGame={handleOpenGame}
      />

      {/* Independent Game Overlay that persists after progress modal closes */}
      {showGameModal && (
        <GameOverlay 
          showGameModal={showGameModal} 
          isGameMinimized={isGameMinimized} 
          handleMinimizeGame={handleMinimizeGame} 
          handleCloseGame={handleCloseGame} 
        />
      )}
    </>
  );
};

export default {
  EmptyState,
  LoadingIndicator,
  ErrorMessage,
  ListHeader,
  ProgressModal,
  // Export gameState to allow other components to check game status
  getGameState: () => ({ ...gameState })
};