// Inside GmailService.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';
import * as EmailParser from '../utils/EmailParser';

// Enhanced authentication handler function
const handleAuthentication = async (accountEmail, retryCount = 0) => {
  try {
    // Maximum retry attempts to prevent infinite loops
    if (retryCount > 2) {
      throw new Error('Maximum retry attempts reached');
    }

    // First try to refresh the token
    const refreshSuccess = await AuthService.refreshTokenIfNeeded(accountEmail);
    if (!refreshSuccess) {
      console.log('Token refresh failed, attempting silent sign-in');
      
      // Try silent sign-in as a fallback
      await GoogleSignin.signInSilently();
      const tokens = await GoogleSignin.getTokens();
      
      if (!tokens || !tokens.accessToken) {
        throw new Error('Silent sign-in failed');
      }
      
      // Update the stored account with the new token
      const accounts = await AccountService.getAccounts();
      const accountIndex = accounts.findIndex(acc => acc.email === accountEmail);
      
      if (accountIndex >= 0) {
        accounts[accountIndex].accessToken = tokens.accessToken;
        await AsyncStorage.setItem('accounts', JSON.stringify(accounts));
      }
    }
    
    // Get the updated account
    const accounts = await AccountService.getAccounts();
    const account = accounts.find(acc => acc.email === accountEmail);
    
    if (!account || !account.accessToken) {
      throw new Error('Account not found or missing access token after refresh');
    }
    
    return account.accessToken;
  } catch (error) {
    console.error('Error in authentication process:', error);
    throw error;
  }
};

// Helper function for Gmail API calls with automatic token refresh
const callGmailApi = async (endpoint, accountEmail, options = {}) => {
  try {
    // Get access token with automatic refresh
    const accessToken = await handleAuthentication(accountEmail);
    
    // Make the API call
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    // Handle 401 errors with retry
    if (response.status === 401) {
      console.log('Received 401, forcing token refresh and retrying');
      
      // Force a fresh token by clearing expiry
      await AsyncStorage.removeItem(`token_expiry_${accountEmail}`);
      const newToken = await handleAuthentication(accountEmail);
      
      // Retry the request with the new token
      const retryResponse = await fetch(endpoint, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Gmail API error after retry: ${retryResponse.status}`);
      }
      
      return retryResponse.json();
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

// Fetch all emails for a platform with pagination and progress reporting
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    // Get access token with auto-refresh/re-auth
    progressCallback(0, 1, 'Authenticating...');
    
    // Use the provided platform query or default
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    // First, get the total count of matching emails more accurately
    progressCallback(0, 1, 'Counting emails...');
    
    // Use the callGmailApi helper instead of direct fetch
    const initialData = await callGmailApi(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=500`,
      accountEmail
    );
    
    // If there are more messages (nextPageToken exists), make another call to get a better estimate
    let totalCount = initialData.resultSizeEstimate || 0;
    
    // If we have messages, use the actual count as our baseline
    if (initialData.messages) {
      totalCount = Math.max(totalCount, initialData.messages.length);
      
      // If we have a nextPageToken, there are more messages than what we retrieved
      if (initialData.nextPageToken) {
        try {
          // Check if we can get additional count info
          const countData = await callGmailApi(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=1&includeSpamTrash=true`,
            accountEmail
          );
          
          // Use the larger of our counts to be safe
          totalCount = Math.max(totalCount, countData.resultSizeEstimate || 0);
        } catch (error) {
          console.log("Error getting accurate count, using available count:", totalCount);
        }
      }
    }
    
    // Make sure we have at least a minimum count to work with
    totalCount = Math.max(totalCount, 100);
    
    progressCallback(0, totalCount, `Found ${totalCount} emails to process`);
    
    // Fetch emails with pagination
    let allEmails = [];
    let pageToken = null;
    let processedCount = 0;
    
    do {
      const pageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
      
      // Use callGmailApi helper for API calls
      const data = await callGmailApi(pageUrl, accountEmail);
      
      if (!data.messages || data.messages.length === 0) {
        break;
      }
      
      // Adjust total count if we find more messages than expected
      if (processedCount + data.messages.length > totalCount) {
        totalCount = processedCount + data.messages.length + (data.nextPageToken ? 100 : 0);
      }
      
      // Process this batch of messages
      progressCallback(
        processedCount, 
        totalCount, 
        `Processing batch of emails (${processedCount + 1}-${processedCount + data.messages.length} of ${totalCount})...`
      );
      
      // For each message, process using callGmailApi
      const processedBatch = await Promise.all(
        data.messages.map(async (msg, index) => {
          try {
            // Update progress for each message processed
            if (index % 5 === 0) {
              const currentProcessed = processedCount + index;
              if (currentProcessed + 1 > totalCount) {
                totalCount = currentProcessed + 100;
              }
              
              progressCallback(
                currentProcessed,
                totalCount,
                `Processing email ${currentProcessed + 1} of ${totalCount}...`
              );
            }
            
            // Get the full message using callGmailApi
            const messageData = await callGmailApi(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
              accountEmail
            );
            
            // Extract email body for processing
            const emailBodyHtml = extractEmailBody(messageData);
            
            // Parse order details if we have email body
            const orderDetails = emailBodyHtml ? 
              EmailParser.extractZomatoOrderDetails(emailBodyHtml) : null;
            
            // Extract headers
            const headers = {};
            if (messageData.payload && messageData.payload.headers) {
              messageData.payload.headers.forEach(header => {
                headers[header.name.toLowerCase()] = header.value;
              });
            }
            
            // Format the date to include full date and time but without timezone
            let formattedDate = 'Unknown Date';
            if (headers.date) {
              try {
                const dateObj = new Date(headers.date);
                formattedDate = dateObj.toLocaleString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
              } catch (e) {
                formattedDate = headers.date;
              }
            }
            
            // Return processed email data
            return {
              id: messageData.id,
              subject: headers.subject || 'No Subject',
              from: headers.from || 'Unknown Sender',
              date: formattedDate,
              snippet: messageData.snippet || 'No preview available',
              orderDetails: orderDetails
            };
          } catch (error) {
            console.error(`Error processing message ${msg.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null results (failed fetches)
      const validEmails = processedBatch.filter(email => email !== null);

      // Check for duplicates before adding to allEmails array
      const uniqueEmails = validEmails.filter(newEmail => {
        // Skip if it's a duplicate by checking if we already have an email with the same order ID
        if (newEmail.orderDetails && newEmail.orderDetails.orderId) {
          const isDuplicate = allEmails.some(existingEmail => 
            existingEmail.orderDetails && 
            existingEmail.orderDetails.orderId === newEmail.orderDetails.orderId
          );
          return !isDuplicate;
        }
        
        // If no order details or order ID, check for duplicate by message ID
        return !allEmails.some(existingEmail => existingEmail.id === newEmail.id);
      });

      // Add only unique emails to our collection
      allEmails = [...allEmails, ...uniqueEmails];
      
      processedCount += data.messages.length;
      pageToken = data.nextPageToken;
      
    } while (pageToken && processedCount < totalCount);
    
    progressCallback(totalCount, totalCount, 'Saving emails...');
    
    // Save emails to AsyncStorage with account-specific key
    await AsyncStorage.setItem(`emails_${platform}_${accountEmail}`, JSON.stringify(allEmails));
    
    // Save last fetched timestamp
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    // Clear any previous errors
    await AsyncStorage.removeItem(`lastFetchError_${platform}_${accountEmail}`);
    
    return allEmails;
  } catch (error) {
    console.error(`Error fetching ${platform} emails:`, error);
    
    // Store error information
    try {
      const now = Date.now();
      await AsyncStorage.setItem(`lastFetchError_${platform}_${accountEmail}`, JSON.stringify({
        timestamp: now,
        error: error.message || 'Unknown error'
      }));
    } catch (storageError) {
      console.error('Error storing fetch error:', storageError);
    }
    
    throw error;
  }
};

// Helper function to extract email body
const extractEmailBody = (messageData) => {
  try {
    if (!messageData.payload) {
      throw new Error("Invalid message structure: No payload found.");
    }

    // If there's no `parts`, try getting `payload.body.data` directly
    if (!messageData.payload.parts) {
      if (messageData.payload.body && messageData.payload.body.data) {
        return decodeBase64Url(messageData.payload.body.data);
      } else {
        throw new Error("No email content found.");
      }
    }

    // Search for `text/html` or `text/plain` inside `parts`
    for (const part of messageData.payload.parts) {
      if (part.mimeType === "text/html" && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    
    // Try plain text as fallback
    for (const part of messageData.payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    throw new Error("No readable content found.");
  } catch (error) {
    console.error("Error extracting email body:", error.message);
    return null;
  }
};

// Helper function to decode base64 URL-safe strings
const decodeBase64Url = (base64UrlString) => {
  try {
    // Convert Base64URL to Base64 (replace URL-safe characters)
    let base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }

    // In React Native environment, use Buffer or atob equivalent
    if (typeof atob === 'function') {
      return atob(base64);
    } else {
      // For other environments (like React Native)
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch (e) {
    console.error('Error decoding base64:', e);
    return '';
  }
};

// Rest of your exported functions...
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
    await AsyncStorage.removeItem(`lastFetchError_${platform}_${accountEmail}`);
    return true;
  } catch (error) {
    console.error(`Error clearing ${platform} emails:`, error);
    return false;
  }
};