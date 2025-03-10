// src/components/LoadingIndicator.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import Colors from '../constants/colors';

const LoadingIndicator = ({ message = 'Loading...', size = 'large', color = Colors.primary }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  message: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.darkGray,
  },
});

export default LoadingIndicator;