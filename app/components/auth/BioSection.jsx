import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import InterestsSection from './InterestsSection';

export default function BioSection({
  bio,
  setBio,
  interests = [],
  setInterests
}) {

  const handleBioGenerated = (suggestion) => {
    setBio(suggestion);
  };

  const handleInterestsChange = (newInterests) => {
    if (setInterests) { 
      setInterests(newInterests);
    }
  };

  return (
    <View style={styles.bioSection}>
      <InterestsSection 
        onBioGenerated={handleBioGenerated} 
        initialInterests={interests}
        onInterestsChange={handleInterestsChange}
      />
      <TextInput
        mode="outlined"
        label="Bio"
        style={styles.bioInput}
        placeholder="Share your interests, hobbies, what you're looking for, and anything else that makes you unique..."
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bioSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  interestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
  },
  interestsButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bioInput: {
    width: '100%',
  },
}); 