import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { searchCities, getPlaceDetails } from '../../../lib/google';

export default function ResidenceInput({
  value,
  onChangeText,
  onResidenceSelected,
  placeholder = "Search for a residence...",
  style,
  validationStatus,
  label = "Residence"
}) {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    setSearchQuery(value || '');
  }, [value]);

  const performResidenceSearch = async (query) => {
    if (!query.trim() || query.length < 1) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    try {
      setLoading(true);
      
      const residencePredictions = await searchCities(query);
      
      setPredictions(residencePredictions);
      setShowPredictions(residencePredictions.length > 0);
    } catch (error) {
      console.error('Error searching cities:', error);
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
      performResidenceSearch(text);
    }, 300);
  };

  const handleResidenceSelect = async (residence) => {
    try {
      // Get place details for more accurate residence information
      const placeDetails = await getPlaceDetails(residence.id);
      
      if (placeDetails) {
        const residenceName = placeDetails.name || residence.mainText;
        const residenceDescription = placeDetails.formattedAddress || residence.description;
        
        setSearchQuery(residenceDescription);
        onChangeText?.(residenceDescription);
        onResidenceSelected?.({
          ...residence,
          name: residenceName,
          formattedAddress: residenceDescription
        });
      } else {
        // Fallback to original residence data
        setSearchQuery(residence.description);
        onChangeText?.(residence.description);
        onResidenceSelected?.(residence);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to original residence data
      setSearchQuery(residence.description);
      onChangeText?.(residence.description);
      onResidenceSelected?.(residence);
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

  return (
    <View style={[styles.residenceInputContainer, style]}>
      <TextInput
        mode="outlined"
        label={label}
        style={styles.residenceInput}
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
      
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          {predictions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.predictionItem}
              onPress={() => handleResidenceSelect(item)}
            >
              <Ionicons name="location" size={16} color="#666" style={styles.residenceIcon} />
              <View style={styles.residenceInfo}>
                <Text style={styles.residenceMainText}>{item.mainText}</Text>
                <Text style={styles.residenceSecondaryText}>{item.secondaryText}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  residenceInputContainer: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  residenceInput: {
    width: '100%',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 55,
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
  residenceIcon: {
    marginRight: 10,
  },
  residenceInfo: {
    flex: 1,
  },
  residenceMainText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  residenceSecondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
}); 