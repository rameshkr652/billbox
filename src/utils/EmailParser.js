import RNFS from 'react-native-fs';

const saveJsonToFile = async (messageData) => {
  const filePath = `${RNFS.DocumentDirectoryPath}/emailBodyHtml.html`;

  try {
    await RNFS.writeFile(filePath, JSON.stringify(messageData, null, 2), 'utf8');
    console.log('Data saved successfully at:', filePath);
  } catch (error) {
    console.error('Error saving JSON file:', error);
  }
};

const refundKeywords = [
  "refund", "refunded", "cancellation", "cancelled", "payment reversal", "money returned"
];

const containsRefundKeyword = (text) => {
  return refundKeywords.some(keyword => text.toLowerCase().includes(keyword));
};


/**
 * Main function to extract order details based on platform
 * @param {string} emailBodyHtml - The HTML content of the email
 * @param {string} platform - The platform identifier (zomato, swiggy, amazon, flipkart)
 * @returns {Object} Extracted order details or null if parsing fails
 */
export const parseOrderDetails = (emailBodyHtml, platform) => {
  if (!emailBodyHtml || !platform) return null;
  
  // Select the appropriate extraction function based on platform
  switch (platform.toLowerCase()) {
    case 'zomato':
      return extractZomatoOrderDetails(emailBodyHtml);
    case 'swiggy':
      return extractSwiggyOrderDetails(emailBodyHtml);
    case 'bank_hdfc':
      return extractHdfcBankTransactionDetails(emailBodyHtml);
    case 'bank_icici':
      return extractIciciBankTransactionDetails(emailBodyHtml);
    case 'bank_sbi':
      return extractSbiBankTransactionDetails(emailBodyHtml);  
    case 'bank_axis':
      return extractAxisBankTransactionDetails(emailBodyHtml);
      
    default:
      console.log(`No parser available for platform: ${platform}`);
      return null;
  }
};
/**
 * Extract order details from Zomato emails
 * Keeping the exact same logic as in GmailService.js for Zomato
 * @param {string} emailBodyHtml - The HTML content of the email
 * @returns {Object} Extracted order details
 */
export const extractZomatoOrderDetails = (emailBodyHtml) => {
  if (!emailBodyHtml) return null;
  
  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    
    return text
      .replace(/&#39;/g, "'")
      .replace(/&#43;/g, '+')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
      });
  };
  
  // Clean up the HTML
  const cleanText = emailBodyHtml
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/ /g, ' ')
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Helper function to check for refund keywords
  const containsRefundKeyword = (text) => {
    const refundKeywords = ['refund', 'cancelled', 'cancellation'];
    return refundKeywords.some(keyword => text.toLowerCase().includes(keyword));
  };
  
  if (containsRefundKeyword(cleanText)) {
    console.log("This email is related to a refund or cancellation. Skipping order extraction.");
    return null;
  }
  
  const orderDetails = {
    restaurantName: null,
    orderItems: [],
    totalPrice: null,
    orderId: null,
    orderStatus: null,
    orderDateTime: null
  };
  
  // Extract restaurant name with fixed regex
  const restaurantMatch = cleanText.match(/Thank you for ordering.*?from\s+([^.]+?)(?:\s*ORDER ID|\s*We hope|\s*\.\s|$)/i);
  if (restaurantMatch && restaurantMatch[1]) {
    // Clean up the restaurant name and decode HTML entities
    let restaurantName = decodeHtmlEntities(restaurantMatch[1].trim());
    // Remove any trailing punctuation or extra text
    restaurantName = restaurantName.replace(/[\.\s]*$/g, '');
    orderDetails.restaurantName = restaurantName;
  }
  
  // Extract order ID
  const orderIdMatch = cleanText.match(/ORDER ID:?\s*(\d+)/i);
  if (orderIdMatch && orderIdMatch[1]) {
    orderDetails.orderId = orderIdMatch[1].trim();
  }
  
  // Extract order status
  const statusMatch = cleanText.match(/\b(Delivered|Processing|Cancelled|Confirmed|Out for Delivery)\b/i);
  if (statusMatch && statusMatch[1]) {
    orderDetails.orderStatus = statusMatch[1].trim();
  }
  
  // Extract total price - Handle different rupee symbols and commas in price
  const totalMatch = cleanText.match(/Total paid\s*-\s*.*?[₹â¹]([0-9,.]+)/i);
  if (totalMatch && totalMatch[1]) {
    orderDetails.totalPrice = `₹${totalMatch[1]}`;
  } else {
    const fallbackMatch = cleanText.match(/Total paid\s*-\s*.*?([0-9,.]+)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      orderDetails.totalPrice = `₹${fallbackMatch[1]}`;
    }
  }
  
  // Extract order items from the HTML structure
  const itemRegexes = [
    /<td[^>]*class="es-m-txt-l"[^>]*><p[^>]*>(\d+)\s*[Xx×]\s+([^<]+)<\/p>/gi,
    /<p[^>]*>(\d+)\s*[Xx×]\s+([^<]+)<\/p>/gi,
    /(\d+)\s*[Xx×]\s+([A-Za-z][^<>\d\.,]{2,})/gi
  ];
  
  for (const regex of itemRegexes) {
    const matches = [...emailBodyHtml.matchAll(regex)];
    
    for (const match of matches) {
      if (match[1] && match[2]) {
        const quantity = match[1].trim();
        const itemName = decodeHtmlEntities(match[2].trim());
        
        if (itemName.length > 1 && 
            !/ORDER ID|Total paid|Delivered|Processing/i.test(itemName)) {
          const isDuplicate = orderDetails.orderItems.some(existing => 
            existing.toLowerCase().includes(itemName.toLowerCase()));
          
          if (!isDuplicate) {
            orderDetails.orderItems.push(`${quantity} X ${itemName}`);
          }
        }
      }
    }
    
    if (orderDetails.orderItems.length > 0) {
      break;
    }
  }
  
  return orderDetails;
};
export const extractSwiggyOrderDetails = (emailBodyHtml) => {
  if (!emailBodyHtml) return null;
  
  // Object to store extracted data
  const orderDetails = {
    restaurantName: null,
    orderItems: [],
    totalPrice: null,
    orderId: null,
    orderStatus: null,
    orderDateTime: null
  };

  // Extract order ID
  const orderIdPattern = /Order No:\s*<strong>(\d+)<\/strong>/i;
  const orderIdMatch = emailBodyHtml.match(orderIdPattern);
  if (orderIdMatch && orderIdMatch[1]) {
    orderDetails.orderId = orderIdMatch[1].trim();
  }

  // Extract restaurant name
  const restaurantNamePattern = /<strong>([^<]+)<\/strong>\s*<\/h5>\s*<p class=""/i;
  const restaurantNameMatch = emailBodyHtml.match(restaurantNamePattern);
  if (restaurantNameMatch && restaurantNameMatch[1]) {
    orderDetails.restaurantName = restaurantNameMatch[1].trim();
  }

  // Extract order status
  const statusPattern = /Order Status:\s*<strong>([^<]+)<\/strong>/i;
  const statusMatch = emailBodyHtml.match(statusPattern);
  if (statusMatch && statusMatch[1]) {
    orderDetails.orderStatus = statusMatch[1].trim();
  }

  // Extract order datetime
  const dateTimePattern = /Order placed at:\s*<strong>([^<]+)<\/strong>/i;
  const dateTimeMatch = emailBodyHtml.match(dateTimePattern);
  if (dateTimeMatch && dateTimeMatch[1]) {
    orderDetails.orderDateTime = dateTimeMatch[1].trim();
  }

  // Extract total price - look for the grand-total row specifically
  const totalPattern = /<tr class="grand-total"[\s\S]*?Order Total:[\s\S]*?<td[^>]*>[\s\S]*?(\d+)\s*<\/td>/is;
  const totalMatch = emailBodyHtml.match(totalPattern);
  if (totalMatch && totalMatch[1]) {
    orderDetails.totalPrice = `₹${totalMatch[1]}`
  }

  // Extract actual food items - using rows that have quantity and price
  const itemRowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*class="small"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>\s*(\d+)\s*<\/td>[\s\S]*?<td[^>]*align="right"[^>]*>[^<]*<\/td>[\s\S]*?<\/tr>/gi;
  let rowMatch;
  
  while ((rowMatch = itemRowPattern.exec(emailBodyHtml)) !== null) {
    const fullItemText = rowMatch[1].trim();
    
    // Extract just the base item name (remove quantity in parentheses)
    let itemName = fullItemText;
    const parenthesisIndex = fullItemText.indexOf('(');
    if (parenthesisIndex > 0) {
      itemName = fullItemText.substring(0, parenthesisIndex).trim();
    }
    
    orderDetails.orderItems.push(itemName);
  }
  
  // Remove any null values from the object
  const cleanedOrderDetails = {};
  for (const key in orderDetails) {
    if (orderDetails[key] !== null) {
      // Don't include empty arrays either
      if (Array.isArray(orderDetails[key]) && orderDetails[key].length === 0) {
        continue;
      }
      cleanedOrderDetails[key] = orderDetails[key];
    }
  }
  console.log(cleanedOrderDetails,"cleanedOrderDetails")
  return cleanedOrderDetails;
}


// Export the default object
export default {
  parseOrderDetails,
  extractZomatoOrderDetails,
  extractSwiggyOrderDetails
};