// src/utils/BankParser.js
// Utility functions for parsing bank transaction emails

/**
 * Extract transaction details from bank email content
 * @param {string} emailBodyHtml - The HTML content of the email
 * @param {string} bankId - The bank identifier
 * @returns {Object|null} Extracted transaction details or null if not found
 */
export const extractTransactionDetails = (emailBodyHtml, bankId) => {
    if (!emailBodyHtml || !bankId) return null;
    
    // Clean up the HTML
    const cleanText = emailBodyHtml
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/Â/g, '') // Remove special character
      .replace(/\s+/g, ' ')
      .trim();
    
    // Select the appropriate extraction function based on bank
    switch (bankId) {
      case 'hdfc':
        return extractHdfcTransactionDetails(cleanText);
      case 'icici':
        return extractIciciTransactionDetails(cleanText);
      case 'sbi':
        return extractSbiTransactionDetails(cleanText);
      case 'axis':
        return extractAxisTransactionDetails(cleanText);
      // Add more banks as needed
      default:
        return extractGenericTransactionDetails(cleanText);
    }
  };
  
  /**
   * Extract transaction details from HDFC Bank emails
   * @param {string} text - The cleaned email text
   * @returns {Object|null} Transaction details or null if not found
   */
  const extractHdfcTransactionDetails = (text) => {
    // Sample implementation - needs customization based on actual email format
    try {
      // Example patterns for HDFC Bank transaction emails
      const transaction = {
        type: null,
        amount: null,
        date: null,
        description: null,
        accountLastDigits: null,
        balance: null
      };
      
      // Match amount
      const amountMatch = text.match(/(?:Rs|INR|Amount)[.:]?\s*([0-9,]+\.\d{2})/i);
      if (amountMatch && amountMatch[1]) {
        transaction.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      }
      
      // Determine transaction type
      if (text.includes('credited') || text.includes('deposit')) {
        transaction.type = 'credit';
      } else if (text.includes('debited') || text.includes('withdrawal')) {
        transaction.type = 'debit';
        // For debits, amount should be negative
        if (transaction.amount) transaction.amount = -transaction.amount;
      }
      
      // Match date
      const dateMatch = text.match(/on\s+(\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        transaction.date = new Date(dateMatch[1]);
      }
      
      // Match description
      const descMatch = text.match(/(?:at|to|from|by)\s+([A-Za-z0-9\s\-/&.]+?)(?:on|dated|for)/i);
      if (descMatch && descMatch[1]) {
        transaction.description = descMatch[1].trim();
      }
      
      // Match account
      const acctMatch = text.match(/(?:a\/c no|account)[.:]?\s*[xX*]+(\d{4})/i);
      if (acctMatch && acctMatch[1]) {
        transaction.accountLastDigits = acctMatch[1];
      }
      
      // Match available balance
      const balMatch = text.match(/(?:available balance|bal)[.:]?\s*(?:Rs|INR)?[.:]?\s*([0-9,]+\.\d{2})/i);
      if (balMatch && balMatch[1]) {
        transaction.balance = parseFloat(balMatch[1].replace(/,/g, ''));
      }
      
      return transaction;
    } catch (error) {
      console.error('Error extracting HDFC transaction details:', error);
      return null;
    }
  };
  
  /**
   * Extract transaction details from ICICI Bank emails
   * @param {string} text - The cleaned email text
   * @returns {Object|null} Transaction details or null if not found
   */
  const extractIciciTransactionDetails = (text) => {
    // Placeholder implementation - needs customization based on actual email format
    try {
      const transaction = {
        type: null,
        amount: null,
        date: null,
        description: null,
        accountLastDigits: null,
        balance: null
      };
      
      // Match amount and transaction type
      let amountMatch = text.match(/(?:Rs|INR)[.:]?\s*([0-9,]+\.\d{2})\s+has been credited/i);
      if (amountMatch && amountMatch[1]) {
        transaction.type = 'credit';
        transaction.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      } else {
        amountMatch = text.match(/(?:Rs|INR)[.:]?\s*([0-9,]+\.\d{2})\s+has been debited/i);
        if (amountMatch && amountMatch[1]) {
          transaction.type = 'debit';
          transaction.amount = -parseFloat(amountMatch[1].replace(/,/g, ''));
        }
      }
      
      // Match date
      const dateMatch = text.match(/on\s+(\d{2}-\d{2}-\d{4}|\d{2}\s+[A-Za-z]{3}\s+\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        transaction.date = new Date(dateMatch[1]);
      }
      
      // Other fields can be extracted similarly
      
      return transaction;
    } catch (error) {
      console.error('Error extracting ICICI transaction details:', error);
      return null;
    }
  };
  
  /**
   * Extract transaction details from SBI emails
   * @param {string} text - The cleaned email text
   * @returns {Object|null} Transaction details or null if not found
   */
  const extractSbiTransactionDetails = (text) => {
    // Placeholder - needs proper implementation
    return extractGenericTransactionDetails(text);
  };
  
  /**
   * Extract transaction details from Axis Bank emails
   * @param {string} text - The cleaned email text
   * @returns {Object|null} Transaction details or null if not found
   */
  const extractAxisTransactionDetails = (text) => {
    // Placeholder - needs proper implementation
    return extractGenericTransactionDetails(text);
  };
  
  /**
   * Generic extractor for bank emails when specific parser not available
   * @param {string} text - The cleaned email text
   * @returns {Object|null} Transaction details or null if not found
   */
  const extractGenericTransactionDetails = (text) => {
    try {
      const transaction = {
        type: null,
        amount: null,
        date: null,
        description: null,
        accountLastDigits: null,
        balance: null
      };
      
      // Determine transaction type
      if (text.includes('credited') || text.includes('received') || text.includes('deposit')) {
        transaction.type = 'credit';
      } else if (text.includes('debited') || text.includes('spent') || text.includes('withdrawal')) {
        transaction.type = 'debit';
      }
      
      // Match amount - generic pattern
      const amountMatch = text.match(/(?:Rs|INR|Amount)[.:]?\s*([0-9,]+\.\d{2})/i);
      if (amountMatch && amountMatch[1]) {
        transaction.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        if (transaction.type === 'debit') {
          transaction.amount = -transaction.amount;
        }
      }
      
      // Match date - generic pattern
      const dateMatch = text.match(/(?:on|dated)\s+(\d{2}[-/]\d{2}[-/]\d{2,4}|\d{2}\s+[A-Za-z]{3}\s+\d{4})/i);
      if (dateMatch && dateMatch[1]) {
        transaction.date = new Date(dateMatch[1]);
      } else {
        // Use email date as fallback
        transaction.date = new Date();
      }
      
      // Extract description based on common patterns
      const merchantMatches = [
        /(?:at|to|from|merchant)\s+([A-Za-z0-9\s\-/&.]+?)(?:\s+on|\s+dated|\s+for|$)/i,
        /(?:transaction|payment)\s+(?:at|to|from)\s+([A-Za-z0-9\s\-/&.]+?)(?:\s+on|\s+dated|\s+for|$)/i,
        /(?:purchase|shopping|spent)\s+(?:at|from)\s+([A-Za-z0-9\s\-/&.]+?)(?:\s+on|\s+dated|\s+for|$)/i
      ];
      
      for (const pattern of merchantMatches) {
        const match = text.match(pattern);
        if (match && match[1]) {
          transaction.description = match[1].trim();
          break;
        }
      }
      
      // If no description found, use a generic one
      if (!transaction.description) {
        transaction.description = transaction.type === 'credit' 
          ? 'Deposit/Credit'
          : 'Payment/Debit';
      }
      
      return transaction;
    } catch (error) {
      console.error('Error extracting generic transaction details:', error);
      return null;
    }
  };
  
  export default {
    extractTransactionDetails,
    extractHdfcTransactionDetails,
    extractIciciTransactionDetails,
    extractSbiTransactionDetails,
    extractAxisTransactionDetails,
    extractGenericTransactionDetails
  };