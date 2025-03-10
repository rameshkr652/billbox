// src/services/EmailService.js
import * as GmailService from './GmailService';
import platforms from '../constants/platforms';

// Fetch emails for a specific platform
export const fetchEmails = async (platformId) => {
  try {
    // Get platform info
    const platformInfo = platforms.find(p => p.id === platformId);
    if (!platformInfo) {
      throw new Error(`Platform ${platformId} not found`);
    }
    
    // Use GmailService to fetch emails
    return await GmailService.fetchPlatformEmails(platformId, platformInfo.emailQuery);
  } catch (error) {
    console.error(`Error fetching ${platformId} emails:`, error);
    throw error;
  }
};

// Get emails for a specific platform from storage
export const getEmails = async (platformId) => {
  return await GmailService.getPlatformEmails(platformId);
};

// Get last fetched timestamp for a platform
export const getLastFetchedTimestamp = async (platformId) => {
  return await GmailService.getLastFetchedTimestamp(platformId);
};

// Clear emails for a specific platform
export const clearEmails = async (platformId) => {
  return await GmailService.clearPlatformEmails(platformId);
};

// Get additional information from emails
export const getOrderInfo = (email, platform) => {
  return GmailService.parseEmailContent(email);
};