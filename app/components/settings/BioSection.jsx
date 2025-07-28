import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { promptGemini } from '../../../lib/gemini';
import InterestsSection from './InterestsSection';

export default function BioSection({
  bio,
  setBio,
  interests = [],
  setInterests
}) {
  const [generating, setGenerating] = useState(false);

  const handleBioGenerated = (suggestion) => {
    setBio(suggestion);
  };

  const handleInterestsChange = (newInterests) => {
    if (setInterests) { 
      setInterests(newInterests);
    }
  };

  const generateBioSuggestion = async () => {
    if (interests.length < 5) {
      Alert.alert('Not Enough Interests', 'Please select at least 5 interests to generate a bio suggestion.');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Generate a creative and engaging dating app bio of at least 50 words based on these interests and hobbies: ${interests.join(', ')}. Only return the bio text.`;

      const bioSuggestion = await promptGemini(prompt);
      
      if (bioSuggestion && bioSuggestion.trim()) {
        setBio(bioSuggestion.trim());
        Alert.alert('Bio Generated!', 'Your bio suggestion has been added to the text field.');
      } else {
        Alert.alert('Error', 'Failed to generate bio suggestion. Please try again.');
      }
    } catch (error) {
      console.error('Error generating bio:', error);
      Alert.alert('Error', 'Failed to generate bio suggestion. Please check your internet connection and try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.bioSection}>
      <InterestsSection 
        initialInterests={interests}
        onInterestsChange={handleInterestsChange}
      />
      <TextInput
        style={styles.bioInput}
        placeholder="Share your interests, hobbies, what you're looking for, and anything else that makes you unique..."
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />
      <TouchableOpacity
        style={[styles.generateButton, (generating || interests.length < 5) && styles.generateButtonDisabled]}
        onPress={generateBioSuggestion}
        disabled={generating || interests.length < 5}
      >
        <Ionicons 
          name={"sparkles"} 
          size={20} 
          color="white" 
          style={styles.generateIcon}
        />
        <Text style={styles.generateButtonText}>
          {generating ? 'Generating...' : 'Generate Bio'}
        </Text>
      </TouchableOpacity>
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
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  generateIcon: {
    marginRight: 0,
  },
}); 