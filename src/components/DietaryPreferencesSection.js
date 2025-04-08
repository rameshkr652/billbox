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
    total: 0
  });
  
  const [barWidths] = useState({
    veg: new Animated.Value(0),
    nonVeg: new Animated.Value(0)
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
      total: 0
    };
    
    // Comprehensive vegetarian food item keywords from all regions of India
    const vegKeywords = [
      // Basic veg identifiers
      'veg', 'vegetable', 'vegetarian', 'veggie',
      
      // North Indian veg dishes
      'paneer', 'dal makhani', 'chana masala', 'aloo gobi', 'palak paneer', 
      'rajma', 'matar paneer', 'malai kofta', 'shahi paneer', 'kadhi pakora',
      'navratan korma', 'aloo matar', 'baingan bharta', 'bhindi masala', 'aloo paratha',
      'gobi paratha', 'paneer paratha', 'chole bhature', 'pav bhaji', 'samosa',
      'kachori', 'pakora', 'dahi bhalla', 'aloo tikki', 'paneer tikka',
      'khasta kachori', 'sarson ka saag', 'makki di roti', 'paneer jalfrezi', 'lauki kofta',
      'aloo baingan', 'methi malai matar', 'paneer kofta', 'veg biryani', 'pulao',
      'jeera rice', 'kashmiri dum aloo', 'punjabi kadhi', 'amritsari kulcha', 'missi roti',
      'paneer bhurji', 'aloo methi', 'tawa sabzi', 'paneer do pyaza', 'lauki chana dal',
      'arbi masala', 'aloo shimla mirch', 'paneer lababdar',
      
      // South Indian veg dishes
      'masala dosa', 'plain dosa', 'idli', 'vada', 'sambar', 
      'rasam', 'uttapam', 'pongal', 'bisi bele bath', 'appam',
      'puttu', 'avial', 'thoran', 'olan', 'pachadi',
      'puliyogare', 'coconut rice', 'lemon rice', 'tomato bath', 'curd rice',
      'pesarattu', 'adai', 'medu vada', 'mysore pak', 'payasam',
      'poriyal', 'kootu', 'kuzhambu', 'sundal', 'upma',
      'rava idli', 'rava dosa', 'paniyaram', 'kozhambu', 'kaara kuzhambu',
      'mor kuzhambu', 'paruppu urundai kuzhambu', 'thogayal', 'milagu kuzhambu', 'puli kuzhambu',
      'vendakkai poriyal', 'vazhakkai podimas', 'kathirikai poriyal', 'cabbage poriyal', 'carrot beans poriyal',
      'kottu parotta', 'keerai masiyal', 'paruppu usili', 'karamani sundal', 'chettinadu vegetable curry',
      
      // East Indian veg dishes
      'shukto', 'aloo posto', 'cholar dal', 'dhokar dalna', 'aloo chokha',
      'santula', 'dalma', 'pakhala', 'ghugni', 'begun bhaja',
      'aloo bhaja', 'chana\'r dalna', 'luchi', 'radha ballabhi', 'koraishutir kochuri',
      'aloor dom', 'chhena poda', 'rasgulla', 'sandesh', 'mishti doi',
      'chhanar jilipi', 'posto bora', 'phulkopir dalna', 'mochar ghonto', 'enchor er dalna',
      'kumro chokka', 'labra', 'chhanar kalia', 'doodh puli', 'kheer sagar',
      'patishapta', 'narkel naru', 'khaja', 'malpua', 'pantua',
      'pithe', 'puli pithe', 'chirer pulao', 'bhapa pitha', 'dudh puli',
      'potoler dorma', 'chhanar dalna', 'jhinge posto', 'thor ghonto', 'alu potol posto',
      
      // West Indian veg dishes
      'dhokla', 'khandvi', 'thepla', 'fafda', 'khakhra',
      'undhiyu', 'patra', 'handvo', 'sev tameta', 'batata vada',
      'dabeli', 'misal pav', 'vada pav', 'thalipeeth', 'sabudana khichdi',
      'methi thepla', 'basundi', 'shrikhand', 'puran poli', 'modak',
      'gatte ki sabzi', 'dal baati churma', 'ker sangri', 'papad ki sabzi', 'bajra roti',
      'kadhi', 'mohanthal', 'ghevar', 'daal dhokli', 'lilva kachori',
      'muthiya', 'sev usal', 'ragda pattice', 'kala chana', 'surti locho',
      'khichu', 'churma ladoo', 'gatta pulao', 'bajre ka khichda', 'paush',
      'lapsi', 'khaman', 'sev khamani', 'masala bhat', 'tondli bhaji',
      'matki usal', 'zunka bhakri', 'ukadiche modak',
      
      // Veg proteins
      'chana', 'beans', 'lentil', 'dal', 'masoor', 'moong', 'toor', 'rajma', 
      
      // Vegetables
      'aloo', 'potato', 'gobi', 'cauliflower', 'palak', 'spinach', 'bhindi', 'okra', 'ladyfinger',
      'brinjal', 'eggplant', 'baingan', 'broccoli', 'carrots', 'gajar', 'peas', 'matar', 
      'capsicum', 'bell pepper', 'shimla mirch', 'mushroom', 'methi', 'fenugreek', 'cabbage', 
      'tomato', 'onion', 'ginger', 'pumpkin', 'kaddu', 'lauki', 'bottle gourd', 'karela',
      'bitter gourd', 'parwal', 'turnip', 'tinda', 'turai', 'ridge gourd', 'lotus stem', 'kamal kakdi',
      
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
      'poha', 'upma', 'idli', 'dosa', 'uttapam'
    ];
    
    // Comprehensive non-vegetarian food item keywords from all regions of India
    const nonVegKeywords = [
      // Basic non-veg identifiers
      'non-veg', 'nonveg', 'non veg',
      
      // North Indian non-veg dishes
      'butter chicken', 'chicken tikka masala', 'tandoori chicken', 'chicken korma', 'kadai chicken',
      'chicken curry', 'chicken biryani', 'mutton biryani', 'rogan josh', 'keema matar',
      'keema pav', 'nihari', 'paya', 'bhuna gosht', 'laal maas',
      'seekh kebab', 'galouti kebab', 'shammi kebab', 'boti kebab', 'hariyali kebab',
      'tangdi kebab', 'malai tikka', 'chicken reshmi kebab', 'chicken afghani', 'mutton curry',
      'chicken handi', 'chicken do pyaza', 'chicken saagwala', 'chicken chettinad', 'amritsari fish',
      'fish tikka', 'chicken kali mirch', 'chicken achari', 'mutton kofta', 'chicken changezi',
      'chicken lahori', 'chicken patiala', 'mutton korma', 'chicken kadhai', 'tawa chicken',
      'chicken kalimirch', 'chicken makhmali', 'chicken lababdar', 'egg curry', 'keema kaleji',
      'bheja fry', 'gurda kapura', 'chicken chaap', 'chicken rezala', 'chicken bharta',
      
      // South Indian non-veg dishes
      'chicken chettinad', 'hyderabadi biryani', 'malabar fish curry', 'andhra chicken curry', 'mutton ghee roast',
      'nellore chepala pulusu', 'kerala fish molee', 'karimeen pollichathu', 'chicken 65', 'prawn masala',
      'meen pollichathu', 'anjal fry', 'mutton sukka', 'nati koli saaru', 'chicken ghee roast',
      'kori rotti', 'meen curry', 'prawn roast', 'crab masala', 'mutton pepper fry',
      'dindigul biryani', 'ambur biryani', 'thalassery biryani', 'chettinad biryani', 'donne biryani',
      'chicken pepper fry', 'mutton chops', 'malabar beef fry', 'kozhi varutha curry', 'nattu kozhi kulambu',
      'prawn thokku', 'meen varuval', 'crab curry', 'squid fry', 'mutton dalcha',
      'hyderabadi haleem', 'kodi vepudu', 'gongura mamsam', 'chicken roast', 'mutton kola urundai',
      'nethili fry', 'kaadai roast', 'chettinad egg curry', 'malabar chicken curry', 'mangalorean fish curry',
      'kori gassi', 'chicken peralan', 'mutton stew', 'prawn ularthiyathu', 'meen mulakittathu',
      
      // East Indian non-veg dishes
      'kosha mangsho', 'machher jhol', 'ilish bhapa', 'chingri malai curry', 'fish kalia',
      'doi maach', 'muri ghonto', 'chicken rezala', 'kathi roll', 'machha besara',
      'mutton jhola', 'dak bungalow chicken', 'pork bharta', 'masor tenga', 'pork with bamboo shoot',
      'smoked pork', 'duck curry', 'pigeon curry', 'chitol maach muitha', 'shorshe ilish',
      'bhapa chingri', 'daab chingri', 'bhetki paturi', 'pabda macher jhal', 'tangra macher jhol',
      'mourola macher bora', 'mangsher chop', 'chicken kabiraji', 'kolkata biryani', 'dimer devil',
      'mughlai paratha', 'chicken chaap', 'mutton ghugni', 'prawn malaikari', 'luchi mangsho',
      'koldil duck', 'masor koni', 'pork with lai xaak', 'akhuni pork', 'jadoh',
      'doh khleh', 'nakham bitchi', 'pork bhot jolokia', 'chicken dohneiiong', 'misa mach poora',
      'aloo duck', 'pork indad', 'iromba', 'ngari', 'chak-hao amubi',
      
      // West Indian non-veg dishes
      'pork vindaloo', 'malvani prawn curry', 'laal maas', 'goan fish curry', 'bombil fry',
      'chicken xacuti', 'chicken cafreal', 'sorpotel', 'kolhapuri chicken', 'malvani fish curry',
      'mackerel recheado', 'mutton rassa', 'kombdi vade', 'saoji chicken', 'mutton kolhapuri',
      'chicken sukka', 'mutton sukka', 'goan prawn curry', 'fish rechad', 'chicken rassa',
      'mutton dhansak', 'salli boti', 'jardaloo salli boti', 'parsi cutlets', 'bohri raan',
      'bohri biryani', 'khubani ma gosht', 'kheema pav', 'teetar fry', 'safed maas',
      'jungli maas', 'khad khargosh', 'mathania meat curry', 'rajasthani chicken curry', 'mutton banjara',
      'chicken angara', 'bohri khichda', 'chicken farcha', 'patrani macchi', 'prawn koliwada',
      'bombay duck curry', 'mutton kala masala', 'chicken ghee roast', 'goan crab curry', 'chicken malvani',
      'mutton lonche', 'koli fish curry', 'vajri khudi', 'chicken sagoti', 'mutton vade',
      
      // Meat types
      'chicken', 'murgh', 'mutton', 'lamb', 'beef', 'pork', 'goat', 'keema', 'mince', 'meat',
      
      // Seafood
      'fish', 'machli', 'prawn', 'jhinga', 'shrimp', 'crab', 'kekda', 'lobster', 'squid', 
      'oyster', 'pomfret', 'surmai', 'hilsa', 'ilish', 'rohu', 'bombil', 'bombay duck', 
      'seafood', 'tuna', 'salmon', 'mackerel', 'bangda',
      
      // Other non-veg
      'egg', 'anda', 'omelette', 'bhurji'
    ];
    
    // Check each email's order items
    emails.forEach(email => {
      if (email.orderDetails && email.orderDetails.orderItems && Array.isArray(email.orderDetails.orderItems)) {
        email.orderDetails.orderItems.forEach(item => {
          // Remove quantity markers (e.g., "2 X") and convert to lowercase
          const itemText = item.replace(/^\d+\s*[Xx×]\s+/i, '').toLowerCase();
          
          // Track total items
          stats.total++;
          
          // Check if non-vegetarian
          if (nonVegKeywords.some(keyword => itemText.includes(keyword))) {
            stats.nonVeg++;
            return; // If it's non-veg, skip the remaining checks
          }
          
          // Check if vegetarian
          if (vegKeywords.some(keyword => itemText.includes(keyword)) &&
              !nonVegKeywords.some(keyword => itemText.includes(keyword))) {
            stats.veg++;
            return; // If it's veg, skip the remaining checks
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
    const categorizedTotal = stats.veg + stats.nonVeg;
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
      })
    ]).start();
  };
  
  const getPercentage = (value) => {
    const categorizedTotal = dietStats.veg + dietStats.nonVeg;
    if (categorizedTotal === 0) return '0%';
    return `${Math.round((value / categorizedTotal) * 100)}%`;
  };
  
  // Don't render if no data or all zeros
  const categorizedTotal = dietStats.veg + dietStats.nonVeg;
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
        </View>
        
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {dietStats.veg > dietStats.nonVeg ? 
              'You prefer vegetarian food!' : 
              dietStats.nonVeg > dietStats.veg ? 
                'You prefer non-vegetarian options!' : 
                'You have a balanced diet of veg and non-veg!'
            }
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
