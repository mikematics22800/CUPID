import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InsufficientPhotosState({ onCompleteProfile }) {
  return (
    <View style={styles.insufficientPhotosContainer}>
      <Ionicons name="camera-outline" size={80} color="#ccc" />
      <Text style={styles.insufficientPhotosTitle}>Please complete your profile before continuing.</Text>
      <TouchableOpacity   
        style={styles.button}
        onPress={onCompleteProfile}
      >
        <Text style={styles.buttonText}>Complete Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  insufficientPhotosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insufficientPhotosTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'hotpink',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
}); 