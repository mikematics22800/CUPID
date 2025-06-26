import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { promptGemini } from '../../../lib/gemini';

const INTERESTS_CATEGORIES = {
  'Sports & Fitness': [
    'Running', 'Gym', 'Yoga', 'Swimming', 'Cycling', 'Hiking', 'Rock Climbing',
    'Tennis', 'Basketball', 'Soccer', 'Volleyball', 'Martial Arts', 'Dancing',
    'Pilates', 'CrossFit', 'Boxing', 'Golf', 'Skiing', 'Surfing'
  ],
  'Arts & Culture': [
    'Photography', 'Painting', 'Drawing', 'Music', 'Concerts', 'Museums',
    'Theater', 'Reading', 'Writing', 'Poetry', 'Film', 'Cooking', 'Baking',
    'Travel', 'Languages', 'History', 'Architecture', 'Fashion', 'Design'
  ],
  'Technology & Gaming': [
    'Programming', 'Gaming', 'VR/AR', 'AI/ML', 'Cryptocurrency', 'Blockchain',
    'Mobile Apps', 'Web Development', 'Data Science', 'Cybersecurity',
    'Robotics', '3D Printing', 'Drones', 'Smart Home', 'Tech Reviews'
  ],
  'Nature & Outdoors': [
    'Camping', 'Fishing', 'Gardening', 'Bird Watching', 'Stargazing',
    'Beach', 'Mountains', 'Forest', 'Wildlife', 'Conservation', 'Hiking',
    'Kayaking', 'Canoeing', 'Sailing', 'Scuba Diving', 'Rock Climbing'
  ],
  'Social & Lifestyle': [
    'Networking', 'Volunteering', 'Social Causes', 'Wine Tasting', 'Coffee',
    'Craft Beer', 'Foodie', 'Restaurants', 'Bars', 'Clubs', 'Parties',
    'Board Games', 'Puzzles', 'Meditation', 'Mindfulness', 'Self-Care'
  ]
};

export default function InterestsSection({ onBioGenerated, initialInterests = [], onInterestsChange }) {
  const [selectedInterests, setSelectedInterests] = useState(initialInterests);
  const [generating, setGenerating] = useState(false);

  // Only update selected interests when initialInterests prop changes and is different
  useEffect(() => {
    if (JSON.stringify(initialInterests) !== JSON.stringify(selectedInterests)) {
      setSelectedInterests(initialInterests);
    }
  }, [initialInterests]);

  const toggleInterest = (interest) => {
    const newSelectedInterests = selectedInterests.includes(interest)
      ? selectedInterests.filter(i => i !== interest)
      : [...selectedInterests, interest];
    
    // Prevent selecting more than 10 interests
    if (newSelectedInterests.length > 10) {
      Alert.alert('Maximum Interests Reached', 'You can only select up to 10 interests. Please remove one before adding another.');
      return;
    }
    
    setSelectedInterests(newSelectedInterests);
    
    // Call the callback to notify parent component of interest changes
    if (onInterestsChange) {
      onInterestsChange(newSelectedInterests);
    }
  };

  const generateBioSuggestion = async () => {
    if (selectedInterests.length < 5) {
      Alert.alert('Not Enough Interests', 'Please select at least 5 interests to generate a bio suggestion.');
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Generate a creative and engaging dating app bio of at least 50 words based on these interests and hobbies: ${selectedInterests.join(', ')}. Only return the bio text.`;

      const bioSuggestion = await promptGemini(prompt);
      
      if (bioSuggestion && bioSuggestion.trim()) {
        onBioGenerated(bioSuggestion.trim());
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>Choose between 5 and 10 interests which represent you best!</Text>
      </View>
      <ScrollView style={styles.interestsContainer} showsVerticalScrollIndicator={false}>
        {Object.entries(INTERESTS_CATEGORIES).map(([category, interests]) => (
          <View key={category} style={styles.category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.interestsGrid}>
              {interests.map((interest) => {
                const isSelected = selectedInterests.includes(interest);
                const isDisabled = !isSelected && selectedInterests.length >= 10;
                return (
                  <TouchableOpacity
                    key={interest}
                    style={[
                      styles.interestChip, 
                      isSelected && styles.interestChipSelected,
                      isDisabled && styles.interestChipDisabled
                    ]}
                    onPress={() => toggleInterest(interest)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.interestText, 
                      isSelected && styles.interestTextSelected,
                      isDisabled && styles.interestTextDisabled
                    ]}>
                      {interest}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="white" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          {selectedInterests.length}/10 interest{selectedInterests.length !== 1 ? 's' : ''} selected
        </Text>
        <TouchableOpacity
          style={[styles.generateButton, (generating || selectedInterests.length < 5) && styles.generateButtonDisabled]}
          onPress={generateBioSuggestion}
          disabled={generating || selectedInterests.length < 5}
        >
          <Ionicons 
            name={"sparkles"} 
            size={20} 
            color="white" 
            style={styles.generateIcon}
          />
          <Text style={styles.generateButtonText}>
            {generating ? 'Generating...' : 'Generate Bio Suggestion'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  interestsContainer: {
    maxHeight: 400,
  },
  category: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  interestChipSelected: {
    backgroundColor: 'hotpink',
    borderColor: 'hotpink',
  },
  interestChipDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  interestText: {
    fontSize: 14,
    color: '#333',
  },
  interestTextSelected: {
    color: 'white',
  },
  interestTextDisabled: {
    color: '#999',
  },
  checkIcon: {
    marginLeft: 5,
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  requirementText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '500',
  },
  limitText: {
    color: '#ff6b6b',
    fontSize: 12,
    fontWeight: '500',
  },
}); 