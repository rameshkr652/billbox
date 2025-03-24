// src/components/OrderTimeMachineButton.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Colors from '../constants/colors';

const OrderTimeMachineButton = ({ platformColor, emailCount }) => {
  const navigation = useNavigation();
  
  // Animation values
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  
  // Button press animation
  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  // Navigate to the Time Machine screen
  const navigateToTimeMachine = () => {
    animatePress();
    navigation.navigate('OrderTimeline', { platformColor });
  };
  
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.buttonContainer,
          { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: platformColor }]}
          onPress={navigateToTimeMachine}
          activeOpacity={0.8}
        >
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Icon name="history" size={24} color="#fff" />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>Order Time Machine</Text>
              <Text style={styles.subtitle}>
                Explore your food journey across{' '}
                <Text style={styles.highlight}>{emailCount || 0}</Text> orders
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 15,
    marginVertical: 10,
    marginBottom: 10
  },
  buttonContainer: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    borderRadius: 12,
    padding: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  highlight: {
    fontWeight: 'bold',
  }
});

export default OrderTimeMachineButton;