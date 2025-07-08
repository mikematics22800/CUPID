import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, deleteUserAccount } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import LottieView from 'lottie-react-native';
import { useProfile } from '../contexts/ProfileContext';
import PhotoSection from '../components/auth/PhotoSection';
import BioSection from '../components/auth/BioSection';
import PersonalInfoForm from '../components/settings/PersonalInfoForm';
import { uploadPhotosToStorage } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  
  // Filter settings
  const [ageRange, setAgeRange] = useState({ min: 18, max: 50 });
  const [preferredSex, setPreferredSex] = useState('all');
  const [maxDistance, setMaxDistance] = useState(50);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showSexModal, setShowSexModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [tempAgeRange, setTempAgeRange] = useState({ min: 18, max: 50 });
  const [tempPreferredSex, setTempPreferredSex] = useState('all');
  const [tempMaxDistance, setTempMaxDistance] = useState(50);

  // Profile editing state
  const [showProfile, setShowProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [validationStatus, setValidationStatus] = useState({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    residence: true
  });

  // Profile context
  const { 
    user, 
    profile, 
    loading, 
    photos, 
    bio, 
    interests, 
    residence,
    geolocation,
    name,
    email,
    phone,
    setBio, 
    setInterests, 
    setPhotos,
    setResidence,
    setGeolocation,
    setName,
    setEmail,
    setPhone,
    updateProfile,
    updatePhotos,
    removePhoto,
    hasEnoughPhotos,
    hasBio,
    hasName,
    hasCompletedProfile,
    refreshProfile,
    isLocationSharingEnabled
  } = useProfile();

  // Load user preferences from AsyncStorage
  useEffect(() => {
    loadUserPreferences();
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;
    
    try {
      const [storedMaxDistance, storedAgeRange, storedPreferredSex] = await Promise.all([
        AsyncStorage.getItem(`maxDistance_${user.id}`),
        AsyncStorage.getItem(`ageRange_${user.id}`),
        AsyncStorage.getItem(`preferredSex_${user.id}`)
      ]);

      if (storedMaxDistance) {
        setMaxDistance(parseInt(storedMaxDistance));
        setTempMaxDistance(parseInt(storedMaxDistance));
      }

      if (storedAgeRange) {
        const parsedAgeRange = JSON.parse(storedAgeRange);
        setAgeRange(parsedAgeRange);
        setTempAgeRange(parsedAgeRange);
      }

      if (storedPreferredSex) {
        setPreferredSex(storedPreferredSex);
        setTempPreferredSex(storedPreferredSex);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const saveUserPreference = async (key, value) => {
    if (!user) return;
    
    try {
      const storageKey = `${key}_${user.id}`;
      const storageValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
      await AsyncStorage.setItem(storageKey, storageValue);
      console.log(`✅ Saved preference ${key}: ${storageValue}`);
    } catch (error) {
      console.error(`❌ Error saving preference ${key}:`, error);
    }
  };

  // Initialize first and last name from the name field
  useEffect(() => {
    if (name) {
      const nameParts = name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    }
  }, [name]);

  // Validation logic
  useEffect(() => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanedPhone = phone?.replace(/\D/g, '') || '';
    
    setValidationStatus({
      firstName: firstName?.trim().length > 0,
      lastName: lastName?.trim().length > 0,
      email: email?.match(emailRegex) !== null,
      phone: cleanedPhone.length >= 10 || cleanedPhone.length === 0,
      residence: residence?.trim().length > 0
    });
  }, [firstName, lastName, email, phone, residence]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including:\n\n• Your profile and photos\n• All your matches and conversations\n• Your likes and preferences\n\nThis action is irreversible.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your final warning. Deleting your account will:\n\n• Permanently remove all your data\n• End all your matches and conversations\n• Cannot be undone\n\nAre you absolutely sure you want to proceed?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteUserAccount();
                      Alert.alert(
                        'Account Deleted',
                        'Your account data has been successfully removed from CUPID. You have been signed out. For complete account deletion from our systems, please contact support.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              // Navigate to auth screen
                              router.replace('/auth');
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Account deletion error:', error);
                      Alert.alert(
                        'Deletion Error',
                        'There was an error deleting your account. Please try again or contact support.',
                        [
                          {
                            text: 'OK'
                          }
                        ]
                      );
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleAgeRangePress = () => {
    setTempAgeRange(ageRange);
    setShowAgeModal(true);
  };

  const handleSexPreferencePress = () => {
    setTempPreferredSex(preferredSex);
    setShowSexModal(true);
  };

  const handleDistancePress = () => {
    setTempMaxDistance(maxDistance);
    setShowDistanceModal(true);
  };

  const saveAgeRange = () => {
    // Validate age range
    if (tempAgeRange.min > tempAgeRange.max) {
      Alert.alert('Invalid Age Range', 'Minimum age cannot be greater than maximum age');
      return;
    }
    if (tempAgeRange.min < 18 || tempAgeRange.max > 100) {
      Alert.alert('Invalid Age Range', 'Age must be between 18 and 100');
      return;
    }
    setAgeRange(tempAgeRange);
    saveUserPreference('ageRange', tempAgeRange);
    setShowAgeModal(false);
  };

  const saveSexPreference = () => {
    setPreferredSex(tempPreferredSex);
    saveUserPreference('preferredSex', tempPreferredSex);
    setShowSexModal(false);
  };

  const saveDistance = () => {
    setMaxDistance(tempMaxDistance);
    saveUserPreference('maxDistance', tempMaxDistance);
    setShowDistanceModal(false);
  };

  // Location sharing functions
  const handleLocationSharingToggle = async () => {
    const currentlyEnabled = isLocationSharingEnabled();
    
    if (currentlyEnabled) {
      // Disable location sharing
      Alert.alert(
        'Disable Location Sharing',
        'This will stop sharing your location with other users. You can still use the app with your residence setting.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              try {
                await updateProfile({ geolocation: null });
                Alert.alert('Location Sharing Disabled', 'Your location is no longer being shared.');
              } catch (error) {
                console.error('Error disabling location sharing:', error);
                Alert.alert('Error', 'Failed to disable location sharing. Please try again.');
              }
            }
          }
        ]
      );
    } else {
      // Enable location sharing
      try {
        const { getCurrentLocationAndresidence } = await import('../../lib/supabase');
        const location = await getCurrentLocationAndresidence();
        
        if (location) {
          await updateProfile({ geolocation: location.geolocation });
          Alert.alert('Location Sharing Enabled', 'Your location is now being shared to help you find better matches nearby!');
        } else {
          Alert.alert(
            'Location Error',
            'We couldn\'t determine your current location. Please check your location settings and try again.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error enabling location sharing:', error);
        Alert.alert('Error', 'Failed to enable location sharing. Please try again.');
      }
    }
  };

  // Profile-related functions
  const handlePhotoRemove = async (photo) => {
    try {
      const success = await removePhoto(photo);
      if (!success) {
        Alert.alert('Error', 'Failed to remove photo. Please try again.');
      }
    } catch (error) {
      console.error('Error in handlePhotoRemove:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    }
  };

  const handleLocationSelected = async (locationData) => {
    try {
      setResidence(locationData.locationString);
      const success = await updateProfile({ residence: locationData.locationString });
      
      if (success) {
        Alert.alert('Success', `Residence updated to: ${locationData.locationString}`);
      } else {
        Alert.alert('Warning', 'Residence set locally but failed to save to server. Please try again.');
      }
    } catch (error) {
      console.error('Error updating residence:', error);
      Alert.alert('Error', 'Failed to update residence. Please try again.');
    }
  };

  const saveProfile = async () => {
    try {
      if (!hasEnoughPhotos()) {
        Alert.alert('Not Enough Photos', 'Please upload at least 3 photos to save your profile.');
        return;
      }

      if (!hasBio()) {
        Alert.alert('Missing Bio', 'Please add a bio to save your profile.');
        return;
      }

      if (!hasName()) {
        Alert.alert('Missing Name', 'Please enter your name to save your profile.');
        return;
      }

      if (!validationStatus.firstName || !validationStatus.lastName) {
        Alert.alert('Missing Name', 'Please enter both your first and last name.');
        return;
      }

      if (!validationStatus.email) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (phone && !validationStatus.phone) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
        return;
      }

      if (!validationStatus.residence) {
                  Alert.alert('Missing Location', 'Please enter your location.');
        return;
      }
      
      setSaving(true);

      const newPhotos = photos.filter(photo => !photo.isExisting);
      let newlyUploadedUrls = [];
      
      if (newPhotos.length > 0) {
        newlyUploadedUrls = await uploadPhotosToStorage(newPhotos, user.id);
      }

      const existingPhotoUrls = photos
        .filter(photo => photo.isExisting && photo.uri && photo.uri.startsWith('http'))
        .map(photo => photo.uri);
      
      const allPhotoUrls = [...existingPhotoUrls, ...newlyUploadedUrls];
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      const success = await updateProfile({
        bio: bio,
        interests: interests,
        residence: residence,
        name: fullName,
        email: email,
        phone: phone,
        images: allPhotoUrls,
      });

      if (success) {
        Alert.alert('Success', 'Profile updated successfully!');
        setShowProfile(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSexDisplayText = (sex) => {
    switch (sex) {
      case 'male': return 'Men';
      case 'female': return 'Women';
      case 'all': return 'All';
      default: return 'All';
    }
  };

  const getDistanceDisplayText = (distance) => {
    if (distance === 1) return '1 mile';
    if (distance === 100) return '100+ miles';
    return `${distance} miles`;
  };

  const SettingItem = ({ icon, title, value, onPress, showSwitch = false, displayValue = null, destructive = false }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={destructive ? "#ff3b30" : "#007AFF"} style={styles.settingIcon} />
        <Text style={[styles.settingText, destructive && styles.destructiveText]}>{title}</Text>
      </View>
      {showSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#007AFF' : '#f4f3f4'}
        />
      ) : (
        <View style={styles.settingRight}>
          {displayValue && <Text style={styles.settingValue}>{displayValue}</Text>}
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <SettingItem
          icon="person-outline"
          title="Edit Profile"
          onPress={() => setShowProfile(true)}
        />
        <SettingItem
          icon="location-outline"
          title="Location Sharing"
          value={isLocationSharingEnabled()}
          onPress={handleLocationSharingToggle}
          showSwitch
        />
        <SettingItem
          icon="log-out-outline"
          title="Log Out"
          onPress={handleLogout}
        />
        <SettingItem
          icon="trash-outline"
          title="Delete Account"
          onPress={handleDeleteAccount}
          destructive
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtering</Text>
        <SettingItem
          icon="people-outline"
          title="Age Range"
          displayValue={`${ageRange.min}-${ageRange.max}`}
          onPress={handleAgeRangePress}
        />
        <SettingItem
          icon="heart-outline"
          title="Show Me"
          displayValue={getSexDisplayText(preferredSex)}
          onPress={handleSexPreferencePress}
        />
        <SettingItem
          icon="location-outline"
          title="Maximum Distance"
          displayValue={getDistanceDisplayText(maxDistance)}
          onPress={handleDistancePress}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem
          icon="help-circle-outline"
          title="Help Center"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => {}}
        />
        <SettingItem
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => {}}
        />
      </View>

      <Text style={styles.version}>Version 1.0.0</Text>

      {/* Age Range Modal */}
      <Modal
        visible={showAgeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Age Range</Text>
            <View style={styles.ageInputContainer}>
              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Min Age</Text>
                <TextInput
                  style={styles.ageTextInput}
                  value={tempAgeRange.min.toString()}
                  onChangeText={(text) => setTempAgeRange(prev => ({ ...prev, min: parseInt(text) || 18 }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={styles.ageSeparator}>-</Text>
              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Max Age</Text>
                <TextInput
                  style={styles.ageTextInput}
                  value={tempAgeRange.max.toString()}
                  onChangeText={(text) => setTempAgeRange(prev => ({ ...prev, max: parseInt(text) || 50 }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowAgeModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveAgeRange}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sex Preference Modal */}
      <Modal
        visible={showSexModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSexModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Show Me</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tempPreferredSex}
                onValueChange={(itemValue) => setTempPreferredSex(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Men" value="male" />
                <Picker.Item label="Women" value="female" />
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowSexModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveSexPreference}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Distance Modal */}
      <Modal
        visible={showDistanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Maximum Distance</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tempMaxDistance}
                onValueChange={(itemValue) => setTempMaxDistance(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="1 mile" value={1} />
                <Picker.Item label="5 miles" value={5} />
                <Picker.Item label="10 miles" value={10} />
                <Picker.Item label="25 miles" value={25} />
                <Picker.Item label="50 miles" value={50} />
                <Picker.Item label="100+ miles" value={100} />
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowDistanceModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveDistance}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Editing Modal */}
      <Modal
        visible={showProfile}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowProfile(false)}
      >
        <View style={styles.profileContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <LottieView
                source={require('../../assets/animations/heart.json')}
                autoPlay
                loop
                style={styles.lottieAnimation}
                speed={1}
              />
            </View>
          ) : (
            <ScrollView 
              style={styles.profileForm} 
              contentContainerStyle={styles.profileFormContent}
              showsVerticalScrollIndicator={false}
            >
              <PersonalInfoForm
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                email={email}
                setEmail={setEmail}
                phone={phone}
                setPhone={setPhone}
                residence={residence}
                setResidence={setResidence}
                validationStatus={validationStatus}
              />
              <PhotoSection
                photos={photos}
                setPhotos={setPhotos}
                required={true}
                onRemovePhoto={handlePhotoRemove}
              />
              <BioSection
                bio={bio}
                setBio={setBio}
                interests={interests}
                setInterests={setInterests}
              />
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                  onPress={saveProfile} 
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  disabled={saving}
                >
                  <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
                    {saving ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.discardButton}
                  onPress={() => setShowProfile(false)}
                >
                  <Text style={styles.discardButtonText}>Discard</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    marginRight: 12,
    color: '#333',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageInput: {
    flex: 1,
    marginRight: 10,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  ageTextInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
    backgroundColor: '#f9f9f9',
  },
  ageSeparator: {
    marginHorizontal: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  modalButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
  },
  destructiveText: {
    color: '#ff3b30',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  // Profile editing styles
  profileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  profileHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    flex: 1,
    backgroundColor: 'hotpink',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  profileForm: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  profileFormContent: {
    paddingVertical: 20,
    gap: 25,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 20,
    paddingHorizontal: 5,
  },
  discardButton: {
    flex: 1,
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderColor: '#ddd',
    width: '45%',
  },
  discardButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
