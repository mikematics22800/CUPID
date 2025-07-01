import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LikeCounter({ currentIndex, totalLikes }) {
  return (
    <View style={styles.likeCounter}>
      <Text style={styles.likeCounterText}>
        {currentIndex + 1} of {totalLikes} likes
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  likeCounter: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  likeCounterText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
}); 