// src/utils/AIEmailParser.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseOrderDetails } from './EmailParser'; // Fallback parser

// Replicate API token
const REPLICATE_API_TOKEN = 'r8_2NGVlwJ2tw4p4nlM5OUkF3liRNIe5TB2xnEVE';
const MODEL_ID = 'meta/meta-llama-3-8b-instruct'; // Using a smaller, faster model
const BATCH_SIZE = 50;

/**
 * Extract clean text from HTML email body
 * @param {string} emailBodyHtml - HTML content of the email
 * @returns {string} Cleaned text version of the email
 */
const extractCleanText = (emailBodyHtml) => {
  if (!emailBodyHtml) return '';
  
  // Clean up the HTML
  return emailBodyHtml
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/Â/g, '') // Remove special character
    .replace(/\s+/g, ' ')
    .trim();
};
export const processEmailBatch = async (emailBatch, platform) => {
    if (!emailBatch || emailBatch.length === 0) return [];
    
    // Prepare the email texts and the AI prompt
    const cleanEmailTexts = emailBatch.map(email => 
      extractCleanText(email.emailBodyHtml || '')
    );
    
    // Create the prompt for the whole batch
    const prompt = `### INSTRUCTION ###
  Extract structured information from these ${platform} food delivery emails. For EACH email, return a valid JSON object with these fields:
  - restaurantName: Extract the restaurant's name
  - orderItems: Create an array of all ordered items with quantities 
  - totalPrice: Extract the total amount paid with currency symbol
  - orderId: Extract the numeric order ID
  - orderStatus: Extract the current status of the order (Delivered, Processing, etc.)
  
  I'm sending you ${cleanEmailTexts.length} emails. Return EXACTLY ${cleanEmailTexts.length} JSON objects in an array.
  
  ### EMAILS ###
  ${cleanEmailTexts.map((text, index) => 
    `\n--- EMAIL ${index + 1} ---\n${text}`).join('\n')}
  
  ### OUTPUT FORMAT ###
  Respond ONLY with a valid JSON array containing ${cleanEmailTexts.length} objects. No explanations or other text.`;
  
    try {
      // Call the AI service with the batch prompt
      const response = await callReplicateAPI(prompt);
      
      // Parse the response into an array of order details
      let parsedDetails;
      try {
        // Extract JSON array from response
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        parsedDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch (error) {
        console.error('Error parsing AI response:', error);
        parsedDetails = [];
      }
      
      // Merge the parsed details with the original emails
      return emailBatch.map((email, index) => {
        const details = parsedDetails[index] || null;
        if (!details) {
          // Fallback to traditional parsing
          const fallbackDetails = parseOrderDetails(email.emailBodyHtml, platform);
          return { ...email, orderDetails: fallbackDetails };
        }
        return { ...email, orderDetails: details };
      });
    } catch (error) {
      console.error('Error in batch AI processing:', error);
      // Fallback to traditional parsing for all emails in batch
      return emailBatch.map(email => {
        const orderDetails = parseOrderDetails(email.emailBodyHtml, platform);
        return { ...email, orderDetails };
      });
    }
  };
  
  const callReplicateAPI = async (prompt) => {
    try {
      const response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': 'Token r8_2NGVlwJ2tw4p4nlM5OUkF3liRNIe5TB2xnEVE',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'meta/meta-llama-3-8b-instruct', 
          input: {
            prompt: prompt,
            temperature: 0.3,
            max_length: 4096,
            top_p: 0.9
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle asynchronous prediction
      if (data.id) {
        return await pollPredictionResult(data.id);
      }
      
      return data.output || '';
    } catch (error) {
      console.error('Error calling AI API:', error);
      throw error;
    }
  };

/**
 * Create the batch prompt for the AI model
 * @param {Array<string>} cleanTexts - Array of clean email texts
 * @param {string} platform - Platform identifier
 * @returns {string} Complete prompt for the AI
 */
const createBatchPrompt = (cleanTexts, platform) => {
  let prompt = `### INSTRUCTION ###
Extract structured information from these ${platform} food delivery emails. For EACH email, return a valid JSON object with these fields:
- restaurantName: Extract the restaurant's name
- orderItems: Create an array of all ordered items with quantities 
- totalPrice: Extract the total amount paid with currency symbol
- orderId: Extract the numeric order ID
- orderStatus: Extract the current status of the order (Delivered, Processing, etc.)

I'm sending you ${cleanTexts.length} emails. Return EXACTLY ${cleanTexts.length} JSON objects in an array.

### EMAILS ###\n`;

  // Add each email with an index
  cleanTexts.forEach((text, index) => {
    prompt += `\n--- EMAIL ${index + 1} ---\n${text}\n`;
  });

  prompt += `\n### OUTPUT FORMAT ###
Respond ONLY with a valid JSON array containing ${cleanTexts.length} objects. No explanations or other text.`;

  return prompt;
};

/**
 * Call the Replicate API
 * @param {string} prompt - The complete prompt
 * @returns {Promise<string>} - The AI response
 */
const fetchFromReplicate = async (prompt) => {
  try {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: MODEL_ID,
        input: {
          prompt: prompt,
          temperature: 0.3, // Lower temperature for more deterministic outputs
          max_length: 4096, // Set appropriate limit for response
          top_p: 0.9
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle asynchronous prediction
    if (data.status === 'starting' || data.status === 'processing') {
      return pollPredictionResult(data.id);
    }
    
    return data.output || '';
  } catch (error) {
    console.error('Error calling Replicate API:', error);
    throw error;
  }
};
// Poll for prediction results
const pollPredictionResult = async (predictionId) => {
    let attempts = 0;
    const maxAttempts = 30;
    const delay = 2000; // 2 seconds
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
          headers: {
            'Authorization': 'Token r8_2NGVlwJ2tw4p4nlM5OUkF3liRNIe5TB2xnEVE',
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'succeeded') {
          return data.output || '';
        } else if (data.status === 'failed') {
          throw new Error(`Prediction failed: ${data.error}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      } catch (error) {
        console.error('Error polling prediction:', error);
        throw error;
      }
    }
    
    throw new Error('Prediction timed out');
  };
  

/**
 * Parse the AI response into structured data
 * @param {string} response - The AI response text
 * @param {number} expectedCount - Expected number of results
 * @returns {Array} - Array of parsed order details
 */
const parseAIResponse = (response, expectedCount) => {
  try {
    // Extract JSON array from response (in case there's any extra text)
    const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
    if (!jsonMatch) {
      throw new Error('No valid JSON array found in response');
    }
    
    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    
    // Validate we got the expected number of results
    if (!Array.isArray(parsed) || parsed.length !== expectedCount) {
      console.warn(`Expected ${expectedCount} results, got ${parsed.length}`);
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return Array(expectedCount).fill(null); // Return array of nulls as fallback
  }
};

/**
 * Merge parsed details with original emails
 * @param {Array} emails - Original email objects
 * @param {Array} parsedDetails - Parsed order details from AI
 * @returns {Array} - Merged email objects with order details
 */
const mergeDetailsWithEmails = (emails, parsedDetails) => {
  return emails.map((email, index) => {
    // Get corresponding parsed details or null
    const details = parsedDetails[index] || null;
    
    if (!details) {
      // Fallback to traditional parsing if AI parsing failed
      const fallbackDetails = parseOrderDetails(email.emailBodyHtml, 'zomato'); // Assume zomato as fallback
      return { ...email, orderDetails: fallbackDetails };
    }
    
    return { ...email, orderDetails: details };
  });
};

/**
 * Main function to process emails in batches
 * @param {Array} emails - Array of all emails to process
 * @param {string} platform - Platform identifier
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Array>} - Processed emails with order details
 */
export const processEmailsWithAI = async (emails, platform, progressCallback = () => {}) => {
  if (!emails || emails.length === 0) return [];
  
  const processedEmails = [];
  const totalEmails = emails.length;
  let processedCount = 0;
  
  // Process emails in batches
  for (let i = 0; i < totalEmails; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    
    try {
      // Update progress
      progressCallback(processedCount, totalEmails, `Processing batch ${Math.floor(i/BATCH_SIZE) + 1}...`);
      
      // Process batch
      const processedBatch = await processEmailBatch(batch, platform);
      processedEmails.push(...processedBatch);
      
      // Update processed count
      processedCount += batch.length;
      progressCallback(processedCount, totalEmails, `Processed ${processedCount} of ${totalEmails} emails...`);
    } catch (error) {
      console.error(`Error processing batch starting at index ${i}:`, error);
      
      // Fallback to traditional parsing for this batch
      const fallbackProcessed = batch.map(email => {
        const fallbackDetails = parseOrderDetails(email.emailBodyHtml, platform);
        return { ...email, orderDetails: fallbackDetails };
      });
      
      processedEmails.push(...fallbackProcessed);
      processedCount += batch.length;
    }
  }
  
  return processedEmails;
};


// Note: This implementation assumes the existence of callGmailApi, getAccessToken