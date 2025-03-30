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
  const filePath = `${RNFS.DocumentDirectoryPath}/saveJsonToFile.json`;

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
// fetchAllPlatformEmails with AI fallback integration
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    progressCallback(0, 1, 'Preparing to fetch emails...');
    
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    progressCallback(0, 1, 'Finding matching emails...');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=100`;
    const initialData = await callGmailApi(listUrl, accountEmail);
    
    if (!initialData.messages || initialData.messages.length === 0) {
      progressCallback(1, 1, 'No emails found.');
      return [];
    }
    
    const totalCount = initialData.resultSizeEstimate || initialData.messages.length;
    progressCallback(0, totalCount, `Found ${totalCount} emails. Processing...`);
    
    let allMessageIds = initialData.messages.map(msg => msg.id);
    let nextPageToken = initialData.nextPageToken;
    
    while (nextPageToken) {
      const pageUrl = `${listUrl}&pageToken=${nextPageToken}`;
      const pageData = await callGmailApi(pageUrl, accountEmail);
      
      if (pageData.messages && pageData.messages.length > 0) {
        allMessageIds = [...allMessageIds, ...pageData.messages.map(msg => msg.id)];
      }
      
      nextPageToken = pageData.nextPageToken;
      progressCallback(allMessageIds.length, totalCount, `Collecting message IDs (${allMessageIds.length})...`);
    }
    
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
      batches.push(allMessageIds.slice(i, i + BATCH_SIZE));
    }
    
    const processedEmails = [];
    const failedEmails = []; // Collect emails where regex parsing fails
    let processedCount = 0;
    
    for (const batch of batches) {
      const accessToken = await getAccessToken(accountEmail);
      
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
            const processedEmail = extractEmailData(messageData, platform);
            
            // Check if processing failed (missing restaurant or items)
            if (processedEmail && processedEmail.orderDetails) {
              const { restaurantName, orderItems } = processedEmail.orderDetails;
              if (!restaurantName || !orderItems || orderItems.length === 0) {
                // Mark for AI processing
                const emailHtmlAi = extractEmailBody(messageData);
                const textToAi = extractCleanText(emailHtmlAi);
                failedEmails.push({
                  ...processedEmail,
                  emailBodyHtml: textToAi, // Save full HTML for AI processing
                  messageId
                });
                return null; // Skip this for now, we'll process it with AI
              }
            }
            
            return processedEmail;
          } catch (error) {
            console.error(`Error processing message ${messageId}:`, error);
            return null;
          }
        })
      );
      
      const validResults = batchResults.filter(result => result !== null);
      processedEmails.push(...validResults);
      
      processedCount += batch.length;
      progressCallback(
        processedCount,
        allMessageIds.length,
        `Processing emails (${processedCount}/${allMessageIds.length})...`
      );
    }
    
    // If we have failed emails that need AI processing
    if (failedEmails.length > 0) {
      progressCallback(
        processedCount,
        allMessageIds.length,
        `Processing ${failedEmails.length} complex emails with AI...`
      );      
      const aiProcessedEmails = await AIEmailParser.processEmailBatch(failedEmails, platform);
      
      // Add the AI-processed emails to our results
      processedEmails.push(...aiProcessedEmails);
    }
    await saveJsonToFile(processedEmails);
    progressCallback(allMessageIds.length, allMessageIds.length, 'Saving emails...');
    const storageKey = `emails_${platform}_${accountEmail}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(processedEmails));
    
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

export const fetchLatestEmails = async (platform, accountEmail, lastFetchedDate, progressCallback = () => {}) => {
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
    
    const newEmails = await fetchAllPlatformEmails(platform, accountEmail, platformQuery, progressCallback);
    
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
 * Helper to merge emails without duplicates
 */
const mergeWithoutDuplicates = (existingEmails, newEmails) => {
  if (!existingEmails || existingEmails.length === 0) {
    return newEmails || [];
  }
  
  if (!newEmails || newEmails.length === 0) {
    return existingEmails;
  }
  
  const emailMap = new Map();
  
  existingEmails.forEach(email => {
    const key = email.orderDetails?.orderId || email.id;
    emailMap.set(key, email);
  });
  
  newEmails.forEach(email => {
    const key = email.orderDetails?.orderId || email.id;
    if (!emailMap.has(key)) {
      emailMap.set(key, email);
    }
  });
  
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