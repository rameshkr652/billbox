// src/components/PermissionGate.js
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
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

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      setLoading(true);
      const hasGmailPermission = await PermissionService.hasRequiredGmailPermissions();
      setHasPermission(hasGmailPermission);
    } catch (error) {
      console.error('Error checking permissions:', error);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      const success = await PermissionService.reAuthenticateWithGmailScope();
      
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color={platformColor || Colors.primary} />
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

export default PermissionGate;