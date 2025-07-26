import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function LocationSection({ geoCoords, setGeoCoords }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  useEffect(() => {
    if (geoCoords && geoCoords.length === 2) {
      setLatitude(geoCoords[0].toString());
      setLongitude(geoCoords[1].toString());
    }
  }, [geoCoords]);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newCoords = [location.coords.latitude, location.coords.longitude];
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
      setGeoCoords(newCoords);
      setShowModal(false);
      
      Alert.alert('Success', 'Your current location has been set!');
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please enter coordinates manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const saveManualLocation = () => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Invalid Coordinates', 'Please enter valid latitude and longitude values.');
      return;
    }
    
    if (lat < -90 || lat > 90) {
      Alert.alert('Invalid Latitude', 'Latitude must be between -90 and 90.');
      return;
    }
    
    if (lng < -180 || lng > 180) {
      Alert.alert('Invalid Longitude', 'Longitude must be between -180 and 180.');
      return;
    }
    
    setGeoCoords([lat, lng]);
    setShowModal(false);
    Alert.alert('Success', 'Location coordinates saved!');
  };

  const getLocationDisplayText = () => {
    if (geoCoords && geoCoords.length === 2) {
      return `${geoCoords[0].toFixed(4)}, ${geoCoords[1].toFixed(4)}`;
    }
    return 'Select your location';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Location</Text>
      <Text style={styles.sectionDescription}>
        Help others find you by setting your location
      </Text>

      <TouchableOpacity style={styles.locationButton} onPress={() => setShowModal(true)}>
        <View style={styles.locationContent}>
          <Ionicons name="location" size={20} color="hotpink" />
          <Text style={styles.locationText}>{getLocationDisplayText()}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Your Location</Text>
            <TouchableOpacity
              style={styles.currentLocationButton}
              onPress={getCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="hotpink" />
              ) : (
                <Ionicons name="locate" size={20} color="hotpink" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.instructionText}>
              Use current location or enter coordinates manually
            </Text>
            
            <View style={styles.coordinateInputs}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Latitude</Text>
                <TextInput
                  style={styles.input}
                  value={latitude}
                  onChangeText={setLatitude}
                  placeholder="e.g., 40.7128"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Longitude</Text>
                <TextInput
                  style={styles.input}
                  value={longitude}
                  onChangeText={setLongitude}
                  placeholder="e.g., -74.0060"
                  keyboardType="numeric"
                />
              </View>
            </View>
            
            <Text style={styles.helpText}>
              Latitude: -90 to 90{'\n'}
              Longitude: -180 to 180
            </Text>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={saveManualLocation}
            >
              <Text style={styles.confirmButtonText}>Save Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  currentLocationButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  instructionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  coordinateInputs: {
    gap: 16,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  confirmButton: {
    backgroundColor: 'hotpink',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 
 