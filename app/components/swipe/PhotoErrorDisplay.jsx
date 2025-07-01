import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PhotoErrorDisplay({ photoLoadingError }) {
  if (!photoLoadingError) return null;

  return (
    <View style={styles.photoErrorContainer}>
      <Ionicons name="warning" size={16} color="#FF6B35" />
      <Text style={styles.photoErrorText}>Some photos may not display properly</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  photoErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  photoErrorText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 5,
  },
}); 