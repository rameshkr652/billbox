// src/components/CustomAlert.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const alertTypes = {
  SUCCESS: {
    icon: 'check-circle',
    color: '#4CAF50', // Green
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  ERROR: {
    icon: 'error',
    color: '#F44336', // Red
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  WARNING: {
    icon: 'warning',
    color: '#FF9800', // Orange
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
  },
  INFO: {
    icon: 'info',
    color: '#2196F3', // Blue
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
};

const CustomAlert = ({
  visible,
  title,
  message,
  type = 'INFO',
  onClose,
  buttons = [{ text: 'OK', style: 'primary', onPress: () => {} }],
  autoDismiss = false,
  dismissTimeout = 3000,
  customColor = null,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [modalVisible, setModalVisible] = useState(visible);
  
  // Get alert style based on type
  const alertStyle = alertTypes[type.toUpperCase()] || alertTypes.INFO;
  
  // Use custom color if provided
  const alertColor = customColor || alertStyle.color;
  
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Auto dismiss after timeout if enabled
      if (autoDismiss) {
        const timer = setTimeout(() => {
          handleClose();
        }, dismissTimeout);
        return () => clearTimeout(timer);
      }
    } else {
      handleClose();
    }
  }, [visible]);
  
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      if (onClose) onClose();
    });
  };
  
  // Render primary button with custom color
  const renderButtons = () => {
    if (buttons.length === 0) return null;
    
    return (
      <View style={styles.buttonContainer}>
        {buttons.map((button, index) => {
          const isPrimary = button.style === 'primary';
          const isLast = index === buttons.length - 1;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.button,
                isPrimary ? [styles.primaryButton, { backgroundColor: alertColor }] : styles.secondaryButton,
                !isLast && { marginRight: 10 }
              ]}
              onPress={() => {
                if (button.onPress) button.onPress();
                handleClose();
              }}
            >
              <Text 
                style={[
                  styles.buttonText,
                  isPrimary ? styles.primaryButtonText : [styles.secondaryButtonText, { color: alertColor }]
                ]}
              >
                {button.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (!modalVisible) return null;
  
  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.header, { backgroundColor: alertColor }]}>
            <Icon name={alertStyle.icon} size={24} color="#FFF" />
            <Text style={styles.headerText}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <View style={[styles.content, { backgroundColor: alertStyle.backgroundColor }]}>
            <Text style={styles.message}>{message}</Text>
            {renderButtons()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Alert Manager to handle multiple alerts in sequence
export const alertManager = {
  _current: null,
  _queue: [],
  _isShowing: false,
  
  show(options) {
    if (this._isShowing) {
      this._queue.push(options);
      return;
    }
    
    this._current = options;
    this._isShowing = true;
    
    if (options.onClose) {
      const originalOnClose = options.onClose;
      options.onClose = () => {
        originalOnClose();
        this._processQueue();
      };
    } else {
      options.onClose = () => {
        this._processQueue();
      };
    }
    
    if (typeof options.component === 'function') {
      options.component({
        ...options,
        visible: true,
      });
    }
  },
  
  _processQueue() {
    this._isShowing = false;
    this._current = null;
    
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      this.show(next);
    }
  },
  
  hide() {
    if (this._current && typeof this._current.component === 'function') {
      this._current.component({
        ...this._current,
        visible: false,
      });
    }
  },
  
  // Helper methods for different alert types
  success(title, message, options = {}) {
    this.show({
      title,
      message,
      type: 'SUCCESS',
      autoDismiss: true,
      ...options,
    });
  },
  
  error(title, message, options = {}) {
    this.show({
      title,
      message,
      type: 'ERROR',
      ...options,
    });
  },
  
  warning(title, message, options = {}) {
    this.show({
      title,
      message,
      type: 'WARNING',
      ...options,
    });
  },
  
  info(title, message, options = {}) {
    this.show({
      title,
      message,
      type: 'INFO',
      ...options,
    });
  },
  
  // Show confirmation with multiple buttons
  confirm(title, message, options = {}) {
    const buttons = options.buttons || [
      { text: 'Cancel', style: 'secondary' },
      { text: 'OK', style: 'primary', onPress: () => {} },
    ];
    
    this.show({
      title,
      message,
      type: options.type || 'INFO',
      buttons,
      ...options,
    });
  }
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  headerText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2196F3',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#FFF',
  },
  secondaryButtonText: {
    color: '#2196F3',
  },
});

export default CustomAlert;