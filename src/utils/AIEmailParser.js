import { parseOrderDetails } from './EmailParser'; // Fallback parser
import RNFS from 'react-native-fs';

const saveJsonToFile = async (messageData) => {
  const filePath = `${RNFS.DocumentDirectoryPath}/aa.json`;
  try {
    await RNFS.writeFile(filePath, JSON.stringify(messageData, null, 2), 'utf8');
    console.log('Data saved successfully at:', filePath);
  } catch (error) {
    console.error('Error saving JSON file:', error);
  }
};

const cleanTextTest = [];
const refundKeywords = [
  "refund", "refunded", "cancellation", "cancelled", "payment reversal", "money returned", "plan", "expire", "noticed",
  "dining", "deliveries", "Plan"
];

const containsRefundKeyword = (text) => {
  return refundKeywords.some(keyword => text.toLowerCase().includes(keyword));
};

export const extractCleanText = (emailBodyHtml) => {
  if (!emailBodyHtml) return null; // Changed to null for consistency
  
  let cleanText = emailBodyHtml
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
    .replace(/\b(a|an|the|is|am|are|was|were|be|being|been|do|does|did|has|have|had|will|shall|should|would|may|might|must|can|could|Online)\b/gi, '')
    .replace(/\b(Greetings|India)\b/gi, '')
    .replace(/\b(Online|Receipt|tag|shows|email|notifications|Android|Your|We|hope|you|enjoyed|your|write|them|review|clicking|here|opinion|matters|us|happy|service|Not|Very|Charge|taxes|Click|download|order|summary|tax|invoice|issued|behalf|restaurant|Service|Pro|journey|Savings|Renew|Now|making|most|trusted|brand|pandemic)\b/gi, '')
    .replace(/\b(for|of|in|on|at|by|to|from|with|about|against|between|into|through|during|before|after|above|below|under|over)\b/gi, '')
    .replace(/\b(and|but|or|so|yet|nor|if|then|else|when|where|why|how|because|as|since|while|although|though|whether|that|which|who|whom|whose|what|whatever|whoever|employees|representatives)\b/gi, '')
    .replace(/\b(zomato|swiggy|\.com|http|https|www)\b/gi, '')
    .replace(/\b(limited|private|formerly|known|all rights reserved)\b/gi, '')
    .replace(/\b(zone|road|street|avenue|lane|place|salon|pudur|area|colony|nagar|path|highway|bypass|circle|chowk|square|market|complex|mall|plaza|tower|building|apartment|flat|floor|block|sector|phase|plot|site|house|villa|bungalow|office|shop|store|outlet)\b/gi, '')
    .replace(/\b(north|south|east|west|central|old|new|greater|upper|lower|behind|beside|near|opposite|across|junction|crossing|signal|flyover|bridge|metro|station|terminal|airport|railway|bus stop|stand)\b/gi, '')
    .replace(/\b(delhi|mumbai|bangalore|chennai|kolkata|hyderabad|ahmedabad|pune|surat|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|varanasi|srinagar|aurangabad|dhanbad|amritsar|allahabad|ranchi|howrah|coimbatore|jabalpur|gwalior|vijayawada|jodhpur|madurai|raipur|kota|guwahati|chandigarh|solapur|hubli|dharwad|bareilly|moradabad|mysore|gurgaon|aligarh|jalandhar|tiruchirappalli|bhubaneswar|salem|warangal|mira|bhayander|thiruvananthapuram|bhiwandi|saharanpur|gorakhpur|guntur|bikaner|amravati|noida|jamshedpur|bhilai|cuttack|firozabad|kochi|nellore|bhavnagar|dehradun|durgapur|asansol|nanded|kolhapur|ajmer|akola|gulbarga|jamnagar|ujjain|loni|siliguri|jhansi|ulhasnagar|jammu|sangli|miraj|kupwad|belgaum|mangalore|ambattur|tirunelveli|malegaon|gaya|jalgaon|udaipur|maheshtala|davanagere|kozhikode|kurnool|rajpur|sonarpur|rajahmundry|bilaspur|kamarhati|shahjahanpur|bijapur|rampur|shivamogga|chandrapur|junagadh|thrissur|alwar|bardhaman|kulti|kakinada|nizamabad|parbhani|tumkur|khammam|ozhukarai|bihar|sharif|panipat|darbhanga|bally|delhi|noida|gurgaon|faridabad|ghaziabad|gurugram|ncr)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText || containsRefundKeyword(cleanText)) {
    return null; // Return null for empty text or refund-related emails
  }
  return cleanText;
};

const chunkArray = (array, chunkSize) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const processEmailBatch = async (failedEmails, platform) => {
  if (!failedEmails || failedEmails.length === 0) return [];

  const BATCH_SIZE = 2;
  const emailChunks = chunkArray(failedEmails, BATCH_SIZE);
  const allResults = [];

  for (const chunk of emailChunks) {
    // Extract clean text and filter out invalid emails
    const cleanEmailTexts = chunk
      .map(email => extractCleanText(email.emailBodyHtml || ''))
      .filter(text => text !== null && text !== ''); // Filter out null or empty strings

    if (cleanEmailTexts.length === 0) {
      // If no valid emails in this chunk, use fallback for all
      const fallbackResults = chunk.map(email => {
        const orderDetails = parseOrderDetails(email.emailBodyHtml, platform);
        return { ...email, orderDetails };
      });
      allResults.push(...fallbackResults);
      continue;
    }

    cleanTextTest.push(cleanEmailTexts);

    const prompt = `### INSTRUCTION ###
Extract structured information from these ${platform} food delivery emails. For EACH email, return a valid JSON object with these fields:
- restaurantName: Extract the restaurant's name (empty string if not found)
- orderItems: Array of strings with food names (no quantities like '1 X'), empty array if not found
- totalPrice: Total amount paid with currency symbol (empty string if not found)
- orderId: Numeric order ID (empty string if not found)
- orderStatus: Current status (Delivered, Processing, etc., Delivered if not found)

I'm sending you ${cleanEmailTexts.length} emails. Return EXACTLY ${cleanEmailTexts.length} JSON objects in an array. If an email has no meaningful content, return an empty object {}.

### EMAILS ###
${cleanEmailTexts.map((text, index) => 
  `\n--- EMAIL ${index + 1} ---\n${text}`).join('\n')}

### OUTPUT FORMAT ###
Respond ONLY with a valid JSON array containing ${cleanEmailTexts.length} JSON objects. No explanations or other text.`;

    try {
      const response = await callReplicateAPI(prompt);

      if (!response) {
        console.error('API returned undefined or null response for chunk');
        throw new Error('Invalid API response');
      }

      let parsedDetails;
      try {
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        parsedDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
      } catch (error) {
        console.error('Error parsing AI response for chunk:', error);
        console.log('Raw response:', response);
        parsedDetails = [];
      }

      const chunkResults = chunk.map((email, index) => {
        const cleanText = extractCleanText(email.emailBodyHtml || '');
        if (cleanText === null || cleanText === '') {
          const fallbackDetails = parseOrderDetails(email.emailBodyHtml, platform);
          return { ...email, orderDetails: fallbackDetails };
        }
        const detailsIndex = cleanEmailTexts.indexOf(cleanText);
        const details = parsedDetails && parsedDetails[detailsIndex] ? parsedDetails[detailsIndex] : null;
        if (!details) {
          const fallbackDetails = parseOrderDetails(email.emailBodyHtml, platform);
          return { ...email, orderDetails: fallbackDetails };
        }
        return { ...email, orderDetails: details };
      });

      allResults.push(...chunkResults);
    } catch (error) {
      console.error('Error in batch AI processing for chunk:', error);
      const fallbackResults = chunk.map(email => {
        const orderDetails = parseOrderDetails(email.emailBodyHtml, platform);
        return { ...email, orderDetails };
      });
      allResults.push(...fallbackResults);
    }
  }

  await saveJsonToFile(cleanTextTest);
  return allResults;
};

const callReplicateAPI = async (prompt) => {
  try {
    console.log('Calling Replicate API...');
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': 'Token REDACTED_REPLICATE_TOKEN',
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
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API response received:', data);

    if (data.id) {
      const result = await pollPredictionResult(data.id);
      if (!result) throw new Error('Polling completed but returned empty result');
      return result;
    }

    if (!data.output) throw new Error('API returned no output');
    return data.output;
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
};

const pollPredictionResult = async (predictionId) => {
  let attempts = 0;
  const maxAttempts = 30;
  const delay = 2000;

  console.log(`Polling for prediction result: ${predictionId}`);

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { 'Authorization': 'Token REDACTED_REPLICATE_TOKEN' }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error during polling: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Poll attempt ${attempts+1}: status = ${data.status}`);

      if (data.status === 'succeeded') {
        if (!data.output) {
          console.warn('API returned success but no output');
          return '[]';
        }
        return Array.isArray(data.output) ? data.output.join('') : data.output;
      } else if (data.status === 'failed') {
        throw new Error(`Prediction failed: ${data.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    } catch (error) {
      console.error('Error during polling:', error);
      throw error;
    }
  }

  throw new Error('Prediction timed out after maximum attempts');
};

export default { processEmailBatch };