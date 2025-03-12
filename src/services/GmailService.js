// src/services/GmailService.js with token caching
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';

// In-memory token cache to prevent excessive validation
const tokenCache = {
  tokens: {},
  expiryTimes: {},
  isValidToken: function(accountEmail) {
    if (!this.tokens[accountEmail]) return false;
    
    const expiryTime = this.expiryTimes[accountEmail] || 0;
    return expiryTime > Date.now();
  },
  getToken: function(accountEmail) {
    return this.tokens[accountEmail];
  },
  setToken: function(accountEmail, token, expiresInSeconds = 3600) {
    this.tokens[accountEmail] = token;
    this.expiryTimes[accountEmail] = Date.now() + (expiresInSeconds * 1000);
  },
  clearToken: function(accountEmail) {
    delete this.tokens[accountEmail];
    delete this.expiryTimes[accountEmail];
  }
};

/**
 * Get a valid access token, using cache when possible to prevent validation overhead
 */
const getAccessToken = async (accountEmail) => {
  try {
    // Check memory cache first
    if (tokenCache.isValidToken(accountEmail)) {
      return tokenCache.getToken(accountEmail);
    }
    
    // Try getting a fresh token
    console.log(`Cache miss for ${accountEmail}, obtaining fresh token...`);
    const accounts = await AccountService.getAccounts();
    const account = accounts.find(acc => acc.email === accountEmail);
    
    if (!account || !account.accessToken) {
      throw new Error('Account not found or missing access token');
    }
    
    // Store in cache with expiry time (50 minutes to be safe)
    tokenCache.setToken(accountEmail, account.accessToken, 3000);
    
    return account.accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

/**
 * Efficient gmail API caller that re-uses tokens when valid
 */
const callGmailApi = async (endpoint, accountEmail, options = {}, retryCount = 0) => {
  try {
    // Get token from cache or refresh if needed
    const accessToken = await getAccessToken(accountEmail);
    
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

/**
 * IMPORTANT: Keep the original function name for compatibility
 * Batch processing of emails to reduce API calls
 */
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
    
    // Save results
    progressCallback(allMessageIds.length, allMessageIds.length, 'Saving emails...');
    await AsyncStorage.setItem(`emails_${platform}_${accountEmail}`, JSON.stringify(processedEmails));
    
    // Save last fetched timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return processedEmails;
  } catch (error) {
    console.error(`Error fetching platform emails:`, error);
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
    
    const emailBody = extractEmailBody(messageData);
    const orderDetails = parseOrderDetails(emailBody, platform);
    
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
 * Extract order details from email content
 */
const parseOrderDetails = (emailBody, platform) => {
  if (!emailBody) return null;
  
  try {
    const orderDetails = {
      restaurantName: null,
      orderItems: [],
      totalPrice: null,
      orderId: null,
      orderStatus: null
    };
    
    // Extract order ID
    const orderIdMatch = emailBody.match(/ORDER ID:?\s*(\d+)/i) || 
                          emailBody.match(/Order\s+#\s*([A-Z0-9-]+)/i);
    if (orderIdMatch && orderIdMatch[1]) {
      orderDetails.orderId = orderIdMatch[1].trim();
    }
    
    // Extract status
    const statusMatch = emailBody.match(/\b(Delivered|Processing|Cancelled|Confirmed|Out for Delivery)\b/i);
    if (statusMatch) {
      orderDetails.orderStatus = statusMatch[1];
    }
    
    // Extract restaurant name (platform specific)
    if (platform === 'zomato') {
      const nameMatch = emailBody.match(/Thank you for ordering.*?from\s+(.*?)\s*ORDER ID/i);
      if (nameMatch && nameMatch[1]) {
        orderDetails.restaurantName = nameMatch[1].trim();
      }
    }
    
    // Extract price
    const priceMatch = emailBody.match(/Total\s*(paid|amount|price)?:?\s*[₹₨Rs.]*\s*(\d+([.,]\d+)?)/i);
    if (priceMatch && priceMatch[2]) {
      orderDetails.totalPrice = priceMatch[2].trim();
    }
    
    return orderDetails;
  } catch (error) {
    console.error('Error parsing order details:', error);
    return null;
  }
};

/**
 * Utility methods for storage
 */
export const getPlatformEmails = async (platform, accountEmail) => {
  try {
    if (!accountEmail) return [];
    
    const emails = await AsyncStorage.getItem(`emails_${platform}_${accountEmail}`);
    return emails ? JSON.parse(emails) : [];
  } catch (error) {
    console.error(`Error getting ${platform} emails from storage:`, error);
    return [];
  }
};

export const getLastFetchedTimestamp = async (platform, accountEmail) => {
  try {
    if (!accountEmail) return null;
    
    const timestamp = await AsyncStorage.getItem(`lastFetched_${platform}_${accountEmail}`);
    return timestamp ? parseInt(timestamp) : null;
  } catch (error) {
    console.error(`Error getting last fetched timestamp for ${platform}:`, error);
    return null;
  }
};

export const clearPlatformEmails = async (platform, accountEmail) => {
  try {
    if (!accountEmail) return false;
    
    await AsyncStorage.removeItem(`emails_${platform}_${accountEmail}`);
    await AsyncStorage.removeItem(`lastFetched_${platform}_${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error clearing ${platform} emails:`, error);
    return false;
  }
};

export const fetchLatestEmails = async (platform, accountEmail, lastFetchedDate, progressCallback = () => {}) => {
  try {
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
    
    // Save merged result
    await AsyncStorage.setItem(`emails_${platform}_${accountEmail}`, JSON.stringify(mergedEmails));
    
    // Update timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return mergedEmails;
  } catch (error) {
    console.error(`Error fetching latest emails:`, error);
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