// src/components/DietaryPreferencesSection.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 90; // Account for padding and margins

const DietaryPreferencesSection = ({ emails, platformColor }) => {
  const [dietStats, setDietStats] = useState({
    veg: 0,
    nonVeg: 0,
    vegan: 0,
    total: 0
  });
  
  const [barWidths] = useState({
    veg: new Animated.Value(0),
    nonVeg: new Animated.Value(0),
    vegan: new Animated.Value(0)
  });
  
  useEffect(() => {
    if (emails && emails.length > 0) {
      analyzeDietaryData();
    }
  }, [emails]);
  
  const analyzeDietaryData = () => {
    const stats = {
      veg: 0,
      nonVeg: 0,
      vegan: 0,
      total: 0
    };
    
    // Expanded vegetarian food item keywords with Indian cuisine focus
    const vegKeywords = [
      // Basic veg identifiers
      'paneer', 'veg', 'vegetable', 'vegetarian', 'veggie',
      
      // Veg proteins
      'tofu', 'chana', 'beans', 'lentil', 'dal', 'masoor', 'moong', 'toor', 'rajma', 
      
      // Vegetables
      'aloo', 'potato', 'gobi', 'cauliflower', 'palak', 'spinach', 'bhindi', 'okra', 'ladyfinger',
      'brinjal', 'eggplant', 'baingan', 'broccoli', 'carrots', 'gajar', 'peas', 'matar', 
      'capsicum', 'bell pepper', 'shimla mirch', 'mushroom', 'methi', 'fenugreek', 'cabbage', 
      'tomato', 'onion', 'ginger', 'pumpkin', 'kaddu', 'lauki', 'bottle gourd', 'karela',
      'bitter gourd', 'parwal', 'turnip', 'tinda', 'turai', 'ridge gourd', 'lotus stem', 'kamal kakdi',
      
      // South Indian veg items
      'idli', 'dosa', 'uttapam', 'vada', 'sambar', 'rasam', 'upma', 'pesarattu', 'pongal',
      'appam', 'payasam', 'bisi bele bath', 'avial', 'thoran', 'olan', 'pachadi',
      
      // North Indian veg items
      'paratha', 'chapati', 'roti', 'naan', 'kulcha', 'puri', 'chole', 'chana masala',
      'rajma', 'dal makhani', 'kadhi', 'pakora', 'paneer tikka', 'paneer butter masala',
      'paneer makhani', 'shahi paneer', 'malai kofta', 'palak paneer', 'matar paneer',
      'navratan korma', 'aloo gobi', 'aloo matar', 'aloo palak', 'bhindi masala',
      'baingan bharta', 'pav bhaji', 'veg biryani', 'veg pulao', 'jeera rice',
      
      // East Indian veg items
      'rasgulla', 'sandesh', 'mishti doi', 'pitha', 'aloo posto', 'cholar dal',
      'dhokar dalna', 'shukto', 'posto bora', 'bhaja', 'tarkari',
      
      // West Indian veg items
      'dhokla', 'khandvi', 'thepla', 'fafda', 'jalebi', 'undhiyu', 'khakhra',
      'basundi', 'shrikhand', 'batata vada', 'dabeli', 'patra', 'handvo',
      
      // Dairy and Desserts
      'paneer', 'cheese', 'curd', 'yogurt', 'raita', 'butter', 'ghee', 'cream',
      'malai', 'kheer', 'halwa', 'sweet', 'dessert', 'ice cream', 'cake', 'pastry',
      'gulab jamun', 'jalebi', 'ladoo', 'barfi', 'rasgulla', 'rasmalai', 'imarti',
      'rabri', 'kulfi', 'falooda', 'peda', 'mysore pak', 'modak', 'payasam',
      
      // Breads
      'roti', 'naan', 'paratha', 'chapati', 'kulcha', 'bhatura', 'puri', 'bread', 'bun', 'pav',
      
      // Snacks
      'samosa', 'kachori', 'bhaji', 'pakora', 'vada', 'dhokla', 'khakhra', 'chaat',
      'pani puri', 'bhel puri', 'dahi puri', 'sev puri', 'aloo tikki', 'dahi vada',
      'poha', 'upma', 'idli', 'dosa', 'uttapam',
      
      // Breakfast items
      'upma', 'poha', 'idli', 'dosa', 'vada', 'uttapam', 'dhokla', 'thepla',
      'paratha', 'aloo paratha'
    ];
    
    // Expanded non-veg food item keywords with Indian cuisine focus
    const nonVegKeywords = [
      // Meat types
      'chicken', 'murgh', 'mutton', 'lamb', 'beef', 'pork', 'goat', 'keema', 'mince', 'meat',
      
      // Seafood
      'fish', 'machli', 'prawn', 'jhinga', 'shrimp', 'crab', 'kekda', 'lobster', 'squid', 
      'oyster', 'pomfret', 'surmai', 'hilsa', 'ilish', 'rohu', 'bombil', 'bombay duck', 
      'seafood', 'tuna', 'salmon', 'mackerel', 'bangda',
      
      // Other non-veg
      'egg', 'anda', 'omelette', 'bhurji', 'non-veg', 'nonveg', 'non veg',
      
      // North Indian non-veg dishes
      'butter chicken', 'chicken tikka', 'chicken tikka masala', 'tandoori chicken',
      'chicken korma', 'kadai chicken', 'murgh makhani', 'chicken curry', 'chicken biryani',
      'mutton biryani', 'mutton curry', 'rogan josh', 'keema matar', 'keema pav',
      'nihari', 'paya', 'bhuna gosht', 'laal maas', 'seekh kebab', 'galouti kebab',
      'shammi kebab', 'boti kebab', 'hariyali kebab', 'tangdi kebab', 'malai tikka',
      
      // South Indian non-veg dishes
      'chicken chettinad', 'andhra chicken curry', 'mangalorean fish curry', 'fish moilee',
      'meen curry', 'chicken 65', 'prawn masala', 'meen pollichathu', 'anjal fry',
      'mutton sukka', 'nati koli saaru', 'keema dosa', 'chicken ghee roast',
      
      // East Indian non-veg dishes
      'maacher jhol', 'ilish bhapa', 'chingri malai curry', 'kosha mangsho',
      'fish kalia', 'doi maach', 'muri ghonto', 'chicken rezala', 'kathi roll',
      
      // West Indian non-veg dishes
      'chicken xacuti', 'chicken cafreal', 'sorpotel', 'bombil fry', 'kolhapuri chicken',
      'malvani fish curry', 'goan fish curry', 'mackerel recheado', 'vindaloo',
      
      // Other Indian non-veg dishes
      'chicken biryani', 'mutton biryani', 'fish biryani', 'egg biryani', 'keema biryani',
      'chicken dum biryani', 'hyderabadi biryani', 'lucknowi biryani', 'kolkata biryani',
      'thalassery biryani', 'dindigul biryani', 'chettinad biryani',
      
      // Common accompaniments
      'egg curry', 'egg roast', 'egg masala', 'anda curry', 'fish fry', 'tandoori fish',
      'prawn curry', 'prawn masala', 'prawn fry', 'crab curry', 'crab masala'
    ];
    
    // Expanded vegan food item keywords with Indian cuisine focus
    const veganKeywords = [
      // Basic vegan identifiers
      'vegan', 'plant-based', 'plant based', 'dairy-free', 'dairy free',
      
      // Vegan milks and alternatives
      'almond milk', 'soy milk', 'coconut milk', 'oat milk', 'cashew milk',
      'rice milk', 'hemp milk', 'vegan curd', 'vegan yogurt', 'vegan butter',
      'vegan ghee', 'vegan cheese', 'vegan cream', 'vegan paneer',
      
      // Vegan proteins
      'tofu', 'tempeh', 'seitan', 'soya chunks', 'soya granules', 'jackfruit',
      'kathal', 'mock meat', 'plant protein', 'vegan protein',
      
      // Indian vegan dishes
      'dal tadka', 'chana masala', 'aloo gobi', 'baingan bharta', 'bhindi masala',
      'pav bhaji vegan', 'vegan biryani', 'vegetable tahiri', 'jeera aloo',
      'vegan tikka masala', 'vegan butter masala', 'vegan korma',
      
      // Vegan South Indian dishes
      'masala dosa vegan', 'idli vegan', 'vada vegan', 'uttapam vegan',
      'coconut chutney', 'tomato chutney', 'sambar vegan', 'rasam vegan',
      
      // Vegan desserts
      'vegan kheer', 'vegan halwa', 'vegan barfi', 'vegan ladoo', 'vegan gulab jamun',
      'vegan ice cream', 'vegan cake', 'vegan dessert', 'vegan sweet',
      
      // Other vegan foods
      'hummus', 'falafel', 'avocado', 'quinoa', 'chia seeds', 'flaxseed',
      'nutritional yeast', 'vegan burger', 'vegan sausage', 'vegan nuggets',
      'vegan mayonnaise', 'vegan dahi', 'vegan yogurt', 'vegan raita',
      
      // Lentil-based dishes (when specifically marked vegan)
      'vegan dal makhani', 'vegan rajma', 'vegan chole', 'vegan kadhi',
      'vegan daal', 'vegan dal', 'vegan dahl'
    ];
    
    // Check each email's order items
    emails.forEach(email => {
      if (email.orderDetails && email.orderDetails.orderItems && Array.isArray(email.orderDetails.orderItems)) {
        email.orderDetails.orderItems.forEach(item => {
          // Remove quantity markers (e.g., "2 X") and convert to lowercase
          const itemText = item.replace(/^\d+\s*[Xx×]\s+/i, '').toLowerCase();
          
          // Track total items
          stats.total++;
          
          // Check if vegan
          if (veganKeywords.some(keyword => itemText.includes(keyword))) {
            stats.vegan++;
            return; // If it's vegan, skip the other checks
          }
          
          // Check if vegetarian
          if (vegKeywords.some(keyword => itemText.includes(keyword)) &&
              !nonVegKeywords.some(keyword => itemText.includes(keyword))) {
            stats.veg++;
            return; // If it's veg, skip the remaining checks
          }
          
          // Check if non-vegetarian
          if (nonVegKeywords.some(keyword => itemText.includes(keyword))) {
            stats.nonVeg++;
            return; // If it's non-veg, skip the remaining checks
          }
          
          // If we couldn't categorize the item, default to including it in total only
        });
      }
    });
    
    // Update state with the calculated stats
    setDietStats(stats);
    
    // Animate the bars
    animateBars(stats);
  };
  
  const animateBars = (stats) => {
    const categorizedTotal = stats.veg + stats.nonVeg + stats.vegan;
    const total = categorizedTotal || 1; // Avoid division by zero
    
    Animated.parallel([
      Animated.timing(barWidths.veg, {
        toValue: (stats.veg / total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.nonVeg, {
        toValue: (stats.nonVeg / total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.vegan, {
        toValue: (stats.vegan / total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      })
    ]).start();
  };
  
  const getPercentage = (value) => {
    const categorizedTotal = dietStats.veg + dietStats.nonVeg + dietStats.vegan;
    if (categorizedTotal === 0) return '0%';
    return `${Math.round((value / categorizedTotal) * 100)}%`;
  };
  
  // Don't render if no data or all zeros
  const categorizedTotal = dietStats.veg + dietStats.nonVeg + dietStats.vegan;
  if (categorizedTotal === 0) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Icon name="restaurant" size={20} color={platformColor} style={styles.titleIcon} />
            <Text style={styles.title}>Your Dietary Preferences</Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          {/* Vegetarian */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <View style={[styles.dotIndicator, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.labelText}>Vegetarian</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.veg, backgroundColor: '#4CAF50' }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{dietStats.veg}</Text>
              <Text style={styles.percentText}>({getPercentage(dietStats.veg)})</Text>
            </View>
          </View>
          
          {/* Non-Vegetarian */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <View style={[styles.dotIndicator, { backgroundColor: '#F44336' }]} />
              <Text style={styles.labelText}>Non-Veg</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.nonVeg, backgroundColor: '#F44336' }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{dietStats.nonVeg}</Text>
              <Text style={styles.percentText}>({getPercentage(dietStats.nonVeg)})</Text>
            </View>
          </View>
          
          {/* Vegan */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <View style={[styles.dotIndicator, { backgroundColor: '#8BC34A' }]} />
              <Text style={styles.labelText}>Vegan</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.vegan, backgroundColor: '#8BC34A' }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{dietStats.vegan}</Text>
              <Text style={styles.percentText}>({getPercentage(dietStats.vegan)})</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {dietStats.veg > dietStats.nonVeg ? 
              'You prefer vegetarian food!' : 
              dietStats.nonVeg > dietStats.veg ? 
                'You prefer non-vegetarian options!' : 
                'You have a balanced diet of veg and non-veg!'
            }
            {dietStats.vegan > 0 && dietStats.vegan > dietStats.veg * 0.5 && 
              ' With a good amount of vegan choices too!'}
          </Text>
          <Text style={styles.summarySubtext}>Based on {categorizedTotal} identified items</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statLabel: {
    width: 90,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  labelText: {
    fontSize: 14,
    color: '#555',
  },
  barContainer: {
    flex: 1,
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  },
  statValue: {
    width: 60,
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  percentText: {
    fontSize: 12,
    color: '#777',
  },
  summaryContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  summarySubtext: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
  }
});

export default DietaryPreferencesSection;