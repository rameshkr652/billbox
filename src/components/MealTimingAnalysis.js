// src/components/MealTimingAnalysis.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const { width } = Dimensions.get('window');
const BAR_WIDTH = width - 90; // Account for padding and margins

// Updated meal times with healthier, more specific ranges
const MEAL_TIMES = {
  BREAKFAST: { start: 7, end: 10, label: 'Breakfast', icon: 'wb-sunny', color: '#FF9800' },
  LUNCH: { start: 12, end: 14, label: 'Lunch', icon: 'brightness-5', color: '#2196F3' }, // 12:30-2:30pm (using 12-14 for hour ranges)
  DINNER: { start: 19, end: 21, label: 'Dinner', icon: 'brightness-3', color: '#673AB7' }, // 7:30-9:30pm (using 19-21 for hour ranges)
  OFF_HOURS: { label: 'Off Hours', icon: 'access-time', color: '#9E9E9E' } // All other times
};

const MealTimingAnalysis = ({ emails, platformColor }) => {
  const [timeStats, setTimeStats] = useState({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    offHours: 0,
    total: 0
  });
  
  const [barWidths] = useState({
    breakfast: new Animated.Value(0),
    lunch: new Animated.Value(0),
    dinner: new Animated.Value(0),
    offHours: new Animated.Value(0)
  });

  const [healthScore, setHealthScore] = useState({
    score: 0,
    message: '',
    color: ''
  });
  
  useEffect(() => {
    if (emails && emails.length > 0) {
      analyzeMealTimings();
    }
  }, [emails]);
  
  const analyzeMealTimings = () => {
    const stats = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      offHours: 0,
      total: 0
    };
    
    // More precise classification logic with 30-minute granularity
    const isInMealTime = (hour, minute, mealTime) => {
      if (!mealTime.start) return false;
      
      const timeInHours = hour + (minute / 60);
      const startHour = mealTime.start;
      const endHour = mealTime.end;
      
      // Special case for lunch and dinner which include 30-minute offsets
      if (mealTime === MEAL_TIMES.LUNCH) {
        return timeInHours >= 12.5 && timeInHours <= 14.5; // 12:30-2:30pm
      } else if (mealTime === MEAL_TIMES.DINNER) {
        return timeInHours >= 19.5 && timeInHours <= 21.5; // 7:30-9:30pm
      }
      
      // Default check for full hours
      return timeInHours >= startHour && timeInHours <= endHour;
    };
    
    // Analyze each email
    emails.forEach(email => {
      if (email.date) {
        const orderDate = new Date(email.date);
        const hour = orderDate.getHours();
        const minute = orderDate.getMinutes();
        
        // Increment total count
        stats.total++;
        
        // Categorize using the more specific ranges
        if (isInMealTime(hour, minute, MEAL_TIMES.BREAKFAST)) {
          stats.breakfast++;
        } else if (isInMealTime(hour, minute, MEAL_TIMES.LUNCH)) {
          stats.lunch++;
        } else if (isInMealTime(hour, minute, MEAL_TIMES.DINNER)) {
          stats.dinner++;
        } else {
          stats.offHours++;
        }
      }
    });
    
    // Calculate health score based on meal timings
    const healthScore = calculateHealthScore(stats);
    
    // Update state
    setTimeStats(stats);
    setHealthScore(healthScore);
    
    // Animate the bars
    animateBars(stats);
  };
  
  const calculateHealthScore = (stats) => {
    // No data, default score
    if (stats.total === 0) {
      return { score: 0, message: 'Not enough data', color: '#9E9E9E' };
    }
    
    // Calculate the percentage of orders at each meal time
    const breakfastPercent = stats.breakfast / stats.total;
    const lunchPercent = stats.lunch / stats.total;
    const dinnerPercent = stats.dinner / stats.total;
    const offHoursPercent = stats.offHours / stats.total;
    
    // Scoring weights - updated to reflect ideal meal times
    // Higher scores for orders during recommended meal times
    const baseScore = 
      (breakfastPercent * 100) +  // Breakfast at proper time is ideal
      (lunchPercent * 100) +      // Lunch at proper time is ideal
      (dinnerPercent * 85) +      // Dinner at proper time is good
      (offHoursPercent * 20);     // Off-hours eating is not recommended
    
    // Scale to 0-100
    const scaledScore = Math.round(baseScore);
    
    // Determine color and message based on score
    let color, message;
    
    if (scaledScore >= 85) {
      color = '#4CAF50'; // Green
      message = 'Excellent meal timing habits!';
    } else if (scaledScore >= 70) {
      color = '#8BC34A'; // Light Green
      message = 'Good meal timing patterns.';
    } else if (scaledScore >= 55) {
      color = '#FFC107'; // Amber
      message = 'Average meal timing habits.';
    } else if (scaledScore >= 40) {
      color = '#FF9800'; // Orange
      message = 'Could improve meal timing.';
    } else {
      color = '#F44336'; // Red
      message = 'Consider adjusting meal times.';
    }
    
    return { score: scaledScore, message, color };
  };
  
  const animateBars = (stats) => {
    if (stats.total === 0) return;
    
    Animated.parallel([
      Animated.timing(barWidths.breakfast, {
        toValue: (stats.breakfast / stats.total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.lunch, {
        toValue: (stats.lunch / stats.total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.dinner, {
        toValue: (stats.dinner / stats.total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      }),
      Animated.timing(barWidths.offHours, {
        toValue: (stats.offHours / stats.total) * BAR_WIDTH,
        duration: 800,
        useNativeDriver: false
      })
    ]).start();
  };
  
  const getPercentage = (value) => {
    if (timeStats.total === 0) return '0%';
    return `${Math.round((value / timeStats.total) * 100)}%`;
  };
  
  // Don't render if no data
  if (timeStats.total === 0) return null;
  
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Icon name="access-time" size={20} color={platformColor} style={styles.titleIcon} />
            <Text style={styles.title}>Your Meal Timing Patterns</Text>
          </View>
        </View>
        
        <View style={styles.statsContainer}>
          {/* Breakfast */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Icon name={MEAL_TIMES.BREAKFAST.icon} size={18} color={MEAL_TIMES.BREAKFAST.color} style={styles.mealIcon} />
              <Text style={styles.labelText}>{MEAL_TIMES.BREAKFAST.label}</Text>
              <Text style={styles.timeText}>(7-10am)</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.breakfast, backgroundColor: MEAL_TIMES.BREAKFAST.color }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{timeStats.breakfast}</Text>
              <Text style={styles.percentText}>({getPercentage(timeStats.breakfast)})</Text>
            </View>
          </View>
          
          {/* Lunch */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Icon name={MEAL_TIMES.LUNCH.icon} size={18} color={MEAL_TIMES.LUNCH.color} style={styles.mealIcon} />
              <Text style={styles.labelText}>{MEAL_TIMES.LUNCH.label}</Text>
              <Text style={styles.timeText}>(12:30-2:30pm)</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.lunch, backgroundColor: MEAL_TIMES.LUNCH.color }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{timeStats.lunch}</Text>
              <Text style={styles.percentText}>({getPercentage(timeStats.lunch)})</Text>
            </View>
          </View>
          
          {/* Dinner */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Icon name={MEAL_TIMES.DINNER.icon} size={18} color={MEAL_TIMES.DINNER.color} style={styles.mealIcon} />
              <Text style={styles.labelText}>{MEAL_TIMES.DINNER.label}</Text>
              <Text style={styles.timeText}>(7:30-9:30pm)</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.dinner, backgroundColor: MEAL_TIMES.DINNER.color }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{timeStats.dinner}</Text>
              <Text style={styles.percentText}>({getPercentage(timeStats.dinner)})</Text>
            </View>
          </View>
          
          {/* Off Hours */}
          <View style={styles.statRow}>
            <View style={styles.statLabel}>
              <Icon name={MEAL_TIMES.OFF_HOURS.icon} size={18} color={MEAL_TIMES.OFF_HOURS.color} style={styles.mealIcon} />
              <Text style={styles.labelText}>{MEAL_TIMES.OFF_HOURS.label}</Text>
              <Text style={styles.timeText}>(Other times)</Text>
            </View>
            <View style={styles.barContainer}>
              <Animated.View 
                style={[
                  styles.bar, 
                  { width: barWidths.offHours, backgroundColor: MEAL_TIMES.OFF_HOURS.color }
                ]} 
              />
            </View>
            <View style={styles.statValue}>
              <Text style={styles.valueText}>{timeStats.offHours}</Text>
              <Text style={styles.percentText}>({getPercentage(timeStats.offHours)})</Text>
            </View>
          </View>
        </View>
        
        {/* Health Score */}
        <View style={styles.healthScoreContainer}>
          <View style={styles.scoreHeader}>
            <Text style={styles.scoreTitle}>Meal Timing Health Score</Text>
            <View style={[styles.scoreCircle, { backgroundColor: healthScore.color }]}>
              <Text style={styles.scoreText}>{healthScore.score}</Text>
            </View>
          </View>
          
          <View style={[styles.scoreMessage, { borderLeftColor: healthScore.color }]}>
            <Text style={styles.messageText}>{healthScore.message}</Text>
            <Text style={styles.tipText}>
              {timeStats.offHours > (timeStats.breakfast + timeStats.lunch) ? 
                "Try to align your meals with recommended meal times for better health." :
                timeStats.breakfast === 0 && timeStats.lunch === 0 ?
                "Consider adding breakfast and lunch to your routine rather than eating only in the evening." :
                timeStats.breakfast === 0 && timeStats.lunch > 0 ?
                "Adding breakfast to your routine would improve your meal timing score." :
                "Your meal timing patterns align well with recommended eating schedules."}
            </Text>
          </View>
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
    width: 100,
    flexDirection: 'column',
  },
  mealIcon: {
    marginBottom: 2,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  timeText: {
    fontSize: 11,
    color: '#999',
  },
  barContainer: {
    flex: 1,
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginLeft: 10,
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
  healthScoreContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  scoreMessage: {
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginLeft: 5,
  },
  messageText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  }
});

export default MealTimingAnalysis;