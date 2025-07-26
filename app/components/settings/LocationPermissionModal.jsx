import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getCurrentLocationAndresidence } from '../../../lib/supabase';

export default function LocationPermissionModal({ 
  visible, 
  onClose, 
  onLocationEnabled,
  onLocationDisabled 
}) {
  const [loading, setLoading] = useState(false);

  const handleEnableLocation = async () => {
    try {
      setLoading(true);
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Get current location and geocode it
        const location = await getCurrentLocationAndresidence();
        
        if (location) {
          console.log('✅ Location permission granted and location obtained');
          onLocationEnabled(location);
        } else {
          Alert.alert(
            'Location Error',
            'We couldn\'t determine your current location. You can still use the app with your residence setting.',
            [{ text: 'OK', onPress: onLocationDisabled }]
          );
        }
      } else {
        console.log('❌ Location permission denied');
        Alert.alert(
          'Location Permission Denied',
          'You can still use the app with your residence setting. You can enable location sharing later in settings.',
          [{ text: 'OK', onPress: onLocationDisabled }]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      Alert.alert(
        'Location Error',
        'There was an error accessing your location. You can still use the app with your residence setting.',
        [{ text: 'OK', onPress: onLocationDisabled }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkipLocation = (neverAskAgain = false) => {
    console.log('📍 User chose to skip location sharing', neverAskAgain ? '(never ask again)' : '');
    onLocationDisabled(neverAskAgain);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={60} color="hotpink" />
          </View>
          
          <Text style={styles.title}>Share your location?</Text>
          
          <Text style={styles.subDescription}>
            This will allow CUPID to use your exact location for distance filtering. Otherwise, your residence will be used. You can toggle this anytime in your settings.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEnableLocation}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark" size={20} color="white" />
              )}
              <Text style={styles.primaryButtonText}>
                {loading ? 'Getting Location...' : 'Enable Location'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => handleSkipLocation(false)}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={() => handleSkipLocation(true)}
            >
              <Text style={styles.tertiaryButtonText}>Do not ask again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  subDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  tertiaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tertiaryButtonText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
}); 