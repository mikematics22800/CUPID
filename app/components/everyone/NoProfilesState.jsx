import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NoProfilesState({ onRefresh }) {
  return (
    <View style={styles.noProfilesContainer}>
      <Ionicons name="heart-outline" size={80} color="#ccc" />
      <Text style={styles.noProfilesTitle}>No more profiles to show</Text>
      <Text style={styles.noProfilesText}>Check back later for new people!</Text>
      <TouchableOpacity   
        style={styles.button}
        onPress={onRefresh}
      >
        <Text style={styles.buttonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  noProfilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProfilesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noProfilesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
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