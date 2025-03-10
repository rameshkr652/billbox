// src/utils/helpers.js
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Format date from email header to readable format
export const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

// Extract sender name from email address
export const extractSenderName = (fromString) => {
  if (!fromString) return 'Unknown';
  
  // Try to extract name from "Name <email>" format
  const match = fromString.match(/^"?([^"<]+)"?\s*<?[^>]*>?$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If no match, return the whole string or part before @
  const emailMatch = fromString.match(/([^@<]+)@/);
  if (emailMatch && emailMatch[1]) {
    return emailMatch[1];
  }
  
  return fromString;
};

// Handle errors with consistent messaging
export const handleError = (error, customMessage = 'An error occurred') => {
  console.error(error);
  Alert.alert('Error', `${customMessage}. Please try again.`);
};

// Parse email subject for order information
export const parseOrderInfo = (subject, platform) => {
  if (!subject) return { orderNumber: null, status: null };
  
  let orderNumber = null;
  let status = null;
  
  // Different regex patterns based on platform
  switch(platform) {
    case 'swiggy':
      // Example: Order #12345 - Confirmed
      orderNumber = subject.match(/#\s*([A-Z0-9]+)/i)?.[1] || null;
      status = subject.match(/\s*-\s*([A-Za-z]+)/)?.[1] || null;
      break;
      
    case 'zomato':
      // Example: Your Zomato order #ZOM12345 is confirmed
      orderNumber = subject.match(/#\s*([A-Z0-9]+)/i)?.[1] || null;
      if (subject.includes('confirmed')) status = 'Confirmed';
      else if (subject.includes('delivered')) status = 'Delivered';
      else if (subject.includes('preparing')) status = 'Preparing';
      break;
      
    case 'flipkart':
    case 'amazon':
      // Example: Your Amazon.in order #302-1234567-1234567
      orderNumber = subject.match(/#\s*([A-Z0-9-]+)/i)?.[1] || null;
      if (subject.includes('confirmed') || subject.includes('placed')) status = 'Confirmed';
      else if (subject.includes('shipped')) status = 'Shipped';
      else if (subject.includes('delivered')) status = 'Delivered';
      break;
      
    default:
      // Generic pattern for other emails
      orderNumber = subject.match(/[A-Z0-9]{6,}/i)?.[0] || null;
  }
  
  return { orderNumber, status };
};

// Get platform-specific data
export const getPlatformData = async (platform) => {
  try {
    const emails = await AsyncStorage.getItem(`emails_${platform}`);
    return emails ? JSON.parse(emails) : [];
  } catch (error) {
    console.error(`Error getting ${platform} data:`, error);
    return [];
  }
};

// Clear platform-specific data
export const clearPlatformData = async (platform) => {
  try {
    await AsyncStorage.removeItem(`emails_${platform}`);
    return true;
  } catch (error) {
    console.error(`Error clearing ${platform} data:`, error);
    return false;
  }
};