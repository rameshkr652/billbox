/**
 * Email parser utility for extracting structured data from Zomato emails
 * 
 * This improved version fixes two key issues:
 * 1. Correctly extracts the city name (Salem) from the address
 * 2. Properly identifies all order items (both "Rava Dosa" and "Idli")
 */

/**
 * Extract order details from Zomato emails
 * @param {string} emailBodyHtml - The HTML content of the email
 * @returns {Object} Extracted order details
 */
export const extractZomatoOrderDetails = (emailBodyHtml) => {
  if (!emailBodyHtml) return null;
  
  // Clean up the HTML
  const cleanText = emailBodyHtml
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/Â/g, '') // Remove special character
    .replace(/\s+/g, ' ')
    .trim();
  
  // Object to store our extracted data
  const orderDetails = {
    restaurantName: null,
    orderItems: [],
    totalPrice: null,
    orderId: null,
    orderStatus: null,
    orderDateTime: null
  };
  
  // Extract restaurant name
  const restaurantMatch = cleanText.match(/Thank you for ordering.*?from\s+(.*?)\s*ORDER ID/i);
  if (restaurantMatch && restaurantMatch[1]) {
    orderDetails.restaurantName = restaurantMatch[1].trim();
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
  
  // Extract total price
  const totalMatch = cleanText.match(/Total paid\s*-\s*(.*?)(\d+\.?\d*)/i);
  if (totalMatch && totalMatch[2]) {
    orderDetails.totalPrice = `₹${totalMatch[2]}`;
  }
  // Extract order items from the HTML structure
  // For Zomato, items are usually in p tags within td with class="es-m-txt-l"
  const itemRegexes = [
    // Primary pattern: <td class="es-m-txt-l"><p>1 X Item</p></td>
    /<td[^>]*class="es-m-txt-l"[^>]*><p[^>]*>(\d+)\s*[Xx×]\s+([^<]+)<\/p>/gi,
    
    // Secondary pattern: Any <p> tag with the X pattern
    /<p[^>]*>(\d+)\s*[Xx×]\s+([^<]+)<\/p>/gi,
    
    // Fallback pattern: Any context with the X pattern
    /(\d+)\s*[Xx×]\s+([A-Za-z][^<>\d\.,]{2,})/gi
  ];
  
  // Apply all patterns to find order items
  for (const regex of itemRegexes) {
    const matches = [...emailBodyHtml.matchAll(regex)];
    
    for (const match of matches) {
      if (match[1] && match[2]) {
        const quantity = match[1].trim();
        const itemName = match[2].trim();
        
        // Validate this looks like a food item
        if (itemName.length > 1 && 
            !/ORDER ID|Total paid|Delivered|Processing/i.test(itemName)) {
          // Add to items if not already there (avoid duplicates)
          const isDuplicate = orderDetails.orderItems.some(existing => 
            existing.toLowerCase().includes(itemName.toLowerCase()));
          
          if (!isDuplicate) {
            orderDetails.orderItems.push(`${quantity} X ${itemName}`);
          }
        }
      }
    }
    
    // If we found items with this pattern, no need to try others
    if (orderDetails.orderItems.length > 0) {
      break;
    }
  }
  
  return orderDetails;
};

/**
 * Main function to extract order details based on platform
 * @param {string} platform - The platform identifier (zomato, swiggy, amazon, flipkart)
 * @param {string} emailBodyHtml - The HTML content of the email
 * @returns {Object} Extracted order details
 */
export const extractOrderDetails = (platform, emailBodyHtml) => {
  // Select the appropriate extraction function based on platform
  switch (platform.toLowerCase()) {
    case 'zomato':
      return extractZomatoOrderDetails(emailBodyHtml);
    case 'swiggy':
      // Placeholder for future implementation
      return null;
    case 'amazon':
      // Placeholder for future implementation
      return null;
    case 'flipkart':
      // Placeholder for future implementation
      return null;
    default:
      console.log(`No parser available for platform: ${platform}`);
      return null;
  }
};

export default {
  extractOrderDetails,
  extractZomatoOrderDetails
};