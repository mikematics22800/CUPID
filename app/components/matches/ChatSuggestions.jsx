import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';

// Function to get user-friendly category display names
const getCategoryDisplayName = (category) => {
  const displayNames = {
    'icebreaker': 'Ice Breaker',
    'casual': 'Casual Chat',
    'date-idea': 'Date Ideas',
    'question': 'Questions',
    'activity': 'Activities',
    'opener': 'Openers',
    'response': 'Responses'
  };
  return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
};

export default function ChatSuggestions({ 
  showSuggestions,
  suggestions,
  suggestionCategories,
  selectedCategory,
  generatingSuggestions,
  onCategoryPress,
  onSuggestionSelect
}) {
  if (!showSuggestions) return null;

  return (
    <View style={styles.suggestionsContainer}>
      {/* Suggestion Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScrollView}
        contentContainerStyle={styles.categoryContainer}
      >
        {suggestionCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive
            ]}
            onPress={() => onCategoryPress(category)}
            disabled={generatingSuggestions}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.categoryTextActive
            ]}>
              {getCategoryDisplayName(category)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Suggestions */}
      {generatingSuggestions ? (
        <View style={styles.suggestionsLoading}>
          <ActivityIndicator size="small" color="hotpink" />
          <Text style={styles.suggestionsLoadingText}>Generating suggestions...</Text>
        </View>
      ) : suggestions.length > 0 ? (
        <View style={styles.suggestionsList}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionButton}
              onPress={() => onSuggestionSelect(suggestion)}
            >
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.suggestionsEmpty}>
          <Text style={styles.suggestionsEmptyText}>
            Tap a category above to get AI suggestions!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  suggestionsContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
  },
  categoryScrollView: {
    maxHeight: 50,
  },
  categoryContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  categoryButtonActive: {
    borderColor: 'hotpink',
    backgroundColor: '#ffe6f0',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: 'hotpink',
  },
  suggestionsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  suggestionsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  suggestionsList: {
    paddingHorizontal: 15,
    paddingTop: 10,
    gap: 8,
  },
  suggestionButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  suggestionsEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  suggestionsEmptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 