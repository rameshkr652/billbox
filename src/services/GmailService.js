// src/services/GmailService.js with improved token and cache management
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';
import { parseOrderDetails } from '../utils/EmailParser';

// Operation control object to handle aborts
const operationControl = {
  // AbortController instance for cancelling fetch operations
  controller: null,
  // Flag to track if operations should be aborted
  shouldAbort: false,
  
  // Create a new abort controller
  createController: function() {
    this.shouldAbort = false;
    this.controller = new AbortController();
    return this.controller.signal;
  },
  
  // Abort current operations
  abort: function() {
    if (this.controller) {
      console.log('Aborting current Gmail operations');
      this.shouldAbort = true;
      this.controller.abort();
      this.controller = null;
    }
  },
  
  // Check if operations should be aborted
  isAborted: function() {
    return this.shouldAbort;
  },
  
  // Reset abort state
  reset: function() {
    this.shouldAbort = false;
    this.controller = null;
  }
};

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

// Export the tokenCache and abort functionality so they can be accessed by other components
export { tokenCache };

// Function to abort any ongoing Gmail operations
export const abortCurrentOperation = () => {
  operationControl.abort();
  console.log('Gmail fetch operation cancelled');
};

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
    // Check if operation should be aborted
    if (operationControl.isAborted()) {
      throw new Error('Operation cancelled by user');
    }
    
    if (!accountEmail) {
      throw new Error('Account email is required for Gmail API calls');
    }
    
    // Get token from cache or refresh if needed
    const accessToken = await getAccessToken(accountEmail);
    
    console.log(`Making Gmail API call to ${endpoint} with account ${accountEmail}`);
    
    // Create abort signal if needed
    let signal = options.signal;
    if (!signal && operationControl.controller) {
      signal = operationControl.controller.signal;
    }
    
    // Make the API call
    const response = await fetch(endpoint, {
      ...options,
      signal,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    // Check again if operation should be aborted
    if (operationControl.isAborted()) {
      throw new Error('Operation cancelled by user');
    }
    
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
    // Don't log errors for cancelled operations
    if (error.name === 'AbortError' || error.message.includes('cancelled')) {
      console.log('Gmail API call was cancelled');
      throw new Error('Operation cancelled by user');
    }
    
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
    
    // Create a new abort controller for this operation
    const signal = operationControl.createController();
    
    progressCallback(0, 1, 'Preparing to fetch emails...');
    
    // Use the provided platform query or default
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    // Check for early cancellation
    if (operationControl.isAborted()) {
      throw new Error('Operation cancelled by user');
    }
    
    // List emails matching the query
    progressCallback(0, 1, 'Finding matching emails...');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=100`;
    const initialData = await callGmailApi(listUrl, accountEmail, { signal });
    
    // Check for cancellation after initial request
    if (operationControl.isAborted()) {
      throw new Error('Operation cancelled by user');
    }
    
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
      // Check for cancellation in the loop
      if (operationControl.isAborted()) {
        throw new Error('Operation cancelled by user');
      }
      
      const pageUrl = `${listUrl}&pageToken=${nextPageToken}`;
      const pageData = await callGmailApi(pageUrl, accountEmail, { signal });
      
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
      // Check for cancellation before each batch
      if (operationControl.isAborted()) {
        throw new Error('Operation cancelled by user');
      }
      
      // Get access token once per batch
      const accessToken = await getAccessToken(accountEmail);
      
      // Process this batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (messageId) => {
          // Check for cancellation for each message
          if (operationControl.isAborted()) {
            return null;
          }
          
          try {
            const response = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
              {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal
              }
            );
            
            if (!response.ok) {
              console.error(`Error fetching message ${messageId}: ${response.status}`);
              return null;
            }
            
            const messageData = await response.json();
            return extractEmailData(messageData, platform);
          } catch (error) {
            // Don't log errors for cancelled operations
            if (error.name === 'AbortError' || error.message.includes('cancelled')) {
              return null;
            }
            console.error(`Error processing message ${messageId}:`, error);
            return null;
          }
        })
      );
      
      // Check again after batch completion
      if (operationControl.isAborted()) {
        throw new Error('Operation cancelled by user');
      }
      
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
    
    // Check again before saving
    if (operationControl.isAborted()) {
      throw new Error('Operation cancelled by user');
    }
    
    // Save results - IMPORTANT: We now use accountEmail in the storage key
    progressCallback(allMessageIds.length, allMessageIds.length, 'Saving emails...');
    
    // For bank transactions, we won't store all emails in AsyncStorage to prevent memory issues
    // Instead, we'll store only the most recent ones (last 90 days)
    let emailsToStore = processedEmails;
    
    if (platform.startsWith('bank_')) {
      // For bank transactions, filter to keep only last 90 days of data
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      progressCallback(allMessageIds.length, allMessageIds.length, 'Filtering recent emails...');
      
      // Filter emails by date - only save recent ones
      emailsToStore = processedEmails.filter(email => {
        try {
          const emailDate = email.date ? new Date(email.date) : null;
          return emailDate && emailDate > ninetyDaysAgo;
        } catch (e) {
          // If date parsing fails, include the email by default
          return true;
        }
      });
      
      // Further limit large datasets to a maximum of 200 emails per bank
      if (emailsToStore.length > 200) {
        // Sort by date descending and take latest 200
        emailsToStore.sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateB - dateA; // Descending order
        });
        emailsToStore = emailsToStore.slice(0, 200);
      }
      
      progressCallback(allMessageIds.length, allMessageIds.length, 
        `Saving ${emailsToStore.length} recent emails...`);
    }
    
    // Use a chunked approach to save data
    const storageKey = `emails_${platform}_${accountEmail}`;
    try {
      // For very large datasets, we need to chunk the data to avoid memory issues
      if (emailsToStore.length > 30) {
        progressCallback(allMessageIds.length, allMessageIds.length, 
          'Breaking data into smaller chunks for storage...');
        
        // Store metadata about total count
        await AsyncStorage.setItem(`${storageKey}_count`, String(emailsToStore.length));
        
        // Store in smaller chunks to prevent memory/performance issues
        const CHUNK_SIZE = 15; // Even smaller chunk size to prevent timeouts
        
        // Further optimize the emails before storage by removing unnecessary data
        const optimizedEmails = emailsToStore.map(email => {
          // For bank transactions, simplify the email objects to reduce storage size
          if (platform.startsWith('bank_')) {
            const minimizedEmail = {
              id: email.id,
              date: email.date
            };
            
            // Only keep transaction details, not entire email body
            if (email.orderDetails) {
              minimizedEmail.orderDetails = email.orderDetails;
            }
            
            return minimizedEmail;
          }
          
          return email;
        });
        
        const chunks = [];
        for (let i = 0; i < optimizedEmails.length; i += CHUNK_SIZE) {
          chunks.push(optimizedEmails.slice(i, i + CHUNK_SIZE));
        }
        
        for (let i = 0; i < chunks.length; i++) {
          progressCallback(allMessageIds.length, allMessageIds.length, 
            `Saving chunk ${i+1}/${chunks.length}...`);
          
          // Add a timeout to ensure the UI can update and to prevent ANR (Application Not Responding)
          await new Promise(resolve => {
            // Use setTimeout to yield to the event loop
            setTimeout(async () => {
              try {
                // Use a smaller chunk size for the actual storage operation
                const jsonData = JSON.stringify(chunks[i]);
                
                // Add another check for cancellation
                if (operationControl.isAborted()) {
                  resolve(); // Resolve but don't store if cancelled
                  return;
                }
                
                // Use a timed promise to prevent hanging
                const storagePromise = AsyncStorage.setItem(
                  `${storageKey}_chunk_${i}`,
                  jsonData
                );
                
                // Create a timeout promise that resolves after 5 seconds
                const timeoutPromise = new Promise((timeoutResolve) => {
                  setTimeout(() => {
                    console.warn(`Storage timeout for chunk ${i+1}, continuing anyway`);
                    timeoutResolve();
                  }, 5000); // 5 second timeout
                });
                
                // Race the storage operation against the timeout
                await Promise.race([storagePromise, timeoutPromise]);
                resolve();
              } catch (error) {
                console.error(`Error saving chunk ${i+1}:`, error);
                resolve(); // Continue even if one chunk fails
              }
            }, 50); // Small delay to let UI update
          });
          
          // Every 2 chunks, add a longer pause to let React Native process queue clear
          if (i % 2 === 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        // Store the number of chunks
        await AsyncStorage.setItem(`${storageKey}_chunks`, String(chunks.length));
        progressCallback(allMessageIds.length, allMessageIds.length, 'Finalizing storage...');
      } else {
        // For smaller datasets, still use the timed approach to prevent hanging
        progressCallback(allMessageIds.length, allMessageIds.length, 'Saving emails in one batch...');
        
        await new Promise(resolve => {
          setTimeout(async () => {
            try {
              const jsonData = JSON.stringify(emailsToStore);
              
              // Use a timed promise to prevent hanging
              const storagePromise = AsyncStorage.setItem(storageKey, jsonData);
              
              // Create a timeout promise
              const timeoutPromise = new Promise((timeoutResolve) => {
                setTimeout(() => {
                  console.warn(`Storage timeout for single batch, continuing anyway`);
                  timeoutResolve();
                }, 5000);
              });
              
              await Promise.race([storagePromise, timeoutPromise]);
              resolve();
            } catch (error) {
              console.error('Error saving emails as single batch:', error);
              resolve();
            }
          }, 50);
        });
      }
      
      // Save last fetched timestamp
      progressCallback(allMessageIds.length, allMessageIds.length, 'Saving timestamp...');
      const now = Date.now();
      await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
      
      // Mark completion for user feedback with 100% progress
      progressCallback(allMessageIds.length, allMessageIds.length, 'Email processing complete!');
      
      // Signal client code that processing is truly complete to close progress indicators
      progressCallback(1000, 1000, 'COMPLETE_SIGNAL');
    } catch (error) {
      console.error('Error saving emails to storage:', error);
      throw new Error('Failed to save emails: Storage error');
    }
    
    // Reset abort controller after successful completion
    operationControl.reset();
    
    return processedEmails;
  } catch (error) {
    // Gracefully handle cancellation
    if (error.name === 'AbortError' || error.message.includes('cancelled')) {
      console.log(`Email fetch operation for ${platform} was cancelled by user`);
      return [];
    }
    
    console.error(`Error fetching platform emails for ${accountEmail}:`, error);
    throw error;
  } finally {
    // Ensure abort controller is reset
    operationControl.reset();
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
    
    // Convert platform ID to proper format for bank transactions
    let parserPlatform = platform;
    if (platform.startsWith('bank_')) {
      // Keep as is, it's already in the correct format
    }
    
    const orderDetails = parseOrderDetails(emailBodyHtml, parserPlatform);
    console.log(orderDetails,"orderDetails")
    // Return only essential data for bank transactions
    if (platform.startsWith('bank_')) {
      return {
        id: messageData.id,
        date: headers.date || 'Unknown Date',
        orderDetails: orderDetails,
        // Limited data for banks - no snippet or from field
      };
    } else {
      // Return full data for non-bank platforms
      return {
        id: messageData.id,
        subject: headers.subject || 'No Subject',
        from: headers.from || 'Unknown Sender',
        date: headers.date || 'Unknown Date',
        snippet: messageData.snippet || '',
        orderDetails: orderDetails
      };
    }
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
    
    // Check if the data is stored in chunks
    const chunksStr = await AsyncStorage.getItem(`${storageKey}_chunks`);
    
    if (chunksStr) {
      // Data is stored in chunks, need to retrieve all chunks
      const numChunks = parseInt(chunksStr, 10);
      console.log(`Data for ${platform} is stored in ${numChunks} chunks`);
      
      let allEmails = [];
      for (let i = 0; i < numChunks; i++) {
        const chunkKey = `${storageKey}_chunk_${i}`;
        const chunkData = await AsyncStorage.getItem(chunkKey);
        
        if (chunkData) {
          try {
            const chunkEmails = JSON.parse(chunkData);
            allEmails = [...allEmails, ...chunkEmails];
          } catch (parseError) {
            console.error(`Error parsing chunk ${i} for ${platform}:`, parseError);
          }
        }
      }
      
      return allEmails;
    } else {
      // Data is stored as a single item
      const emails = await AsyncStorage.getItem(storageKey);
      return emails ? JSON.parse(emails) : [];
    }
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
    const storageKey = `emails_${platform}_${accountEmail}`;
    const timestampKey = `lastFetched_${platform}_${accountEmail}`;
    
    // Check if data is stored in chunks
    const chunksStr = await AsyncStorage.getItem(`${storageKey}_chunks`);
    
    if (chunksStr) {
      // Remove all chunks
      const numChunks = parseInt(chunksStr, 10);
      console.log(`Removing ${numChunks} chunks for ${platform}`);
      
      for (let i = 0; i < numChunks; i++) {
        const chunkKey = `${storageKey}_chunk_${i}`;
        await AsyncStorage.removeItem(chunkKey);
      }
      
      // Remove chunk metadata
      await AsyncStorage.removeItem(`${storageKey}_chunks`);
      await AsyncStorage.removeItem(`${storageKey}_count`);
    }
    
    // Remove main storage key
    await AsyncStorage.removeItem(storageKey);
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
    
    // For bank transactions, filter to only keep recent emails
    let emailsToStore = emails;
    
    if (platform.startsWith('bank_')) {
      // Only keep last 90 days of data
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      // Filter emails by date
      emailsToStore = emails.filter(email => {
        try {
          const emailDate = email.date ? new Date(email.date) : null;
          return emailDate && emailDate > ninetyDaysAgo;
        } catch (e) {
          // If date parsing fails, include the email by default
          return true;
        }
      });
      
      // Further limit large datasets to avoid memory issues
      if (emailsToStore.length > 200) {
        // Sort by date descending and take latest 200
        emailsToStore.sort((a, b) => {
          const dateA = a.date ? new Date(a.date) : new Date(0);
          const dateB = b.date ? new Date(b.date) : new Date(0);
          return dateB - dateA; // Descending order
        });
        emailsToStore = emailsToStore.slice(0, 200);
      }
      
      console.log(`Filtered down to ${emailsToStore.length} recent emails for ${platform}`);
    }
    
    // Clear any existing chunks first
    await clearPlatformEmails(platform, accountEmail);
    
    // Use chunked approach for storage
    if (emailsToStore.length > 30) {
      console.log(`Using chunked storage approach for ${platform} (${emailsToStore.length} emails)`);
      
      // Store metadata
      await AsyncStorage.setItem(`${storageKey}_count`, String(emailsToStore.length));
      
      // Store in smaller chunks for better performance
      const CHUNK_SIZE = 15; // Even smaller chunk size to prevent timeouts
      
      // Further optimize the emails before storage by removing unnecessary data
      const optimizedEmails = emailsToStore.map(email => {
        // For bank transactions, simplify the email objects to reduce storage size
        if (platform.startsWith('bank_')) {
          const minimizedEmail = {
            id: email.id,
            date: email.date
          };
          
          // Only keep transaction details, not entire email body
          if (email.orderDetails) {
            minimizedEmail.orderDetails = email.orderDetails;
          }
          
          return minimizedEmail;
        }
        
        return email;
      });
      
      const chunks = [];
      for (let i = 0; i < optimizedEmails.length; i += CHUNK_SIZE) {
        chunks.push(optimizedEmails.slice(i, i + CHUNK_SIZE));
      }
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`Saving chunk ${i+1}/${chunks.length} for ${platform}...`);
        
        // Add a timeout to ensure the UI can update and prevent ANR
        await new Promise(resolve => {
          // Use setTimeout to yield to the event loop
          setTimeout(async () => {
            try {
              // Stringify the data outside the timed operation
              const jsonData = JSON.stringify(chunks[i]);
              
              // Use a timed promise to prevent hanging
              const storagePromise = AsyncStorage.setItem(
                `${storageKey}_chunk_${i}`,
                jsonData
              );
              
              // Create a timeout promise that resolves after 5 seconds
              const timeoutPromise = new Promise((timeoutResolve) => {
                setTimeout(() => {
                  console.warn(`Storage timeout for chunk ${i+1}, continuing anyway`);
                  timeoutResolve();
                }, 5000); // 5 second timeout
              });
              
              // Race the storage operation against the timeout
              await Promise.race([storagePromise, timeoutPromise]);
              resolve();
            } catch (error) {
              console.error(`Error saving chunk ${i+1}:`, error);
              resolve(); // Continue even if one chunk fails
            }
          }, 50); // Small delay to let UI update
        });
        
        // Every 2 chunks, add a longer pause to let React Native process queue clear
        if (i % 2 === 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Store the number of chunks
      await AsyncStorage.setItem(`${storageKey}_chunks`, String(chunks.length));
      console.log('Finalizing storage for emails...');
    } else {
      // For smaller datasets, still use the timed approach
      console.log('Saving emails in one batch...');
      
      await new Promise(resolve => {
        setTimeout(async () => {
          try {
            const jsonData = JSON.stringify(emailsToStore);
            
            // Use a timed promise to prevent hanging
            const storagePromise = AsyncStorage.setItem(storageKey, jsonData);
            
            // Create a timeout promise
            const timeoutPromise = new Promise((timeoutResolve) => {
              setTimeout(() => {
                console.warn(`Storage timeout for single batch, continuing anyway`);
                timeoutResolve();
              }, 5000);
            });
            
            await Promise.race([storagePromise, timeoutPromise]);
            resolve();
          } catch (error) {
            console.error('Error saving emails as single batch:', error);
            resolve();
          }
        }, 50);
      });
    }
    
    // Update the last fetched timestamp with timeout
    console.log('Saving timestamp...');
    const now = Date.now();
    
    await new Promise(resolve => {
      setTimeout(async () => {
        try {
          await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
        } catch (error) {
          console.error('Error saving timestamp:', error);
        }
        resolve();
      }, 50);
    });
    
    console.log('Email storage complete!');
    
    console.log(`Saved ${emailsToStore.length} emails for ${platform} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error saving emails for ${platform} with account ${accountEmail}:`, error);
    return false;
  }
};