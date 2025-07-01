import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TimerDisplay({ timeLeft, canSwipe }) {
  if (canSwipe) return null;

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerText}>Next swipe in {timeLeft}s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: {
    alignItems: 'center',
    backgroundColor: 'pink',
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
  },
  timerText: {
    fontSize: 16,
    color: 'red',
  },
}); 