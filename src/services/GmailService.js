// src/services/GmailService.js with improved token and cache management
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AccountService from './AccountService';
import * as AuthService from './AuthService';
import { processAllEmailsWithAI } from '../utils/AIEmailParser';

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
          webClientId: '533100730063-856k8l5r6uh2fe2fl7iovkf4t8tjdm69.apps.googleusercontent.com',
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
// Modified function in src/services/GmailService.js
export const fetchAllPlatformEmails = async (platform, accountEmail, platformQuery, progressCallback = () => {}) => {
  try {
    if (!accountEmail) {
      throw new Error('No account email provided');
    }
    
    progressCallback(0, 1, 'Preparing to fetch emails...');
    
    const query = platformQuery || `from:${platform}.com`;
    const encodedQuery = encodeURIComponent(query);
    
    progressCallback(0, 1, 'Finding matching emails...');
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=10`;
    const initialData = await callGmailApi(listUrl, accountEmail);
    
    if (!initialData.messages || initialData.messages.length === 0) {
      progressCallback(1, 1, 'No emails found.');
      return [];
    }
    
    const totalCount = initialData.resultSizeEstimate || initialData.messages.length;
    progressCallback(0, totalCount, `Found ${totalCount} emails. Processing...`);
    
    let allMessageIds = initialData.messages.map(msg => msg.id);
    let nextPageToken = initialData.nextPageToken;
    
    // while (nextPageToken) {
    //   const pageUrl = `${listUrl}&pageToken=${nextPageToken}`;
    //   const pageData = await callGmailApi(pageUrl, accountEmail);
      
    //   if (pageData.messages && pageData.messages.length > 0) {
    //     allMessageIds = [...allMessageIds, ...pageData.messages.map(msg => msg.id)];
    //   }
      
    //   nextPageToken = pageData.nextPageToken;
    //   progressCallback(allMessageIds.length, totalCount, `Collecting message IDs (${allMessageIds.length})...`);
    // }
    
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < allMessageIds.length; i += BATCH_SIZE) {
      batches.push(allMessageIds.slice(i, i + BATCH_SIZE));
    }
    
    const rawEmailsWithBodyHtml = [];
    let processedCount = 0;
    
    // Fetch email bodies
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
            
            // Extract basic email data
            const headers = {};
            if (messageData.payload?.headers) {
              messageData.payload.headers.forEach(header => {
                headers[header.name.toLowerCase()] = header.value;
              });
            }
            
            // Extract email body
            const emailBodyHtml = extractEmailBody(messageData);
            
            // Create basic email object
            return {
              id: messageData.id,
              subject: headers.subject || 'No Subject',
              from: headers.from || 'Unknown Sender',
              date: headers.date || 'Unknown Date',
              snippet: messageData.snippet || '',
              emailBodyHtml // Include full body HTML for AI processing
            };
          } catch (error) {
            console.error(`Error processing message ${messageId}:`, error);
            return null;
          }
        })
      );
      
      const validResults = batchResults.filter(result => result !== null);
      rawEmailsWithBodyHtml.push(...validResults);
      
      processedCount += batch.length;
      progressCallback(
        processedCount,
        allMessageIds.length,
        `Processing emails (${processedCount}/${allMessageIds.length})...`
      );
    }
    
    // Now process all emails with AI to extract order details
    progressCallback(0, rawEmailsWithBodyHtml.length, 'Starting AI processing...');
    const processedEmails = await processAllEmailsWithAI(
      rawEmailsWithBodyHtml, 
      platform,
      progressCallback
    );
    progressCallback(rawEmailsWithBodyHtml.length, rawEmailsWithBodyHtml.length, 'Saving emails...');
    
    // Save emails with extracted order details
    const storageKey = `emails_${platform}_${accountEmail}`;
    
    // Clean up emailBodyHtml before saving to storage (to save space)
    const emailsToSave = processedEmails.map(email => {
      const { emailBodyHtml, ...rest } = email;
      return rest; // Save everything except the full HTML body
    });
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(emailsToSave));
    
    const now = Date.now();
    await AsyncStorage.setItem(`lastFetched_${platform}_${accountEmail}`, now.toString());
    
    return emailsToSave;
  } catch (error) {
    console.error(`Error fetching platform emails for ${accountEmail}:`, error);
    throw error;
  }
};
/**
 * Simple function to clean text and remove unwanted words
 * Retains order information without pattern matching
 */
const extractCleanText = (text) => {
  // First clean any HTML content if present
  let cleanText = text
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove unwanted phrases and disclaimers
  cleanText = cleanText
    .replace(/will NEVER ask you for your personal information.+?(email|Delhi-\d+)\.?/gi, '')
    .replace(/©\d+ - .+?(reserved|Limited).+?(Delhi-\d+)\.?/gi, '')
    .replace(/For your own safety.+?(email|details)\.?/gi, '')
    .replace(/employees or representatives.+?(etc)\.?/gi, '');
  
  // Remove common stop words and company names
  cleanText = cleanText
    .replace(/\b(hi|hello|thank you for|ordering from|delivered|near|ordering|thank)\b/gi, '')
    .replace(/\b(a|an|the|is|am|are|was|were|be|being|been|do|does|did|has|have|had|will|shall|should|would|may|might|must|can|could)\b/gi, '')
    .replace(/\b(Greetings|India)\b/gi, '')

    .replace(/\b(for|of|in|on|at|by|to|from|with|about|against|between|into|through|during|before|after|above|below|under|over)\b/gi, '')
    .replace(/\b(and|but|or|so|yet|nor|if|then|else|when|where|why|how|because|as|since|while|although|though|whether|that|which|who|whom|whose|what|whatever|whoever|employees|representatives)\b/gi, '')
    .replace(/\b(zomato|swiggy|\.com|http|https|www)\b/gi, '')
    .replace(/\b(limited|private|formerly|known|all rights reserved)\b/gi, '')
    .replace(/\b(zone|road|street|avenue|lane|place|salon|pudur|area|colony|nagar|path|highway|bypass|circle|chowk|square|market|complex|mall|plaza|tower|building|apartment|flat|floor|block|sector|phase|plot|site|house|villa|bungalow|office|shop|store|outlet)\b/gi, '')
    .replace(/\b(north|south|east|west|central|old|new|greater|upper|lower|behind|beside|near|opposite|across|junction|crossing|signal|flyover|bridge|metro|station|terminal|airport|railway|bus stop|stand)\b/gi, '')
    .replace(/\b(delhi|mumbai|bangalore|chennai|kolkata|hyderabad|ahmedabad|pune|surat|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|guwahati|chandigarh|solapur|hubli|dharwad|bareilly|moradabad|mysore|gurgaon|aligarh|jalandhar|tiruchirappalli|bhubaneswar|salem|warangal|mira|bhayander|thiruvananthapuram|bhiwandi|saharanpur|gorakhpur|guntur|bikaner|amravati|noida|jamshedpur|bhilai|cuttack|firozabad|kochi|nellore|bhavnagar|dehradun|durgapur|asansol|nanded|kolhapur|ajmer|akola|gulbarga|jamnagar|ujjain|loni|siliguri|jhansi|ulhasnagar|jammu|sangli|miraj|kupwad|belgaum|mangalore|ambattur|tirunelveli|malegaon|gaya|jalgaon|udaipur|maheshtala|davanagere|kozhikode|kurnool|rajpur|sonarpur|rajahmundry|bilaspur|kamarhati|shahjahanpur|bijapur|rampur|shivamogga|chandrapur|junagadh|thrissur|alwar|bardhaman|kulti|kakinada|nizamabad|parbhani|tumkur|khammam|ozhukarai|bihar|sharif|panipat|darbhanga|bally|delhi|noida|gurgaon|faridabad|ghaziabad|gurugram|ncr)\b/gi, '')    
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleanText;
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
    
    // const emailBodyHtml = extractEmailBody(messageData);
    // const orderDetails = parseOrderDetails(emailBodyHtml, platform);
    
    return {
      id: messageData.id,
      subject: headers.subject || 'No Subject',
      from: headers.from || 'Unknown Sender',
      date: headers.date || 'Unknown Date',
      snippet: messageData.snippet || ''
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