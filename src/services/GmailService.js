// src/services/GmailService.js with improved token and cache management
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';
import { parseOrderDetails } from '../utils/EmailParser';
import RNFS from 'react-native-fs';
import { extractCleanText } from '../utils/AIEmailParser';
import AIEmailParser from '../utils/AIEmailParser';
import { GOOGLE_WEB_CLIENT_ID } from '../config/env';

const saveJsonToFile = async (messageData) => {
  const filePath = `${RNFS.DocumentDirectoryPath}/food2.json`;

  try {
    await RNFS.writeFile(filePath, JSON.stringify(messageData, null, 2), 'utf8');
    console.log('Data saved successfully at:', filePath);
  } catch (error) {
    console.error('Error saving JSON file:', error);
  }
};
// In-memory token cache to prevent excessive validation
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

export { tokenCache };

const getAccessToken = async (accountEmail) => {
  return "ya29.a0AZYkNZgzDKq9n-cg_zpHw8gK64WWsOMQOiVcOP4WEfDaHTyzQvAZIbBga4Nw93c48GlDeS_fPFSGsjrPVL7CxA4WWkwL9GckwThR1KMky1y77bjOz94K7QNpQPm3xVz_9VmTc3WtkrfKlVhpO_4C1dUBFNE3dNclR5um1JJK8AaCgYKAdYSARASFQHGX2MiU33VPq2R2Q0MVpSgb1hgVw0177"
  try {
    if (!accountEmail) {
      throw new Error('Account email is required to get an access token');
    }
    
    console.log(`Getting access token for ${accountEmail}`);
    
    // Clear token cache for this account
    tokenCache.clearToken(accountEmail);
    
    // Try to get a fresh token from GoogleSignin
    try {
      console.log(`Attempting to get fresh token for ${accountEmail}`);
      
      // Get current user and their token
      const currentSignedInUser = await GoogleSignin.getCurrentUser();
      const currentTokens = currentSignedInUser ? await GoogleSignin.getTokens() : null;
      
      // If there's a current token, clear it explicitly
      if (currentTokens?.accessToken) {
        await GoogleSignin.clearCachedAccessToken(currentTokens.accessToken);
      }
      
      // Check if the current signed-in user matches the requested account
      if (!currentSignedInUser || currentSignedInUser.user.email !== accountEmail) {
        console.log("Signed in user doesn't match requested account, signing out");
        await GoogleSignin.signOut();
        
        // Configure GoogleSignin for the specific account
        GoogleSignin.configure({
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          accountName: accountEmail, // Hint to preselect this account
        });
        
        await GoogleSignin.hasPlayServices();
        await GoogleSignin.signIn(); // This prompts account selection if needed
      }
      
      // Fetch fresh tokens
      const tokens = await GoogleSignin.getTokens();
      console.log(`Got fresh token for ${accountEmail}`);
      
      if (tokens && tokens.accessToken) {
        tokenCache.setToken(accountEmail, tokens.accessToken, 3000);
        return tokens.accessToken;
      } else {
        throw new Error('No access token received from GoogleSignin');
      }
    } catch (googleError) {
      console.error(`Error getting token from GoogleSignin: ${googleError}`);
      throw googleError; // Let the fallback handle it
    }
  } catch (error) {
    // Fallback to refresh token if GoogleSignin fails
    try {
      const refreshResult = await AuthService.refreshTokenIfNeeded(accountEmail);
      console.log(`Token refresh result: ${refreshResult}`);
      
      const accounts = await AccountService.getAccounts();
      const account = accounts.find(acc => acc.email === accountEmail);
      
      if (!account || !account.accessToken) {
        throw new Error(`Account not found or missing access token for ${accountEmail}`);
      }
      
      tokenCache.setToken(accountEmail, account.accessToken, 3000);
      console.log(`Using refreshed token for ${accountEmail}`);
      return account.accessToken;
    } catch (refreshError) {
      console.error(`Error refreshing token: ${refreshError}`);
      throw refreshError;
    }
  }
};

/**
 * Efficient Gmail API caller that re-uses tokens when valid and forces re-login on persistent 401 errors
 */
const callGmailApi = async (endpoint, accountEmail, options = {}, retryCount = 0) => {
  try {
    if (!accountEmail) {
      throw new Error('Account email is required for Gmail API calls');
    }
    
    // Get token from cache or refresh if needed
    let accessToken = await getAccessToken(accountEmail);
    
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
        // After multiple retries, force a fresh login to get new tokens
        console.log(`Persistent 401 error for ${accountEmail}, forcing re-login...`);
        
        // Clear existing token and session
        tokenCache.clearToken(accountEmail);
        await GoogleSignin.revokeAccess();
        await GoogleSignin.signOut();

        // Configure GoogleSignin for fresh login
        GoogleSignin.configure({
          scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          webClientId: GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true, // Ensure a new refresh token is issued
        });

        // Force user to re-authenticate
        const userInfo = await GoogleSignin.signIn();
        const tokens = await GoogleSignin.getTokens();

        if (!userInfo?.data?.user || !tokens.accessToken) {
          throw new Error('Failed to obtain new credentials after forced login');
        }

        const user = userInfo.data.user;
        const newAccount = {
          id: user.id || String(Date.now()),
          email: user.email,
          name: user.name || `${user.givenName || ''} ${user.familyName || ''}`.trim(),
          photo: user.photo,
          accessToken: tokens.accessToken,
        };

        // Save new refresh token and expiry
        if (tokens.refreshToken) {
          await AsyncStorage.setItem(`refresh_token_${accountEmail}`, tokens.refreshToken);
          const expiryTime = Date.now() + (3600 * 1000); // 1 hour expiry
          await AsyncStorage.setItem(`token_expiry_${accountEmail}`, expiryTime.toString());
          tokenCache.setToken(accountEmail, tokens.accessToken, 3600);
        }

        // Update accounts list
        const accounts = await AsyncStorage.getItem('accounts');
        let accountsList = accounts ? JSON.parse(accounts) : [];
        const existingIndex = accountsList.findIndex(a => a.email === accountEmail);
        if (existingIndex >= 0) {
          accountsList[existingIndex] = newAccount; // Replace old account data
        } else {
          accountsList.push(newAccount);
        }
        await AsyncStorage.setItem('accounts', JSON.stringify(accountsList));
        await AsyncStorage.setItem('currentAccount', accountEmail);

        // Retry the API call with the new token
        accessToken = tokens.accessToken;
        const retryResponse = await fetch(endpoint, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!retryResponse.ok) {
          throw new Error(`Gmail API retry failed after re-login: ${retryResponse.status}`);
        }

        return retryResponse.json();
      }
      
      // Clear the cached token and attempt refresh
      tokenCache.clearToken(accountEmail);
      await AuthService.refreshTokenIfNeeded(accountEmail);
      
      // Retry the API call with refreshed token
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
 * Enhanced fetchAllPlatformEmails with improved deduplication and error handling
 * @param {string} platform - Platform identifier (e.g., 'zomato', 'swiggy')
 * @param {string} accountEmail - Email of the account being used
 * @param {string} platformQuery - Gmail search query for the platform
 * @param {Function} progressCallback - Callback for progress updates
 * @param {Function} setTempEmails - Optional callback to update temp emails state
 * @returns {Array} Processed email objects
 */
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}, setTempEmails = null) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    // Track processing with unique IDs to prevent duplicates
    const processedIds = new Set();
    let startTime = Date.now();
    
    progressCallback(0, 1, 'Preparing to fetch emails...');
    
    // Construct search query
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    // 1. Get existing emails first to enable proper deduplication
    progressCallback(0, 1, 'Checking existing emails...');
    const storageKey = `emails_${platform}_${accountEmail}`;
    const existingEmailsJson = await AsyncStorage.getItem(storageKey);
    const existingEmails = existingEmailsJson ? JSON.parse(existingEmailsJson) : [];
    
    // Add existing email IDs to our tracking set
    existingEmails.forEach(email => {
      if (email && email.id) {
        processedIds.add(email.id);
      }
    });
    
    // 2. Initial search with higher maxResults
    progressCallback(0, 1, 'Finding matching emails...');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=500`;
    const accessToken = await getAccessToken(accountEmail);
    
    const initialResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!initialResponse.ok) {
      throw new Error(`Failed to search emails: ${initialResponse.status}`);
    }
    
    const initialData = await initialResponse.json();
    
    if (!initialData.messages || initialData.messages.length === 0) {
      progressCallback(1, 1, 'No new emails found.');
      return existingEmails; // Return existing emails as no new ones found
    }
    
    // 3. Filter out already processed IDs to avoid duplicates
    let newMessageIds = initialData.messages
      .filter(msg => !processedIds.has(msg.id))
      .map(msg => msg.id);
    
    let nextPageToken = initialData.nextPageToken;
    const estimatedTotal = initialData.resultSizeEstimate || newMessageIds.length;
    
    progressCallback(newMessageIds.length, estimatedTotal, `Found ${newMessageIds.length} new emails...`);
    
    // 4. Collect all NEW message IDs (not already processed)
    while (nextPageToken) {
      const pageUrl = `${listUrl}&pageToken=${nextPageToken}`;
      const pageResponse = await fetch(pageUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!pageResponse.ok) {
        console.warn(`Warning: Failed to get page of results: ${pageResponse.status}`);
        break; // Continue with what we have rather than failing completely
      }
      
      const pageData = await pageResponse.json();
      
      if (pageData.messages && pageData.messages.length > 0) {
        // Filter out already processed IDs
        const pageNewIds = pageData.messages
          .filter(msg => !processedIds.has(msg.id))
          .map(msg => msg.id);
        
        newMessageIds = [...newMessageIds, ...pageNewIds];
      }
      
      nextPageToken = pageData.nextPageToken;
      progressCallback(newMessageIds.length, Math.max(estimatedTotal, newMessageIds.length), 
                      `Collecting message IDs (${newMessageIds.length})...`);
    }
    
    // If no new emails after filtering, return existing emails
    if (newMessageIds.length === 0) {
      progressCallback(1, 1, 'No new emails to process.');
      return existingEmails;
    }
    
    // 5. Process emails in larger batches for better efficiency
    const BATCH_SIZE = 25;
    const processedEmails = [];
    const failedEmails = []; // Emails needing AI processing
    const emailTProgressBar = [];
    
    // 6. Create batches of new IDs only
    const batches = [];
    for (let i = 0; i < newMessageIds.length; i += BATCH_SIZE) {
      batches.push(newMessageIds.slice(i, i + BATCH_SIZE));
    }
    
    let processedCount = 0;
    const totalNewEmails = newMessageIds.length;
    
    // 7. Process each batch of new emails
    for (const batch of batches) {
      try {
        const batchToken = await getAccessToken(accountEmail);
        
        // Process emails in parallel within each batch
        const batchPromises = batch.map(messageId => {
          return fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
            headers: { Authorization: `Bearer ${batchToken}` }
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to fetch message ${messageId}: ${response.status}`);
            }
            return response.json();
          })
          .then(messageData => {
            // Mark ID as processed to prevent duplicates
            processedIds.add(messageId);
            
            const processedEmail = extractEmailData(messageData, platform);
            
            // Check if processing failed (missing restaurant or items)
            if (processedEmail && processedEmail.orderDetails) {
              const { restaurantName, orderItems } = processedEmail.orderDetails;
              
              // Track for progress updates
              if (emailTProgressBar && setTempEmails) {
                emailTProgressBar.push(processedEmail.orderDetails);
              }
              
              if (!restaurantName || !orderItems || orderItems.length === 0) {
                // Mark for AI processing
                const emailHtmlAi = extractEmailBody(messageData);
                const textToAi = extractCleanText(emailHtmlAi);
                failedEmails.push({
                  ...processedEmail,
                  emailBodyHtml: textToAi,
                  messageId
                });
                return null; // Skip for now, will process with AI later
              }
            }
            
            return processedEmail;
          })
          .catch(error => {
            console.warn(`Error processing message ${messageId}:`, error.message);
            return null; // Don't let one failure stop the whole batch
          });
        });
        
        // Wait for all emails in batch to process
        const batchResults = await Promise.all(batchPromises);
        const validResults = batchResults.filter(result => result !== null);
        processedEmails.push(...validResults);
        
        // Update progress
        processedCount += batch.length;
        const percentComplete = Math.min(0.9, processedCount / totalNewEmails);
        
        // Calculate time estimates based on current progress
        const currentTime = Date.now();
        const elapsedMs = currentTime - startTime;
        const estimatedTotalMs = processedCount > 0 ? (elapsedMs / processedCount) * totalNewEmails : 0;
        const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
        const estimatedTimeRemaining = Math.round(remainingMs / 1000);
        
        progressCallback(
          processedCount,
          totalNewEmails,
          `Processing emails (${processedCount}/${totalNewEmails})...`,
          estimatedTimeRemaining
        );
        
        // Update temporary emails for UI if callback provided
        if (emailTProgressBar.length && setTempEmails) {
          setTempEmails(emailTProgressBar);
        }
      } catch (batchError) {
        console.error('Error processing batch:', batchError);
        // Continue with next batch instead of failing completely
      }
    }
    
    // 8. Process failed emails with AI
    let aiProcessedEmails = [];
    // if (failedEmails.length > 0) {
    //   // Track AI processing start time for accurate time estimation
    //   const aiStartTime = Date.now();
    //   const totalToProcess = totalNewEmails;
    //   const aiEmailCount = failedEmails.length;
      
    //   // Initial AI progress update
    //   progressCallback(
    //     processedCount,
    //     totalToProcess,
    //     `Processing ${aiEmailCount} complex emails with AI...`,
    //     Math.round((aiEmailCount * 5000) / 1000) // Rough estimate: 5 seconds per email
    //   );
      
    //   // Process emails in smaller AI batches to provide progress updates
    //   const AI_BATCH_SIZE = 2;
      
    //   for (let i = 0; i < failedEmails.length; i += AI_BATCH_SIZE) {
    //     const aiBatch = failedEmails.slice(i, i + AI_BATCH_SIZE);
    //     console.log(failedEmails, "failedEmails");
    //     // Process this AI batch
    //     const aiBatchResults = await AIEmailParser.processEmailBatch(aiBatch, platform);
    //     aiProcessedEmails.push(...aiBatchResults);
        
    //     // Update progress after each AI batch
    //     const aiProcessedCount = Math.min(i + AI_BATCH_SIZE, failedEmails.length);
    //     const totalProcessedCount = processedCount + aiProcessedCount;
        
    //     // Recalculate remaining time based on actual progress
    //     const currentTime = Date.now();
    //     const aiElapsedMs = currentTime - aiStartTime;
    //     const aiRemainingCount = failedEmails.length - aiProcessedCount;
        
    //     // Calculate actual ms per AI email based on progress so far
    //     const actualMsPerAiEmail = aiProcessedCount > 0 ? aiElapsedMs / aiProcessedCount : 5000;
    //     const remainingAiTimeMs = actualMsPerAiEmail * aiRemainingCount;
        
    //     progressCallback(
    //       totalProcessedCount,
    //       totalToProcess,
    //       `AI processing: ${aiProcessedCount}/${aiEmailCount} complex emails...`,
    //       Math.round(remainingAiTimeMs / 1000)
    //     );
    //   }
    // }
    
    // 9. Combine all processed emails and use the improved merger function
    progressCallback(totalNewEmails, totalNewEmails, 'Merging and saving emails...');
    
    // Combine regular and AI processed emails
    const allNewEmails = [...processedEmails, ...aiProcessedEmails];
    // Use the improved merge function to avoid duplicates
    const mergedEmails = improvedMergeWithoutDuplicates(existingEmails, allNewEmails);
    await saveJsonToFile(mergedEmails)
    
    // Save all processed emails at once
    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedEmails));
    
    // Update last fetched timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return mergedEmails;
  } catch (error) {
    console.error(`Error fetching platform emails for ${accountEmail}:`, error);
    throw error;
  }
};

// Import the improvedMergeWithoutDuplicates function definition here or place it above


/**
 * Extract and normalize email data
 */
const extractEmailData = (messageData, platform) => {
  try {
    if (!messageData || !messageData.payload) {
      return null;
    }
    
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
    
    const findBodyContent = (part, preferredMimeType = null) => {
      if (!part) return null;
      
      if (part.body && part.body.data) {
        if (!preferredMimeType || part.mimeType === preferredMimeType) {
          return part.body.data;
        }
      }
      
      if (part.parts && part.parts.length > 0) {
        for (const childPart of part.parts) {
          const content = findBodyContent(childPart, preferredMimeType);
          if (content) return content;
        }
      }
      
      return null;
    };
    
    let bodyData = findBodyContent(messageData.payload, 'text/html');
    
    if (!bodyData) {
      bodyData = findBodyContent(messageData.payload, 'text/plain');
    }
    
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
    
    let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
    
    while (base64.length % 4) {
      base64 += '=';
    }
    
    if (typeof atob === 'function') {
      return atob(base64);
    } else {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch (error) {
    console.error('Error decoding Base64:', error);
    return '';
  }
};

/**
 * Utility methods for storage
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
    
    tokenCache.clearToken(accountEmail);
    
    return true;
  } catch (error) {
    console.error(`Error clearing ${platform} emails for ${accountEmail}:`, error);
    return false;
  }
};

export const fetchLatestEmails = async (platform, accountEmail, lastFetchedDate, progressCallback = () => {},  setTempEmails) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided for fetching latest emails');
    }
    
    console.log(`Fetching latest emails for ${platform} with account ${accountEmail}`);
    
    const formatDate = (date) => {
      return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
    };
    
    const queryDate = new Date(lastFetchedDate.getTime() - (12 * 60 * 60 * 1000));
    const dateQuery = `after:${formatDate(queryDate)}`;
    
    const platformQuery = `from:${platform}.com ${dateQuery}`;
    
    const newEmails = await fetchAllPlatformEmails(platform, accountEmail, platformQuery, progressCallback, setTempEmails);
    
    const existingEmails = await getPlatformEmails(platform, accountEmail);
    
    const mergedEmails = mergeWithoutDuplicates(existingEmails, newEmails);
    
    const storageKey = `emails_${platform}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(mergedEmails));
    
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return mergedEmails;
  } catch (error) {
    console.error(`Error fetching latest emails for ${platform} with ${accountEmail}:`, error);
    throw error;
  }
};
/**
 * Improved function to merge email arrays without duplicates
 * Uses multiple identifying properties to prevent duplicates
 * @param {Array} existingEmails - Array of existing email objects
 * @param {Array} newEmails - Array of new email objects to merge
 * @returns {Array} Merged array without duplicates
 */
const improvedMergeWithoutDuplicates = (existingEmails, newEmails) => {
  if (!existingEmails || existingEmails.length === 0) {
    return newEmails || [];
  }
  
  if (!newEmails || newEmails.length === 0) {
    return existingEmails;
  }
  
  // Create a Map to track existing emails by multiple keys
  const emailMap = new Map();
  const idMap = new Map(); // For tracking by message ID only
  
  // Helper function to generate a composite key with fallbacks
  const generateKey = (email) => {
    // Primary key - order ID if available
    if (email.orderDetails?.orderId) {
      return `orderId:${email.orderDetails.orderId}`;
    }
    
    // Secondary key - combination of restaurant name and date if available
    if (email.orderDetails?.restaurantName && email.date) {
      const dateStr = new Date(email.date).toISOString().split('T')[0]; // Just the date part
      return `restaurant:${email.orderDetails.restaurantName}:date:${dateStr}`;
    }
    
    // Fallback - message ID
    return `id:${email.id}`;
  };
  
  // Add existing emails to the map
  existingEmails.forEach(email => {
    if (!email) return; // Skip null/undefined entries
    
    const compositeKey = generateKey(email);
    emailMap.set(compositeKey, email);
    
    // Also track by ID to catch duplicate message IDs
    idMap.set(email.id, email);
  });
  
  // Add new emails, avoiding duplicates
  newEmails.forEach(email => {
    if (!email) return; // Skip null/undefined entries
    
    const compositeKey = generateKey(email);
    
    // Check if this email already exists by composite key
    if (!emailMap.has(compositeKey)) {
      // Also check if the message ID exists
      if (!idMap.has(email.id)) {
        emailMap.set(compositeKey, email);
        idMap.set(email.id, email);
      } else {
        // If message ID exists but composite key doesn't, the data might have been 
        // enhanced. Compare and use the more detailed entry.
        const existingEmail = idMap.get(email.id);
        
        // If the new email has order details and the existing one doesn't,
        // or the new one has more order items, use the new one
        if (
          (email.orderDetails && !existingEmail.orderDetails) ||
          (email.orderDetails?.orderItems?.length > (existingEmail.orderDetails?.orderItems?.length || 0))
        ) {
          const existingKey = generateKey(existingEmail);
          emailMap.delete(existingKey);
          emailMap.set(compositeKey, email);
          idMap.set(email.id, email);
        }
      }
    }
  });
  
  // Convert map back to array
  return Array.from(emailMap.values());
};
/**
 * Save emails for a specific platform and account
 */
export const saveEmails = async (platform, accountEmail, emails) => {
  try {
    if (!platform || !accountEmail) {
      console.error('Missing platform or account email for saving emails');
      return false;
    }
    
    const storageKey = `emails_${platform}_${accountEmail}`;
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(emails));
    
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    console.log(`Saved ${emails.length} emails for ${platform} with account ${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error saving emails for ${platform} with ${accountEmail}:`, error);
    return false;
  }
};