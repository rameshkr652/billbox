import AsyncStorage from '@react-native-async-storage/async-storage';
import { parseOrderDetails } from './EmailParser'; // Fallback parser

// Replicate API settings
const REPLICATE_API_TOKEN = 'r8_2NGVlwJ2tw4p4nlM5OUkF3liRNIe5TB2xnEVE';
const MODEL_ID = 'meta/meta-llama-3-8b-instruct';
const BATCH_SIZE = 20; // AI batch size

/**
 * Extract clean text from email content
 */
const extractCleanText = (emailBody) => {
  if (!emailBody) return '';
  return emailBody
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
};

/**
 * Process a batch of email strings with AI
 */
export const processEmailBatch = async (emailBatch, platform) => {
  if (!emailBatch || emailBatch.length === 0) {
    console.log('No emails in batch to process');
    return [];
  }

  console.log(`Processing batch of ${emailBatch.length} emails for ${platform}`);
  
  // Clean the email strings
  const cleanEmailTexts = emailBatch.map(email => extractCleanText(email));

  // Build the prompt with the array of cleaned email strings
  const prompt = `Extract structured data from these ${platform} food delivery emails. For each email, return a JSON object with:
- restaurantName (string)
- orderItems (array of {item: string, quantity: number})
- totalPrice (string with currency)
- orderId (string)
- orderStatus (string)

Input: ${cleanEmailTexts.length} emails
Output: EXACTLY ${cleanEmailTexts.length} JSON objects in an array.

Emails:
${cleanEmailTexts.map((text, index) => `Email ${index + 1}: ${text}`).join('\n')}

Respond with a JSON array only.`;

  try {
    console.log('Calling Replicate API with prompt');
    const response = await callReplicateAPI(prompt);
    console.log('Received raw AI response:', response);

    let parsedDetails;
    try {
      if (Array.isArray(response)) {
        parsedDetails = response;
        console.log('Response is already an array:', parsedDetails);
      } else if (typeof response === 'string') {
        const jsonMatch = response.match(/\[\s*\{.*\}\s*\]/s);
        parsedDetails = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(response);
        console.log('Parsed string response into:', parsedDetails);
      } else {
        console.error('Unexpected response type:', typeof response);
        parsedDetails = [];
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      parsedDetails = [];
    }

    // Map the parsed details back to the original email batch
    return emailBatch.map((email, index) => {
      const details = parsedDetails[index] || null;
      if (!details) {
        console.log(`AI failed for email ${index + 1}, using fallback parser`);
        const fallbackDetails = parseOrderDetails(email, platform);
        return { emailContent: email, orderDetails: fallbackDetails };
      }
      console.log(`AI successfully parsed email ${index + 1}:`, details);
      return { emailContent: email, orderDetails: details };
    });
  } catch (error) {
    console.error('Error in batch AI processing:', error);
    return emailBatch.map(email => {
      console.log(`Falling back to traditional parser for email due to AI error`);
      const orderDetails = parseOrderDetails(email, platform);
      return { emailContent: email, orderDetails };
    });
  }
};

/**
 * Call Replicate API
 */
const callReplicateAPI = async (prompt) => {
  try {
    console.log('Initiating Replicate API call');
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
          max_length: 2048,
          top_p: 0.95
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('API initial response:', data);

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
  const maxAttempts = 20;
  const delay = 1500;

  while (attempts < maxAttempts) {
    try {
      console.log(`Polling prediction ${predictionId}, attempt ${attempts + 1}`);
      const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Poll response for ${predictionId}:`, data);

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