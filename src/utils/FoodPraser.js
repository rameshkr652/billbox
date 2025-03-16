export const advancedCombinedFoods = (food) => {
    // Store the original input for reference and pattern checking
    const originalFood = food;
    
    // STEP 1: Initial cleanup of quantity formats while PRESERVING important apostrophes
    let result = food
      // Handle quantity prefixes
      .replace(/^\d+(\.\d+)?\s*[Xx×]\s+/i, '')                    // Remove "2 X" or "2.5 X" format
      .replace(/^\d+(\.\d+)?\s*[-:]?\s+/i, '')                    // Remove "2 - " or "3: " or "0.5 - " formats
      .replace(/^\s*[-:]?\s*\d+(\.\d+)?\s*/i, '')                 // Remove " - 2" numbers at start
      
      // Handle bracketed quantities anywhere
      .replace(/\s*\[\s*\d+(\.\d+)?\s*([a-z]+\s*)?\]\s*/gi, ' ') // Remove [2] or [2 pieces] or [0.5 kg] etc.
      .replace(/\s*\(\s*\d+(\.\d+)?\s*([a-z]+\s*)?\)\s*/gi, ' ') // Remove (3) or (3 pcs) or (0.5 kg) etc.
      
      // Handle common size prefixes
      .replace(/\b(full|half|small|large|medium|regular|jumbo)\s+/gi, '') // Remove size prefixes
      
      // Final spacing cleanup
      .replace(/\s{2,}/g, ' ').trim();                           // Collapse multiple spaces
  
    // STEP 2: Special handling for dishes with slashes - preserve the distinction
    if (/\s\/\s/.test(originalFood) || /\w\/\w/.test(originalFood)) {
      const parts = result.split(/\s*\/\s*/);
      if (parts.length > 1) {
        const processedParts = parts.map(part => preserveSpecialsAndStandardize(part.trim()));
        
        const areDistinctDishes = !processedParts[0].includes(processedParts[1]) && 
                                 !processedParts[1].includes(processedParts[0]);
        
        if (areDistinctDishes) {
          return processedParts.join(' / ').toLowerCase();
        }
      }
    }
    
    // STEP 3: Standard processing for single dishes
    return preserveSpecialsAndStandardize(result).toLowerCase();
  };
  
  // Helper function to standardize dishes while preserving special cases
  function preserveSpecialsAndStandardize(food) {
    // IMPORTANT: Extract and save special patterns before standardization
    const specialPatterns = [];
    
    // Extract measurement patterns (e.g., "250 gm's")
    const measurementRegex = /(\d+\s*(?:gm|ml|oz|kg|g|lb|lbs|gram|grams)'s)/gi;
    food = food.replace(measurementRegex, match => {
      const id = `__MEASUREMENT_${specialPatterns.length}__`;
      specialPatterns.push({ id, value: match });
      return id;
    });
    
    // Extract possessive nouns (e.g., "Vilwardri's", "chip's")
    const possessiveRegex = /(\w+)'s\b/g;
    food = food.replace(possessiveRegex, match => {
      const id = `__POSSESSIVE_${specialPatterns.length}__`;
      specialPatterns.push({ id, value: match });
      return id;
    });
    
    // Perform standard dish name normalization
    let result = food
      // Combined spelling variations in a more efficient way
      .replace(/bir(i|y)ani/i, 'biryani')      // Biriyani/Briyani → Biryani
      .replace(/idly/i, 'idli')                // Idly → Idli
      .replace(/u(t|th){1,2}(h)?ap(p)?a(m|n)/i, 'uthappam') // All uthappam variations
      .replace(/dhoklaa?/i, 'dhokla')          // Dhoklaa/Dhokla → Dhokla
      .replace(/pulav/i, 'pulao')              // Pulav → Pulao
      .replace(/chapa(t(h)?i|tti)/i, 'chapati')// Chapathi/Chapatti → Chapati
      .replace(/p(a|o)r(o|a)(t(h)?a)/i, 'paratha') // Parotta/Porotta → Paratha
      .replace(/dhal/i, 'dal')                 // Dhal → Dal
      .replace(/dosa(i|m)?/i, 'dosa')          // Dosai/Dosam → Dosa
      .replace(/poori/i, 'puri')               // Poori → Puri
      .replace(/sambhar/i, 'sambar')           // Sambhar → Sambar
      .replace(/moglai/i, 'mughlai')           // Moglai → Mughlai
      .replace(/roti?\b/i, 'roti')             // Rot → Roti
      .replace(/curry?\b/i, 'curry')           // Curr → Curry
      .replace(/korma/i, 'kurma')              // Korma → Kurma
      .replace(/masala?\b/i, 'masala')         // Masal → Masala
      .replace(/raitha/i, 'raita')             // Raitha → Raita
      .replace(/bhaji?\b/i, 'bhaji')           // Bhaj → Bhaji
      .replace(/chutney?\b/i, 'chutney')       // Chutne → Chutney
      .replace(/naan?\b/i, 'naan')             // Naa → Naan
      
      // Consolidated protein terms
      .replace(/chicken?\b/i, 'chicken')       // Chicke → Chicken
      .replace(/mutton?\b/i, 'mutton')         // Mutto → Mutton
      .replace(/paneer?\b/i, 'paneer')         // Panee → Paneer
      .replace(/murgh\b/gi, 'chicken')         // Murgh → Chicken
      
      // Regional dish specializations
      .replace(/gol\s*gappa/gi, 'pani puri')   // Regional names standardization
      .replace(/pakoda/gi, 'pakora')           // Pakoda → Pakora
      .replace(/appalam|papadam/gi, 'papad')   // Regional variations to standard
      .replace(/bath\b/gi, 'baath')            // Veg Bath → Veg Baath
      .replace(/channa?\b/gi, 'chole')         // Chana/Channa → Chole
      .replace(/chettinad/gi, 'chettinadu')    // Standardize region names
      .replace(/falooda/gi, 'faluda')          // Alternate spelling
      
      // Soup variations
      .replace(/paya(\s+soup)?/i, 'paya soup')  // Standardize paya soup
      .replace(/aatukal(\s+soup)?/i, 'aatukal soup') // Standardize aatukal soup
      
      // Initial cleanup only removing truly problematic chars
      .trim()
      .replace(/\b(\w+)\b(?:s\b)/g, '$1')     // Remove pluralization
      .replace(/[^a-z0-9\s\/'_]/gi, '')       // Remove special chars EXCEPT slashes/apostrophes/placeholders
      .replace(/\s{2,}/g, ' ')                // Final space cleanup
      .trim();
    
    // Restore special patterns that were saved
    specialPatterns.forEach(pattern => {
      result = result.replace(pattern.id, pattern.value);
    });
    
    // Final cleanup after restoration
    return result;
  }