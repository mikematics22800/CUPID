import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';

export default function SwipeIndicators({ leftOpacity, rightOpacity }) {
  return (
    <>
      <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { opacity: leftOpacity }]}>
        <Ionicons name="close-circle" size={60} color="#ff0000" />
        <Text style={[styles.indicatorText, { color: '#ff0000' }]}>PASS</Text>
      </Animated.View>

      <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { opacity: rightOpacity }]}>
        <Ionicons name="heart" size={60} color="hotpink" />
        <Text style={[styles.indicatorText, { color: 'hotpink' }]}>LIKE BACK</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  swipeIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  leftIndicator: {
    left: 20,
  },
  rightIndicator: {
    right: 20,
  },
  indicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
}); 