// src/components/MissingPermissionModal.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const { width, height } = Dimensions.get('window');

const MissingPermissionModal = ({ visible, onRequestReAuthenticate, onClose }) => {
  // Animated values for modal appearance
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [slideAnim] = React.useState(new Animated.Value(50));
  
  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations when modal closes
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContainer, 
            { 
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.warningIconContainer}>
              <Icon name="error-outline" size={50} color="#fff" />
            </View>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Email Permission Required</Text>
            
            <Text style={styles.modalDescription}>
              BillBox needs permission to access your Gmail to find and organize your food order emails.
            </Text>
            
            <View style={styles.permissionGuide}>
              <View style={styles.permissionStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>You'll need to sign in again with Google</Text>
              </View>
              
              <View style={styles.permissionStep}>
                <View style={[styles.stepNumber, styles.importantStep]}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={[styles.stepText, styles.importantStepText]}>Make sure to check the "View your email messages and settings" permission</Text>
              </View>
              
              <View style={styles.permissionImage}>
                <View style={styles.permissionCheckbox}>
                  <Icon name="check-box" size={20} color={Colors.primary} />
                  <Text style={styles.permissionLabel}>View your email messages and settings</Text>
                </View>
                <Icon name="arrow-downward" size={24} color={Colors.accent} style={styles.arrowIcon} />
              </View>
            </View>
            
            <Text style={styles.noteText}>
              Without this permission, BillBox cannot load your order information.
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRequestReAuthenticate}
            >
              <Text style={styles.retryButtonText}>Grant Permission</Text>
              <Icon name="login" size={20} color="#FFF" style={styles.buttonIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onClose}
            >
              <Text style={styles.skipButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 340,
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    backgroundColor: Colors.accent,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  modalContent: {
    padding: 24,
    paddingTop: 50,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionGuide: {
    width: '100%',
    marginBottom: 24,
  },
  permissionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  importantStep: {
    backgroundColor: Colors.accent,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  stepText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
  importantStepText: {
    fontWeight: 'bold',
    color: Colors.accent,
  },
  permissionImage: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  permissionCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    padding: 10,
    width: '100%',
  },
  permissionLabel: {
    fontSize: 14,
    marginLeft: 12,
    color: '#333',
  },
  arrowIcon: {
    marginTop: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#999',
    fontSize: 14,
  },
});

export default MissingPermissionModal;