import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmptyState({ onStartSwiping }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No matches yet</Text>
      <Text style={styles.emptySubtext}>Keep swiping to find your perfect match!</Text>
      <TouchableOpacity style={styles.swipeButton} onPress={onStartSwiping}>
        <Text style={styles.swipeButtonText}>Start Swiping</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  swipeButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 