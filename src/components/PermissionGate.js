// src/components/PermissionGate.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import * as PermissionService from '../services/PermissionService';
import MissingPermissionView from './MissingPermissionView';
import Colors from '../constants/colors';

/**
 * A component that acts as a gate to check for required Gmail permissions
 * Only renders children when permissions are granted
 */
const PermissionGate = ({ children, platformColor }) => {
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    checkPermission();
  }, []);

  // Check permission with protection against excessive rechecks
  const checkPermission = async () => {
    try {
      // Don't allow too many checks (avoid potential loops)
      if (checkCount > 2) {
        console.log("Permission checks exceeded limit, assuming permission denied");
        setHasPermission(false);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // First try getting cached state for speed
      const cachedPermission = await PermissionService.getCachedPermissionState();
      if (cachedPermission === true) {
        console.log("Using cached permission: GRANTED");
        setHasPermission(true);
        setLoading(false);
        return;
      }
      
      // If we have a cached FALSE result, we still double-check,
      // but we show loading indicator while doing so
      
      console.log("Performing full permission check...");
      setCheckCount(prev => prev + 1);
      
      // Full check with API call
      const hasGmailPermission = await PermissionService.hasRequiredGmailPermissions();
      console.log("Permission check result:", hasGmailPermission);
      setHasPermission(hasGmailPermission);
      setLoading(false);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      console.log("Requesting permission...");
      
      // Clear cached state before requesting new permissions
      await PermissionService.clearCachedPermissionState();
      
      // Request permissions with scopes
      const success = await PermissionService.reAuthenticateWithGmailScope();
      
      console.log("Permission request result:", success);
      
      if (success) {
        setHasPermission(true);
      } else {
        setHasPermission(false);
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={platformColor || Colors.primary} />
        <Text style={styles.loadingText}>Checking permissions...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <MissingPermissionView 
        onRequestPermission={handleRequestPermission}
        platformColor={platformColor || Colors.primary}
      />
    );
  }

  // If we have permission, render the actual content
  return children;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});

export default PermissionGate;