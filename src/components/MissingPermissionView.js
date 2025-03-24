// src/components/MissingPermissionView.js
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  ScrollView,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const MissingPermissionView = ({ onRequestPermission, platformColor }) => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.warningCircle, { borderColor: platformColor }]}>
          <Icon name="lock" size={60} color={platformColor} />
        </View>
      </View>
      
      <Text style={styles.title}>Email Access Required</Text>
      <Text style={styles.description}>
        BillBox needs permission to access your Gmail to find and organize your food order emails.
      </Text>
      
      <View style={styles.featureLockedCard}>
        <View style={[styles.cardHeader, { backgroundColor: platformColor }]}>
          <Icon name="email-off" size={24} color="#FFFFFF" />
          <Text style={styles.cardHeaderText}>Features Unavailable</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.featureLockedText}>
            Without email access permission, BillBox cannot:
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="block" size={20} color="#999" style={styles.featureIcon} />
              <Text style={styles.featureText}>Load your order information</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="block" size={20} color="#999" style={styles.featureIcon} />
              <Text style={styles.featureText}>Show your spending habits</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="block" size={20} color="#999" style={styles.featureIcon} />
              <Text style={styles.featureText}>Analyze restaurants and food items</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Icon name="block" size={20} color="#999" style={styles.featureIcon} />
              <Text style={styles.featureText}>Track expenses over time</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.permissionInstructions}>
        <Text style={styles.instructionsTitle}>How to Grant Permission:</Text>
        
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Tap the "Grant Permission" button below
            </Text>
          </View>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: platformColor }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Choose your Google account
            </Text>
          </View>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: Colors.accent }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              <Text style={{ fontWeight: 'bold' }}>Important:</Text> On the permissions screen, make sure to check "View your email messages and settings"
            </Text>
          </View>
          
          <View style={styles.permissionImage}>
            <View style={styles.permissionCheckbox}>
              <Icon name="check-box" size={20} color={platformColor} />
              <Text style={styles.permissionLabel}>View your email messages and settings</Text>
            </View>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Tap "Continue" to complete the process
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity
        style={[styles.grantButton, { backgroundColor: platformColor }]}
        onPress={onRequestPermission}
      >
        <Icon name="vpn-key" size={24} color="#FFFFFF" />
        <Text style={styles.grantButtonText}>Grant Permission</Text>
      </TouchableOpacity>
      
      <Text style={styles.privacyNote}>
        BillBox only uses your email access to find order-related emails. We never read personal emails or share your data.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  iconContainer: {
    marginVertical: 30,
  },
  warningCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  featureLockedCard: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 30,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cardHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  cardContent: {
    padding: 16,
  },
  featureLockedText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
  },
  permissionInstructions: {
    width: '100%',
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  stepContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  stepText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
    lineHeight: 22,
  },
  permissionImage: {
    marginVertical: 16,
    marginLeft: 40,
    marginRight: 16,
  },
  permissionCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  permissionLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  grantButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  privacyNote: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
});

export default MissingPermissionView;