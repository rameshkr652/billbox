// src/services/GmailService.js with improved token and cache management
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';
import { parseOrderDetails } from '../utils/EmailParser';

// In-memory token cache to prevent excessive validation
// Fixed to be more secure and account-specific
const tokenCache = {
  tokens: {},
  expiryTimes: {},
  isValidToken: function(accountEmail) {
    if (!accountEmail || !this.tokens[accountEmail]) return false;
    
    const expiryTime = this.expiryTimes[accountEmail] || 0;
    return expiryTime > Date.now();
  },
  getToken: function(accountEmail) {
    return accountEmail ? this.tokens[accountEmail] : null;
  },
  setToken: function(accountEmail, token, expiresInSeconds = 3600) {
    if (!accountEmail || !token) return;
    
    this.tokens[accountEmail] = token;
    this.expiryTimes[accountEmail] = Date.now() + (expiresInSeconds * 1000);
    
    console.log(`Token cached for ${accountEmail}, expires in ${expiresInSeconds} seconds`);
  },
  clearToken: function(accountEmail) {
    if (!accountEmail) return;
    
    delete this.tokens[accountEmail];
    delete this.expiryTimes[accountEmail];
    console.log(`Token cache cleared for ${accountEmail}`);
  },
  clearAllTokens: function() {
    this.tokens = {};
    this.expiryTimes = {};
    console.log('All token caches cleared');
  }
};

// Export the tokenCache so it can be accessed by other components
export { tokenCache };

/**
 * Get a valid access token, using cache when possible to prevent validation overhead
 */
const getAccessToken = async (accountEmail) => {
  try {
    if (!accountEmail) {
      throw new Error('Account email is required to get an access token');
    }
    
    // Check memory cache first
    if (tokenCache.isValidToken(accountEmail)) {
      return tokenCache.getToken(accountEmail);
    }
    
    // Try getting a fresh token
    console.log(`Cache miss for ${accountEmail}, obtaining fresh token...`);
    
    // Try to refresh token first
    const refreshResult = await AuthService.refreshTokenIfNeeded(accountEmail);
    
    // Get account with refreshed token
    const accounts = await AccountService.getAccounts();
    const account = accounts.find(acc => acc.email === accountEmail);
    
    if (!account || !account.accessToken) {
      throw new Error(`Account not found or missing access token for ${accountEmail}`);
    }
    
    // Store in cache with expiry time (50 minutes to be safe)
    tokenCache.setToken(accountEmail, account.accessToken, 3000);
    
    return account.accessToken;
  } catch (error) {
    console.error(`Error getting access token for ${accountEmail}:`, error);
    throw error;
  }
};

/**
 * Efficient gmail API caller that re-uses tokens when valid
 */
const callGmailApi = async (endpoint, accountEmail, options = {}, retryCount = 0) => {
  try {
    if (!accountEmail) {
      throw new Error('Account email is required for Gmail API calls');
    }
    
    // Get token from cache or refresh if needed
    const accessToken = await getAccessToken(accountEmail);
    
    console.log(`Making Gmail API call to ${endpoint} with account ${accountEmail}`);
    
    // Make the API call
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    // Handle 401 unauthorized - token might be invalid
    if (response.status === 401) {
      if (retryCount >= 2) {
        throw new Error('Authentication failed after multiple retries');
      }
      
      // Clear the cached token
      tokenCache.clearToken(accountEmail);
      
      // Force token refresh
      await AuthService.refreshTokenIfNeeded(accountEmail);
      
      // Retry the API call
      return callGmailApi(endpoint, accountEmail, options, retryCount + 1);
    }
    
    // Handle rate limiting with exponential backoff
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      console.log(`Rate limited, waiting ${retryAfter} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return callGmailApi(endpoint, accountEmail, options, retryCount);
    }
    
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error calling Gmail API:', error);
    throw error;
  }
};

// src/services/GmailService.js (continued)
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    progressCallback(0, 1, 'Preparing to fetch emails...');
    
    // Use the provided platform query or default
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    // List emails matching the query
    progressCallback(0, 1, 'Finding matching emails...');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=100`;
    const initialData = await callGmailApi(listUrl, accountEmail);
    // console.log(initialData,"ss")
    if (!initialData.messages || initialData.messages.length === 0) {
      progressCallback(1, 1, 'No emails found.');
      return [];
    }
    
    // Get approximate total count
    const totalCount = initialData.resultSizeEstimate || initialData.messages.length;
    progressCallback(0, totalCount, `Found ${totalCount} emails. Processing...`);
    
    // Collect all message IDs
    let allMessageIds = initialData.messages.map(msg => msg.id);
    let nextPageToken = initialData.nextPageToken;
    
    // Get remaining message IDs if there are more pages
    while (nextPageToken) {
      const pageUrl = `${listUrl}&pageToken=${nextPageToken}`;
      const pageData = await callGmailApi(pageUrl, accountEmail);
      
      if (pageData.messages && pageData.messages.length > 0) {
        allMessageIds = [...allMessageIds, ...pageData.messages.map(msg => msg.id)];
      }
      
      nextPageToken = pageData.nextPageToken;
      progressCallback(allMessageIds.length, totalCount, `Collecting message IDs (${allMessageIds.length})...`);
    }
    
    // Process emails in batches to improve performance
    const BATCH_SIZE = 10; // Process 10 emails at a time
    const batches = [];
    
    for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
      batches.push(allMessageIds.slice(i, i + BATCH_SIZE));
    }
    
    const processedEmails = [];
    let processedCount = 0;
    
    // Process each batch with a single token validation
    for (const batch of batches) {
      // Get access token once per batch
      const accessToken = await getAccessToken(accountEmail);
      
      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (messageId) => {
          try {
            const response = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
              {
                headers: { Authorization: `Bearer ${accessToken}` }
              }
            );
            
            if (!response.ok) {
              console.error(`Error fetching message ${messageId}: ${response.status}`);
              return null;
            }
            
            const messageData = await response.json();
            return extractEmailData(messageData, platform);
          } catch (error) {
            console.error(`Error processing message ${messageId}:`, error);
            return null;
          }
        })
      );
      
      // Add valid results to our collection
      const validResults = batchResults.filter(result => result !== null);
      processedEmails.push(...validResults);
      
      // Update progress
      processedCount += batch.length;
      progressCallback(
        processedCount,
        allMessageIds.length,
        `Processing emails (${processedCount}/${allMessageIds.length})...`
      );
    }
    
    // Save results - IMPORTANT: We now use accountEmail in the storage key
    progressCallback(allMessageIds.length, allMessageIds.length, 'Saving emails...');
    const storageKey = `emails_${platform}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(processedEmails));
    
    // Save last fetched timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return processedEmails;
  } catch (error) {
    console.error(`Error fetching platform emails for ${accountEmail}:`, error);
    throw error;
  }
};

/**
 * Extract and normalize email data
 */
const extractEmailData = (messageData, platform) => {
  try {
    if (!messageData || !messageData.payload) {
      return null;
    }
    
    // Extract headers
    const headers = {};
    if (messageData.payload.headers) {
      messageData.payload.headers.forEach(header => {
        headers[header.name.toLowerCase()] = header.value;
      });
    }
    
    const emailBodyHtml = extractEmailBody(messageData);
    const orderDetails = parseOrderDetails(emailBodyHtml, platform);
    
    return {
      id: messageData.id,
      subject: headers.subject || 'No Subject',
      from: headers.from || 'Unknown Sender',
      date: headers.date || 'Unknown Date',
      snippet: messageData.snippet || '',
      orderDetails: orderDetails
    };
  } catch (error) {
    console.error('Error extracting email data:', error);
    return null;
  }
};

/**
 * Extract email body with improved MIME handling
 */
const extractEmailBody = (messageData) => {
  try {
    if (!messageData.payload) {
      return '';
    }
    
    // Try to find HTML content first, then plain text
    const findBodyContent = (part, preferredMimeType = null) => {
      if (!part) return null;
      
      // Check if this part has the body content
      if (part.body && part.body.data) {
        if (!preferredMimeType || part.mimeType === preferredMimeType) {
          return part.body.data;
        }
      }
      
      // Recursively check nested parts
      if (part.parts && part.parts.length > 0) {
        for (const childPart of part.parts) {
          const content = findBodyContent(childPart, preferredMimeType);
          if (content) return content;
        }
      }
      
      return null;
    };
    
    // Try HTML first
    let bodyData = findBodyContent(messageData.payload, 'text/html');
    
    // Fall back to plain text if no HTML
    if (!bodyData) {
      bodyData = findBodyContent(messageData.payload, 'text/plain');
    }
    
    // Last resort: any content
    if (!bodyData && messageData.payload.body && messageData.payload.body.data) {
      bodyData = messageData.payload.body.data;
    }
    
    if (bodyData) {
      return decodeBase64Url(bodyData);
    }
    
    return '';
  } catch (error) {
    console.error('Error extracting email body:', error);
    return '';
  }
};

/**
 * Decode base64 URL-encoded content
 */
const decodeBase64Url = (base64UrlString) => {
  try {
    if (!base64UrlString) return '';
    
    // Convert Base64URL to Base64
    let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode
    if (typeof atob === 'function') {
      // Browser environment
      return atob(base64);
    } else {
      // React Native environment
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch (error) {
    console.error('Error decoding Base64:', error);
    return '';
  }
};
/**
 * Utility methods for storage - IMPORTANT: These now use accountEmail in the keys
 */
export const getPlatformEmails = async (platform, accountEmail) => {
  try {
    if (!accountEmail) {
      console.warn(`getPlatformEmails: No account email provided for ${platform}`);
      return [];
    }
    
    console.log(`Getting emails for ${platform} with account ${accountEmail}`);
    const storageKey = `emails_${platform}_${accountEmail}`;
    const emails = await AsyncStorage.getItem(storageKey);
    return emails ? JSON.parse(emails) : [];
  } catch (error) {
    console.error(`Error getting ${platform} emails from storage for ${accountEmail}:`, error);
    return [];
  }
};

export const getLastFetchedTimestamp = async (platform, accountEmail) => {
  try {
    if (!accountEmail) {
      console.warn(`getLastFetchedTimestamp: No account email provided for ${platform}`);
      return null;
    }
    
    const storageKey = `lastFetched_${platform}_${accountEmail}`;
    const timestamp = await AsyncStorage.getItem(storageKey);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error(`Error getting last fetched timestamp for ${platform} with ${accountEmail}:`, error);
    return null;
  }
};

export const clearPlatformEmails = async (platform, accountEmail) => {
  try {
    if (!accountEmail) {
      console.warn(`clearPlatformEmails: No account email provided for ${platform}`);
      return false;
    }
    
    console.log(`Clearing emails for ${platform} with account ${accountEmail}`);
    const emailsKey = `emails_${platform}_${accountEmail}`;
    const timestampKey = `lastFetched_${platform}_${accountEmail}`;
    
    await AsyncStorage.removeItem(emailsKey);
    await AsyncStorage.removeItem(timestampKey);
    
    // Also clear token cache for this account to force fresh token on next operation
    tokenCache.clearToken(accountEmail);
    
    return true;
  } catch (error) {
    console.error(`Error clearing ${platform} emails for ${accountEmail}:`, error);
    return false;
  }
};

export const fetchLatestEmails = async (platform, accountEmail, lastFetchedDate, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided for fetching latest emails');
    }
    
    console.log(`Fetching latest emails for ${platform} with account ${accountEmail}`);
    
    // Format date for Gmail query (YYYY/MM/DD)
    const formatDate = (date) => {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };
    
    // Create query with date filter, subtracting a buffer to ensure no emails are missed
    const queryDate = new Date(lastFetchedDate.getTime() - (12 * 60 * 60 * 1000)); // 12-hour buffer
    const dateQuery = `after:${formatDate(queryDate)}`;
    
    // Find platform query or use default
    const platformQuery = `from:${platform}.com ${dateQuery}`;
    
    // Get new emails
    const newEmails = await fetchAllPlatformEmails(platform, accountEmail, platformQuery, progressCallback);
    
    // Get existing emails
    const existingEmails = await getPlatformEmails(platform, accountEmail);
    
    // Merge without duplicates
    const mergedEmails = mergeWithoutDuplicates(existingEmails, newEmails);
    
    // Save merged result using the correct account-specific key
    const storageKey = `emails_${platform}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedEmails));
    
    // Update timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return mergedEmails;
  } catch (error) {
    console.error(`Error fetching latest emails for ${platform} with ${accountEmail}:`, error);
    throw error;
  }
};

/**
 * Helper to merge emails without duplicates
 */
const mergeWithoutDuplicates = (existingEmails, newEmails) => {
  if (!existingEmails || existingEmails.length === 0) {
    return newEmails || [];
  }
  
  if (!newEmails || newEmails.length === 0) {
    return existingEmails;
  }
  
  // Use a Map for O(1) lookups
  const emailMap = new Map();
  
  // Add existing emails to map
  existingEmails.forEach(email => {
    const key = email.orderDetails?.orderId || email.id;
    emailMap.set(key, email);
  });
  
  // Add new emails if not duplicates
  newEmails.forEach(email => {
    const key = email.orderDetails?.orderId || email.id;
    if (!emailMap.has(key)) {
      emailMap.set(key, email);
    }
  });
  
  // Convert map back to array
  return Array.from(emailMap.values());
};

// Add this to GmailService.js

/**
 * Save emails for a specific platform and account
 * @param {string} platform - The platform identifier
 * @param {string} accountEmail - The email of the account
 * @param {Array} emails - The array of emails to save
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export const saveEmails = async (platform, accountEmail, emails) => {
  try {
    if (!platform || !accountEmail) {
      console.error('Missing platform or account email for saving emails');
      return false;
    }
    
    // Create the platform-specific, account-specific storage key
    const storageKey = `emails_${platform}_${accountEmail}`;
    
    // Save the emails to storage
    await AsyncStorage.setItem(storageKey, JSON.stringify(emails));
    
    // Update the last fetched timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    console.log(`Saved ${emails.length} emails for ${platform} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error saving emails for ${platform} with account ${accountEmail}:`, error);
    return false;
  }
};