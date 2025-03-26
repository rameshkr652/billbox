// src/utils/AIEmailParser.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replicate API settings
const REPLICATE_API_TOKEN = 'r8_2NGVlwJ2tw4p4nlM5OUkF3liRNIe5TB2xnEVE';
const MODEL_ID = 'meta/meta-llama-3-8b-instruct';
const BATCH_SIZE = 5;

/**
 * Clean text and remove unwanted words
 */
const extractCleanText = (text) => {
  let cleanText = text
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/ /g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  cleanText = cleanText
    .replace(/will NEVER ask you for your personal information.+?(email|Delhi-\d+)\.?/gi, '')
    .replace(/©\d+ - .+?(reserved|Limited).+?(Delhi-\d+)\.?/gi, '')
    .replace(/For your own safety.+?(email|details)\.?/gi, '')
    .replace(/employees or representatives.+?(etc)\.?/gi, '');
  
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
 * Process a batch of email strings with AI
 */
export const processEmailBatch = async (emailBatch, platform, progressCallback) => {
  if (!emailBatch || emailBatch.length === 0) {
    console.log('No emails in batch to process');
    return [];
  }

  
  // Clean the email strings
  const cleanEmailTexts = emailBatch.map(email => extractCleanText(email.emailBodyHtml || email.snippet || ''));
  console.log('Clean email texts:', cleanEmailTexts);
  const prompt = `Extract structured data from these ${platform} food delivery emails. For each email, return a JSON object with:
  - restaurantName (string)
  - orderItems (array of {string}, include only the food name without quantities like '1 X' or '2 X')
  - totalPrice (string with currency, use '₹' for Rupees)
  - orderId (string)
  Input: ${cleanEmailTexts.length} emails
  Output: EXACTLY ${cleanEmailTexts.length} JSON objects in an array. Respond with a JSON array only, no additional text or explanation.
  
  Emails:
  ${cleanEmailTexts.map((text, index) => `Email ${index + 1}: ${text}`).join('\n')}`;

  try {
    // Call Replicate API
    const response = await callReplicateAPI(prompt);

    // Parse the response into JSON objects
    let parsedOrders;
    try {
      if (Array.isArray(response)) {
        const jsonString = response.join(''); // Join array elements if split
        parsedOrders = JSON.parse(jsonString);
      } else if (typeof response === 'string') {
        // Extract JSON array from string, ignoring extra text
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        if (jsonMatch) {
          parsedOrders = JSON.parse(jsonMatch[0]);
        } else if (response.trim().startsWith('[')) {
          // Fix incomplete JSON
          const fixedResponse = response.trim().endsWith(']') ? response : response + ']';
          parsedOrders = JSON.parse(fixedResponse);
        } else {
          // If no JSON array is found, log and fallback
          console.error('No valid JSON array in response:', response);
          throw new Error('Invalid JSON format');
        }
      } else {
        throw new Error('Unexpected response type: ' + typeof response);
      }

      // Ensure the parsed result matches the batch size
      if (parsedOrders.length !== cleanEmailTexts.length) {
        console.warn(`Expected ${cleanEmailTexts.length} results, got ${parsedOrders.length}`);
        while (parsedOrders.length < cleanEmailTexts.length) {
          parsedOrders.push(null); // Pad with null
        }
        parsedOrders = parsedOrders.slice(0, cleanEmailTexts.length); // Truncate if too many
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      parsedOrders = Array(emailBatch.length).fill({
        restaurantName: null,
        orderItems: [],
        totalPrice: null,
        orderId: null,
        orderStatus: null
      });
    }

    // Map results back to original emails
    return emailBatch.map((email, index) => {
      const orderDetails = parsedOrders[index] || {
        restaurantName: null,
        orderItems: [],
        totalPrice: null,
        orderId: null,
        orderStatus: null
      };
      
      return {
        ...email,
        orderDetails
      };
    });
  } catch (error) {
    console.error('Error in batch AI processing:', error);
    return emailBatch.map(email => ({
      ...email,
      orderDetails: {
        restaurantName: null,
        orderItems: [],
        totalPrice: null,
        orderId: null,
        orderStatus: null
      }
    }));
  }
};

/**
 * Process all emails with AI in batches showing progress
 */
export const processAllEmailsWithAI = async (allEmails, platform, progressCallback = () => {}) => {
  const results = [];
  const totalEmails = allEmails.length;
  
  for (let i = 0; i < totalEmails; i += BATCH_SIZE) {
    const batch = allEmails.slice(i, i + BATCH_SIZE);
    
    progressCallback(
      i,
      totalEmails,
      `AI processing emails (${i}/${totalEmails})...`,
      Math.max(0, (totalEmails - i) * 2)
    );
    
    try {
      const processedBatch = await processEmailBatch(batch, platform);
      results.push(...processedBatch);
    } catch (error) {
      results.push(...batch.map(email => ({
        ...email,
        orderDetails: {
          restaurantName: null,
          orderItems: [],
          totalPrice: null,
          orderId: null,
          orderStatus: null
        }
      })));
    }
    
    if (i + BATCH_SIZE < totalEmails) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  progressCallback(totalEmails, totalEmails, `AI processing complete!`);
  return results;
};

/**
 * Call Replicate API
 */
const callReplicateAPI = async (prompt) => {
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
          temperature: 0.1,
          max_length: 8192, // Already increased
          top_p: 0.95
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

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
 * Poll for prediction results
 */
const pollPredictionResult = async (predictionId) => {
  let attempts = 0;
  const maxAttempts = 30;
  const delay = 2000;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'succeeded') {
        console.log('Prediction succeeded, retrieving output');
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

export default {
  processEmailBatch,
  processAllEmailsWithAI
};