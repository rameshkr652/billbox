// src/utils/EmailBodyExtractor.js
/**
 * Utility to extract email body content from Gmail message data
 */

/**
 * Decode base64 URL-encoded content
 * @param {string} data - Base64 URL-encoded string
 * @returns {string} Decoded text
 */
const decodeBase64Url = (data) => {
    if (!data) return '';
    
    try {
      // Convert from base64url to standard base64
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      
      // Decode base64 to binary
      const binary = atob(base64);
      
      // Convert binary to UTF-8 string
      // This approach handles UTF-8 characters correctly
      return decodeURIComponent(
        Array.from(binary)
          .map(char => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch (error) {
      console.error('Error decoding base64:', error);
      
      // Fallback: try simpler decoding for ASCII text
      try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return atob(base64);
      } catch (e) {
        console.error('Fallback decoding failed:', e);
        return 'Error decoding content';
      }
    }
  };
  
  /**
   * Extract email body from Gmail message data
   * @param {Object} messageData - The full message data from Gmail API
   * @returns {string} Extracted email body HTML or text
   */
  export const extractEmailBody = (messageData) => {
    if (!messageData || !messageData.payload) {
      return '';
    }
    
    // Recursive function to find parts with content
    const findBodyParts = (part, preferredMimeType = null) => {
      // If this part has the body content directly
      if (part.body && part.body.data) {
        // If no preference or this matches preference
        if (!preferredMimeType || part.mimeType === preferredMimeType) {
          return [{
            mimeType: part.mimeType,
            data: part.body.data
          }];
        }
      }
      
      // If this part has nested parts
      if (part.parts && part.parts.length > 0) {
        const results = [];
        for (const nestedPart of part.parts) {
          const found = findBodyParts(nestedPart, preferredMimeType);
          if (found && found.length > 0) {
            results.push(...found);
          }
        }
        return results;
      }
      
      return [];
    };
    
    // Start with the payload
    const parts = findBodyParts(messageData.payload);
    
    // Prioritize HTML content over plain text
    const htmlPart = parts.find(part => part.mimeType === 'text/html');
    const textPart = parts.find(part => part.mimeType === 'text/plain');
    
    const selectedPart = htmlPart || textPart;
    
    if (selectedPart && selectedPart.data) {
      return decodeBase64Url(selectedPart.data);
    }
    
    // Fallback: direct body content from the payload
    if (messageData.payload.body && messageData.payload.body.data) {
      return decodeBase64Url(messageData.payload.body.data);
    }
    
    return '';
  };
  
  export default extractEmailBody;