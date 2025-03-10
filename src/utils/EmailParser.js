// src/utils/EmailParser.js
/**
 * Email parser utility for extracting structured data from platform-specific emails
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
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Object to store our extracted data
    const orderDetails = {
      restaurantName: null,
      restaurantCity: null,
      orderItems: [],
      totalPrice: null,
      orderId: null,
      orderStatus: null
    };
    
    // Extract restaurant name - handle the special character Â
    const restaurantMatch = cleanText.match(/Thank you for ordering.*?from\s+(.*?)\s*ORDER ID/i);
    if (restaurantMatch && restaurantMatch[1]) {
      orderDetails.restaurantName = restaurantMatch[1]
        .replace(/Â/g, '') // Remove the special character
        .trim();
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
    
    // Extract city - specifically look for common city names
    const cityMatch = cleanText.match(/([A-Za-z]+)(?=\s+\d+\s*X)/i);
    if (cityMatch && cityMatch[1]) {
      orderDetails.restaurantCity = cityMatch[1].trim();
    } else {
      // Better city extraction looking for city names after commas in address
      const addressParts = cleanText.split(",");
      for (let i = 0; i < addressParts.length; i++) {
        const part = addressParts[i].trim();
        // City names are typically short, don't contain Road/Street, and appear toward the end
        if (/^[A-Za-z\s]+$/.test(part) && part.length < 20 && 
            !part.includes("Road") && !part.includes("Street")) {
          orderDetails.restaurantCity = part;
          break;
        }
      }
    }
    
    // Extract order items
    // First, find the position after the restaurant address and before "Total paid"
    const cityPos = cleanText.indexOf(orderDetails.restaurantCity || "Salem");
    const totalPaidPos = cleanText.indexOf("Total paid");
    
    if (cityPos > 0 && totalPaidPos > cityPos) {
      // Extract the section that contains order items
      const itemsSection = cleanText.substring(cityPos + (orderDetails.restaurantCity || "Salem").length, totalPaidPos).trim();
      
      // Look for patterns like "2 X Item [description]" or just "2 X Item"
      const itemRegex = /(\d+)\s*X\s*([^\[\d]+)(?:\[\s*([^\]]+)\s*\])?/gi;
      let match;
      
      while ((match = itemRegex.exec(itemsSection)) !== null) {
        const quantity = match[1].trim();
        const itemName = match[2].trim();
        const description = match[3] ? ` [${match[3].trim()}]` : '';
        
        orderDetails.orderItems.push(`${quantity} x ${itemName}${description}`);
      }
    }
    
    // Extract total price
    const totalMatch = cleanText.match(/Total paid\s*-\s*.*?(\d+\.?\d*)/i);
    if (totalMatch && totalMatch[1]) {
      orderDetails.totalPrice = `₹${totalMatch[1]}`;
    }
    
    return orderDetails;
  };
  
  /**
   * Extract order details from Swiggy emails
   * @param {string} emailBodyHtml - The HTML content of the email
   * @returns {Object} Extracted order details
   */
  export const extractSwiggyOrderDetails = (emailBodyHtml) => {
    // Placeholder for Swiggy parsing logic
    // Will be implemented in the future
    return null;
  };
  
  /**
   * Extract order details from Amazon emails
   * @param {string} emailBodyHtml - The HTML content of the email
   * @returns {Object} Extracted order details
   */
  export const extractAmazonOrderDetails = (emailBodyHtml) => {
    // Placeholder for Amazon parsing logic
    // Will be implemented in the future
    return null;
  };
  
  /**
   * Extract order details from Flipkart emails
   * @param {string} emailBodyHtml - The HTML content of the email
   * @returns {Object} Extracted order details
   */
  export const extractFlipkartOrderDetails = (emailBodyHtml) => {
    // Placeholder for Flipkart parsing logic
    // Will be implemented in the future
    return null;
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
        return extractSwiggyOrderDetails(emailBodyHtml);
      case 'amazon':
        return extractAmazonOrderDetails(emailBodyHtml);
      case 'flipkart':
        return extractFlipkartOrderDetails(emailBodyHtml);
      default:
        console.log(`No parser available for platform: ${platform}`);
        return null;
    }
  };
  
  export default {
    extractOrderDetails,
    extractZomatoOrderDetails,
    extractSwiggyOrderDetails,
    extractAmazonOrderDetails,
    extractFlipkartOrderDetails
  };