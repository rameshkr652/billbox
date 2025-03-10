// src/services/GmailService.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';

// Helper function to handle authentication
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

// Fetch all emails for a platform with pagination and progress reporting
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    // Get access token with auto-refresh/re-auth
    progressCallback(0, 1, 'Authenticating...');
    let accessToken;
    try {
      accessToken = await handleAuthentication(accountEmail);
    } catch (authError) {
      console.error('Authentication failed:', authError);
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    // Use the provided platform query or default
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    // First, get the total count of matching emails more accurately
    progressCallback(0, 1, 'Counting emails...');
    const initialResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=500`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!initialResponse.ok) {
      const errorData = await initialResponse.json().catch(() => ({}));
      throw new Error(`Gmail API error: ${initialResponse.status}`);
    }
    
    const initialData = await initialResponse.json();
    
    // If there are more messages (nextPageToken exists), make another call to get a better estimate
    let totalCount = initialData.resultSizeEstimate || 0;
    
    // If we have messages, use the actual count as our baseline
    if (initialData.messages) {
      totalCount = Math.max(totalCount, initialData.messages.length);
      
      // If we have a nextPageToken, there are more messages than what we retrieved
      if (initialData.nextPageToken) {
        try {
          // Check if we can get additional count info
          const countResponse = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=1&includeSpamTrash=true`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          
          if (countResponse.ok) {
            const countData = await countResponse.json();
            // Use the larger of our counts to be safe
            totalCount = Math.max(totalCount, countData.resultSizeEstimate || 0);
          }
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
      
      const response = await fetch(pageUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Gmail API error: ${response.status}`);
      }
      
      const data = await response.json();
      
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
      
      // For each message, we only need to extract the subject
      // This is more efficient than fetching the full message content
      const processedBatch = await Promise.all(
        data.messages.map(async (msg, index) => {
          try {
            // Update progress for each message processed
            if (index % 5 === 0) { // Update every 5 messages to avoid too many updates
              // Double check total count to ensure it's always ≥ processedCount + index
              const currentProcessed = processedCount + index;
              if (currentProcessed + 1 > totalCount) {
                totalCount = currentProcessed + 100; // Add buffer for remaining
              }
              
              progressCallback(
                currentProcessed,
                totalCount,
                `Processing email ${currentProcessed + 1} of ${totalCount}...`
              );
            }
            
            const res = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, // Fetch full message
              {
                headers: { Authorization: `Bearer ${accessToken}` },
              }
            );
            
            if (!res.ok) {
              console.error(`Error fetching message ${msg.id}: ${res.status}`);
              return null;
            }
            
            const messageData = await res.json();
            if (!res.ok) {
              console.error(`Error fetching message ${msg.id}: ${res.status}`);
              return null;
            }
            
            // Function to decode base64url-encoded content
            function decodeBase64Url(data) {
              if (!data) return '';
              
              // Convert from base64url to standard base64
              const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
              
              try {
                // Decode the base64 string
                return decodeURIComponent(
                  atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
              } catch (error) {
                console.error('Error decoding base64:', error);
                return 'Error decoding content';
              }
            }
            
            // Extract email body
            let emailBody = '';
            
            // Simple case: body directly in payload
            if (messageData.payload.body && messageData.payload.body.data) {
              emailBody = decodeBase64Url(messageData.payload.body.data);
            } 
            // Multipart case: need to find the right part
            else if (messageData.payload.parts) {
              // Try to find plain text part first
              const textPart = messageData.payload.parts.find(part => 
                part.mimeType === 'text/plain' && part.body && part.body.data
              );
              
              // Fall back to HTML part if no plain text
              const htmlPart = messageData.payload.parts.find(part => 
                part.mimeType === 'text/html' && part.body && part.body.data
              );
              
              // Use the part we found
              const part = textPart || htmlPart;
              if (part && part.body && part.body.data) {
                emailBody = decodeBase64Url(part.body.data);
              }
            }
            
            // Log a preview of the body (first 200 chars)
            // if (emailBody.length > 0) {
            //   console.log('Email body preview:', emailBody);
            // }
            
            // Extract the headers we need
            const headers = {};
            if (messageData.payload && messageData.payload.headers) {
              messageData.payload.headers.forEach(header => {
                headers[header.name.toLowerCase()] = header.value;
              });
            }
            return {
              id: messageData.id,
              subject: headers.subject || 'No Subject',
              from: headers.from || 'Unknown Sender',
              date: headers.date || 'Unknown Date',
              snippet: messageData.snippet || 'No preview available',
            };
          } catch (error) {
            console.error(`Error processing message ${msg.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null results (failed fetches)
      const validEmails = processedBatch.filter(email => email !== null);
      allEmails = [...allEmails, ...validEmails];
      
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

// Get emails for a specific platform from storage
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

export const getLastFetchError = async (platform, accountEmail) => {
  try {
    if (!accountEmail) return null;
    
    const errorData = await AsyncStorage.getItem(`lastFetchError_${platform}_${accountEmail}`);
    return errorData ? JSON.parse(errorData) : null;
  } catch (error) {
    console.error(`Error retrieving fetch error for ${platform}:`, error);
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

