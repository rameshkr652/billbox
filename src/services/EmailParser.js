import { decode } from 'base-64';

const extractEmailData = (messageData) => {
  try {
    // Find the email's HTML body
    const htmlPart = messageData.parts.find(part => part.mimeType === 'text/html');
    
    if (!htmlPart || !htmlPart.body || !htmlPart.body.data) {
      console.error("No HTML content found in email.");
      return null;
    }

    // Decode Base64 content
    const decodedBody = decode(htmlPart.body.data);

    // Extract restaurant name (Assuming it appears before "ORDER ID:")
    const restaurantNameMatch = decodedBody.match(/(?:Thank you for ordering from|Your order from)\s*(.*?)(?:ORDER ID|has been placed)/);
    const restaurantName = restaurantNameMatch ? restaurantNameMatch[1].trim() : "Restaurant Not Found";

    // Extract order ID
    const orderIDMatch = decodedBody.match(/ORDER ID:\s*(\d+)/);
    const orderID = orderIDMatch ? orderIDMatch[1] : "Order ID Not Found";

    // Extract total paid
    const totalPaidMatch = decodedBody.match(/Total paid\s*-\s*₹([\d.,]+)/);
    const totalPaid = totalPaidMatch ? `₹${totalPaidMatch[1]}` : "Total Paid Not Found";

    // Extract food items (e.g., "1 X Meal")
    const foodItems = [];
    const foodItemMatches = decodedBody.match(/\d+\s*X\s*[a-zA-Z ]+/g);
    if (foodItemMatches) {
      foodItems.push(...foodItemMatches);
    }

    return {
      restaurantName,
      orderID,
      totalPaid,
      foodItems
    };
  } catch (error) {
    console.error("Error extracting email data:", error);
    return null;
  }
};

export default extractEmailData;
