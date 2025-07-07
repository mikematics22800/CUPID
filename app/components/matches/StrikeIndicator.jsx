import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function StrikeIndicator({ strikes }) {
  return (
    <View style={styles.strikeIndicator}>
      <Ionicons name="warning" size={16} color="#FF6B35" />
      <Text style={styles.strikeText}>
        {strikes}/3 strikes - {3 - strikes} remaining before ban
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strikeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  strikeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
}); 