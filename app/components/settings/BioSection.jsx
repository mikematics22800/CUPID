import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useState } from 'react';
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

  const handleInterestsChange = (newInterests) => {
    if (setInterests) { 
      setInterests(newInterests);
    }
  };

  const generateBioSuggestion = async () => {
    if (interests.length < 10) {
      Alert.alert('Not Enough Interests', 'Please select at least 10 interests to generate a bio suggestion.');
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
      <View style={styles.bioInputContainer}>
        <TextInput
          style={styles.bioInput}
          placeholder="Share your interests, hobbies, what you're looking for, and anything else that makes you unique..."
          value={bio}
          onChangeText={(text) => {
            if (text.length <= 1000) {
              setBio(text);
            }
          }}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          selectionColor="hotpink"
          placeholderTextColor="#999"
          maxLength={1000}
          showsVerticalScrollIndicator
        />
        <View style={styles.characterCounterContainer}>
          <Text style={[
            styles.characterCount,
            bio.length > 900 && styles.characterCountWarning,
            bio.length >= 1000 && styles.characterCountLimit
          ]}>
            {bio.length}/1000 characters
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.generateButton, (generating || interests.length < 10) && styles.generateButtonDisabled]}
        onPress={generateBioSuggestion}
        disabled={generating || interests.length < 10}
      >
        <Ionicons 
          name="sparkles" 
          size={20} 
          color="white" 
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
    flexDirection: 'column',
    gap: 15,
  },

  bioInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    paddingHorizontal: 20,
  },
  bioInput: {
    padding: 20,
    height: 300,
  },
  characterCount: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  characterCountWarning: {
    color: '#FF9800',
  },
  characterCountLimit: {
    color: '#F44336',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
    paddingVertical: 10,
    borderRadius: 18,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  characterCounterContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
}); 