import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { searchVenues, getVenueDetails } from '../../../lib/google';

export default function VenueInput({
  value,
  onChangeText,
  onVenueSelected,
  placeholder = "Search for a venue...",
  style,
  label = "Venue"
}) {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchTimeoutRef = useRef(null);

  const venueCategories = [
    { key: 'all', label: 'All Venues', icon: 'business' },
    { key: 'restaurant', label: 'Restaurants', icon: 'restaurant' },
    { key: 'park', label: 'Parks', icon: 'leaf' },
    { key: 'movie_theater', label: 'Movie Theaters', icon: 'film' },
    { key: 'museum', label: 'Museums', icon: 'school' },
    { key: 'bar', label: 'Bars & Clubs', icon: 'wine' },
    { key: 'cafe', label: 'Cafes', icon: 'cafe' },
    { key: 'shopping', label: 'Shopping', icon: 'bag' },
    { key: 'entertainment', label: 'Entertainment', icon: 'game-controller' },
  ];

  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  const performVenueSearch = async (query, category = selectedCategory) => {
    if (!query.trim() || query.length < 1) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      setLoading(true);
      
      const venuePredictions = await searchVenues(query, category === 'all' ? ['establishment'] : [category]);
      
      setPredictions(venuePredictions);
      setShowPredictions(venuePredictions.length > 0);
    } catch (error) {
      console.error('Error searching venues:', error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (text) => {
    setSearchQuery(text);
    onChangeText?.(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      performVenueSearch(text);
    }, 300);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (searchQuery.trim()) {
      performVenueSearch(searchQuery, category);
    }
  };

  const handleVenueSelect = async (venue) => {
    try {
      // Get venue details for more accurate information
      const venueDetails = await getVenueDetails(venue.id);
      
      if (venueDetails) {
        const venueName = venueDetails.name || venue.mainText;
        const venueAddress = venueDetails.formattedAddress || venue.description;
        
        setSearchQuery(venueName);
        onChangeText?.(venueName);
        onVenueSelected?.({
          ...venue,
          name: venueName,
          address: venueAddress,
          location: venueDetails.location,
          rating: venueDetails.rating,
          types: venueDetails.types
        });
      } else {
        // Fallback to original venue data
        setSearchQuery(venue.description);
        onChangeText?.(venue.description);
        onVenueSelected?.(venue);
      }
    } catch (error) {
      console.error('Error getting venue details:', error);
      // Fallback to original venue data
      setSearchQuery(venue.description);
      onChangeText?.(venue.description);
      onVenueSelected?.(venue);
    }
    
    setShowPredictions(false);
    setPredictions([]);
  };

  const handleClear = () => {
    setSearchQuery('');
    onChangeText?.('');
    setShowPredictions(false);
    setPredictions([]);
  };

  const getVenueIcon = (types) => {
    if (!types || types.length === 0) return 'business';
    
    if (types.includes('restaurant') || types.includes('food')) return 'restaurant';
    if (types.includes('park') || types.includes('natural_feature')) return 'leaf';
    if (types.includes('movie_theater')) return 'film';
    if (types.includes('museum') || types.includes('art_gallery')) return 'school';
    if (types.includes('bar') || types.includes('night_club')) return 'wine';
    if (types.includes('cafe')) return 'cafe';
    if (types.includes('shopping_mall') || types.includes('store')) return 'bag';
    if (types.includes('amusement_park') || types.includes('aquarium') || types.includes('zoo')) return 'game-controller';
    
    return 'business';
  };

  return (
    <View style={[styles.venueInputContainer, style]}>
      {/* Category Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {venueCategories.map((category) => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              selectedCategory === category.key && styles.categoryButtonActive
            ]}
            onPress={() => handleCategoryChange(category.key)}
          >
            <Ionicons 
              name={category.icon} 
              size={16} 
              color={selectedCategory === category.key ? 'white' : '#666'} 
            />
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.key && styles.categoryButtonTextActive
            ]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Venue Search Input */}
      <TextInput
        mode="outlined"
        label={label}
        style={styles.venueInput}
        value={searchQuery}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        left={
          <TextInput.Icon 
            icon="map-marker" 
          />
        }
        right={
          searchQuery.length > 0 && !loading ? (
            <TextInput.Icon 
              icon="close" 
              onPress={handleClear}
            />
          ) : loading ? (
            <ActivityIndicator 
              size="small" 
              color="hotpink" 
            />
          ) : null
        }
        onFocus={() => {
          if (predictions.length > 0) {
            setShowPredictions(true);
          }
        }}
        onBlur={() => {
          // Delay hiding predictions to allow for selection
          setTimeout(() => setShowPredictions(false), 200);
        }}
        numberOfLines={1}
        ellipsizeMode="tail"
      />
      
      {/* Venue Predictions */}
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          {predictions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.predictionItem}
              onPress={() => handleVenueSelect(item)}
            >
              <Ionicons 
                name={getVenueIcon(item.types)} 
                size={16} 
                color="#666" 
                style={styles.venueIcon} 
              />
              <View style={styles.venueInfo}>
                <Text style={styles.venueMainText}>{item.mainText}</Text>
                <Text style={styles.venueSecondaryText}>{item.secondaryText}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  venueInputContainer: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  categoryContainer: {
    marginBottom: 12,
  },
  categoryContent: {
    paddingHorizontal: 4,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButtonActive: {
    backgroundColor: 'hotpink',
    borderColor: 'hotpink',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  venueInput: {
    width: '100%',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
    zIndex: 1000,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  venueIcon: {
    marginRight: 10,
  },
  venueInfo: {
    flex: 1,
  },
  venueMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  venueSecondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
