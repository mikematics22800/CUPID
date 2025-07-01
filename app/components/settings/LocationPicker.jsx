import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { geocodeCoordinates, reverseGeocodeAddress, validateGoogleMapsKey } from '../../../lib/google_maps';

export default function LocationPicker({ 
  onLocationSelected, 
  visible = false,
  onClose 
}) {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      validateGoogleMapsKey();
    }
  }, [visible]);

  const handleUseCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use your current location.');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinates = [location.coords.latitude, location.coords.longitude];
      console.log('Current location:', coordinates);

      // Geocode the coordinates
      const geocodedData = await geocodeCoordinates(coordinates[0], coordinates[1]);
      
      if (geocodedData) {
        const locationData = {
          coordinates: coordinates,
          residence: geocodedData.locationString,
          state: geocodedData.state,
          locationString: geocodedData.locationString,
          fullAddress: geocodedData.fullAddress
        };
        
        onLocationSelected(locationData);
        onClose();
      } else {
        Alert.alert('Error', 'Could not determine your current location. Please try searching for a location instead.');
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your current location. Please try searching for a location instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search for.');
      return;
    }

    try {
      setSearching(true);
      
      // Use reverse geocoding to search for locations
      const result = await reverseGeocodeAddress(searchQuery);
      
      if (result) {
        // Geocode the found coordinates to get the formatted address
        const geocodedData = await geocodeCoordinates(result.latitude, result.longitude);
        
        if (geocodedData) {
          const locationData = {
            coordinates: result.coordinates,
            residence: geocodedData.locationString,
            state: geocodedData.state,
            locationString: geocodedData.locationString,
            fullAddress: geocodedData.fullAddress
          };
          
          onLocationSelected(locationData);
          onClose();
        } else {
          Alert.alert('Error', 'Could not process the selected location. Please try a different search term.');
        }
      } else {
        Alert.alert('Error', 'Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search for location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleCancel = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Location</Text>
          <View style={{ width: 60 }} />
        </View>
        

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search for a Location</Text>
            <Text style={styles.sectionSubtitle}>
              Enter a city, address, or landmark
            </Text>
            
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="e.g., Boca Raton, Florida"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchLocation}
                returnKeyType="search"
              />
              <TouchableOpacity 
                onPress={handleSearchLocation}
                style={[styles.searchButton, searching && styles.buttonDisabled]}
                disabled={searching || !searchQuery.trim()}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="search" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity 
              onPress={handleUseCurrentLocation}
              style={[styles.currentLocationButton, loading && styles.buttonDisabled]}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="hotpink" />
              ) : (
                <Ionicons name="locate" size={24} color="hotpink" />
              )}
              <Text style={styles.currentLocationText}>
                {loading ? 'Getting location...' : 'Use My Current Location'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    padding: 5,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'hotpink',
    gap: 12,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    width: 50,
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  examples: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
}); 