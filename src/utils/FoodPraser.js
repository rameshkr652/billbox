export const advancedCombinedFoods = (food) =>{
    food
      .replace(/^\d+\s*[Xx×]\s+/i, '')        // Remove "2 X" format
      .replace(/\s*\[[^\]]*\]/g, '')          // Remove [2 pieces]
      .replace(/\s*\([^\)]*\)/g, '')          // Remove (3 pcs)
      .replace(/^\d+\s*[-:]?\s+/i, '')        // Remove "2 - " or "3: " formats
      .replace(/^\s*[-:]?\s*\d+\s*/i, '')     // Remove trailing " - 2" numbers
      .replace(/,\s*\d+[\s\S]*$/i, '')        // Remove trailing ", 2" quantities
      
      // Common structural replacements
      .replace(/\b(full|half)\s+/gi, '')      // Remove "full/half" prefixes
      .replace(/\s{2,}/g, ' ')                // Collapse multiple spaces
      
      // Standardize dish names (A-Z)
      // Common spelling variations in Indian dishes
      .replace(/biriyani/i, 'biryani')        // Biriyani → Biryani
      .replace(/briyani/i, 'biryani')         // Briyani → Biryani
      .replace(/idly/i, 'idli')               // Idly → Idli
      .replace(/uttapam/i, 'uthappam')        // Uttapam → Uthappam
      .replace(/utthapapam/i, 'uthappam')     // Utthapapam → Uthappam
      .replace(/utthapam/i, 'uthappam')       // Utthapam → Uthappam
      .replace(/dhoklaa?/i, 'dhokla')         // Dhoklaa/Dhokla → Dhokla
      .replace(/pulav/i, 'pulao')             // Pulav → Pulao
      .replace(/chapathi/i, 'chapati')        // Chapathi → Chapati
      .replace(/chapatti/i, 'chapati')        // Chapatti → Chapati
      .replace(/parotta/i, 'paratha')         // Parotta → Paratha
      .replace(/porotta/i, 'paratha')         // Porotta → Paratha
      .replace(/poratha/i, 'paratha')         // Poratha → Paratha
      .replace(/dhal/i, 'dal')                // Dhal → Dal
      .replace(/dosa(i|m)?/i, 'dosa')         // Dosai/Dosam → Dosa
      .replace(/poori/i, 'puri')              // Poori → Puri
      .replace(/sambhar/i, 'sambar')          // Sambhar → Sambar
      .replace(/punjabi/i, 'paneer')          // Fix common typo for Paneer
      .replace(/moglai/i, 'mughlai')          // Moglai → Mughlai
      .replace(/kofta?/i, 'kofta')            // Koft → Kofta
      .replace(/roti?/i, 'roti')              // Rot → Roti
      .replace(/curry?/i, 'curry')            // Curr → Curry
      .replace(/korma/i, 'kurma')             // Korma → Kurma
      .replace(/tikka?/i, 'tikka')            // Tikk → Tikka
      .replace(/masala?/i, 'masala')          // Masal → Masala
      .replace(/raitha/i, 'raita')            // Raitha → Raita
      .replace(/bhaji?/i, 'bhaji')            // Bhaj → Bhaji
      .replace(/chutney?/i, 'chutney')        // Chutne → Chutney
      .replace(/naan?/i, 'naan')              // Naa → Naan
      .replace(/chicken?/i, 'chicken')        // Chicke → Chicken
      .replace(/mutton?/i, 'mutton')          // Mutto → Mutton
      .replace(/paneer?/i, 'paneer')          // Panee → Paneer
      .replace(/meals?/i, 'meals')            // Meal → Meals
      .replace(/thali?/i, 'thali')       // Thal → Thali
      .replace(/aloo?\b/gi, 'aloo')           // Alu/Aalu → Aloo
      .replace(/appalam|papadam/gi, 'papad')
      .replace(/bath\b/gi, 'baath')           // Veg Bath → Veg Baath
      .replace(/bhel\s?pur?i/gi, 'bhel puri')
      .replace(/bhindi?\b/gi, 'bhindi')       // Bhendi → Bhindi
      .replace(/biryani/gi, 'biryani')        // Standardize biryani
      .replace(/chaat\b/gi, 'chaat')          // Chāt → Chaat
      .replace(/channa?\b/gi, 'chole')        // Chana/Channa → Chole
      .replace(/chettinad/gi, 'chettinadu')   // Standardize region names
      .replace(/dabeli/gi, 'daabeli')         // Dabēli → Daabeli
      .replace(/dal\b/gi, 'dal')              // Dhal → Dal
      .replace(/dosa(i|m)?\b/gi, 'dosa')      // Dosai/Dosam → Dosa
      .replace(/falooda/gi, 'faluda')         // Alternate spelling
      .replace(/gajar\b/gi, 'gajar')          // Gajjar → Gajar
      .replace(/gol\s*gappa/gi, 'pani puri')  // Regional names
      .replace(/halwa\b/gi, 'halwa')          // Halva → Halwa
      .replace(/idly/gi, 'idli')              // Idly → Idli
      .replace(/jira\b/gi, 'jeera')           // Jira → Jeera
      .replace(/kator(i|y)/gi, 'kachori')     // Katori → Kachori
      .replace(/kofta\b/gi, 'kofta')          // Koft → Kofta
      .replace(/korma/gi, 'kurma')            // Korma → Kurma
      .replace(/kulcha/gi, 'kulcha')          // Kulcha → Kulcha
      .replace(/lassi\b/gi, 'lassi')          // Lassy → Lassi
      .replace(/malai\b/gi, 'malai')          // Malay → Malai
      .replace(/matar\b/gi, 'mutter')         // Matar → Mutter
      .replace(/murgh\b/gi, 'chicken')         // Murgh → Chicken
      .replace(/naan/gi, 'naan')              // Nan → Naan
      .replace(/pakoda/gi, 'pakora')          // Pakoda → Pakora
      .replace(/palak\b/gi, 'palak')          // Paalak → Palak
      .replace(/paneer/gi, 'paneer')          // Panir → Paneer
      .replace(/parantha?/gi, 'paratha')      // Paranta → Paratha
      .replace(/pav\b/gi, 'pav')              // Pao → Pav
      .replace(/poha\b/gi, 'poha')            // Pohe → Poha
      .replace(/pulao/gi, 'pulao')            // Pulav → Pulao
      .replace(/puri\b/gi, 'puri')            // Poori → Puri
      .replace(/raita\b/gi, 'raita')          // Raitha → Raita
      .replace(/rasam\b/gi, 'rasam')          // Chaaru → Rasam
      .replace(/roti\b/gi, 'roti')            // Rot → Roti
      .replace(/sabzi/gi, 'sabji')            // Sabzi → Sabji
      .replace(/samosa/gi, 'samosa')          // Samossa → Samosa
      .replace(/sambar/gi, 'sambar')          // Sambhar → Sambar
      .replace(/shahi\b/gi, 'shahi')          // Shaahi → Shahi
      .replace(/tandoori/gi, 'tandoori')      // Tandoor → Tandoori
      .replace(/tava\b/gi, 'tawa')            // Thava → Tawa
      .replace(/thali\b/gi, 'thali')          // Thaali → Thali
      .replace(/tikka\b/gi, 'tikka')          // Tikk → Tikka
      .replace(/upma\b/gi, 'upma')            // Uppuma → Upma
      .replace(/uthapam/gi, 'uthappam')       // Uttapam → Uthappam
      .replace(/vada\b/gi, 'vada')            // Wada → Vada
      .replace(/zira\b/gi, 'jeera')           // Zira → Jeera
      
      // Regional dish specializations
      .replace(/avial\b/gi, 'avial')          // Aviyal → Avial
      .replace(/bisi\s*bele\s*bath/gi, 'bisi bele bath')
      .replace(/daal\s*maakhni/gi, 'dal makhani')
      .replace(/gulab\s*jamun/gi, 'gulab jamun')
      .replace(/hyderabadi\s+dum/gi, 'hyderabadi dum')
      .replace(/kerala\s+parotta/gi, 'kerala paratha')
      .replace(/mysore\s+masala\s+dosa/gi, 'mysore masala dosa')
      .replace(/palkova/gi, 'pal khova')
      
      // Final cleanup
      .trim()
      .toLowerCase()
      .replace(/\b(\w+)\b(?:s\b)/g, '$1')    // Remove pluralization
      .replace(/[^a-z0-9\s]/g, '')            // Remove special characters
      .replace(/\s{2,}/g, ' ');               // Final space cleanup
  }