import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase, deleteUserAccount, disableUserAccount } from '../../lib/supabase';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useProfile } from '../contexts/ProfileContext';
import AccountSection from '../components/settings/AccountSection';
import AgeRangeModal from '../components/settings/AgeRangeModal';
import SexPreferenceModal from '../components/settings/SexPreferenceModal';
import DistanceModal from '../components/settings/DistanceModal';
import ProfileEditModal from '../components/settings/ProfileEditModal';
import { uploadPhotosToStorage } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const router = useRouter();
  
  // Filter settings
  const [ageRange, setAgeRange] = useState({ min: 18, max: 50 });
  const [preferredSex, setPreferredSex] = useState('all');
  const [maxDistance, setMaxDistance] = useState(50);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showSexModal, setShowSexModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  // Profile editing state
  const [showProfile, setShowProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [validationStatus, setValidationStatus] = useState({
    firstName: true,
    lastName: true,
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
    updatePersonal,
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

  // Refresh profile data when user changes
  useEffect(() => {
    if (user) {
      console.log('🔄 User changed in settings, refreshing profile data for:', user.id);
      refreshProfile();
    }
  }, [user?.id]); // Only trigger when user ID changes

  const loadUserPreferences = async () => {
    if (!user) return;
    
    console.log('⚙️ Loading preferences for user:', user.id);
    
    try {
      const [storedMaxDistance, storedAgeRange, storedPreferredSex] = await Promise.all([
        AsyncStorage.getItem(`maxDistance_${user.id}`),
        AsyncStorage.getItem(`ageRange_${user.id}`),
        AsyncStorage.getItem(`preferredSex_${user.id}`)
      ]);

      if (storedMaxDistance) {
        setMaxDistance(parseInt(storedMaxDistance));
        console.log('📏 Loaded max distance:', storedMaxDistance);
      }

      if (storedAgeRange) {
        const parsedAgeRange = JSON.parse(storedAgeRange);
        setAgeRange(parsedAgeRange);
        console.log('🎂 Loaded age range:', parsedAgeRange);
      }

      if (storedPreferredSex) {
        setPreferredSex(storedPreferredSex);
        console.log('❤️ Loaded preferred sex:', storedPreferredSex);
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
      console.log('👤 Loading name for user:', user?.id, 'Name:', name);
      const nameParts = name.split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
    } else {
      console.log('👤 No name found for user:', user?.id);
      setFirstName('');
      setLastName('');
    }
  }, [name, user]);

  // Validation logic
  useEffect(() => {
    setValidationStatus({
      firstName: firstName?.trim().length > 0,
      lastName: lastName?.trim().length > 0,
      residence: residence?.trim().length > 0
    });
  }, [firstName, lastName, residence]);

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
    setShowAgeModal(true);
  };

  const handleSexPreferencePress = () => {
    setShowSexModal(true);
  };

  const handleDistancePress = () => {
    setShowDistanceModal(true);
  };

  const saveAgeRange = (newAgeRange) => {
    setAgeRange(newAgeRange);
    saveUserPreference('ageRange', newAgeRange);
  };

  const saveSexPreference = (newPreferredSex) => {
    setPreferredSex(newPreferredSex);
    saveUserPreference('preferredSex', newPreferredSex);
  };

  const saveDistance = (newMaxDistance) => {
    setMaxDistance(newMaxDistance);
    saveUserPreference('maxDistance', newMaxDistance);
  };

  // Location sharing functions
  const handleLocationSharingToggle = async () => {
    const currentlyEnabled = isLocationSharingEnabled();
    
    if (currentlyEnabled) {
      // Disable location sharing
      Alert.alert(
        'Disable Location Sharing',
        'This will stop sharing your location with other users. Your feed will be based on your residence.',
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

  const handleEmailUpdate = async (newEmail) => {
    try {
      const success = await updateProfile({ email: newEmail });
      if (success) {
        setEmail(newEmail);
        Alert.alert('Success', 'Email updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update email. Please try again.');
      }
    } catch (error) {
      console.error('Error updating email:', error);
      Alert.alert('Error', 'Failed to update email. Please try again.');
    }
  };

  const handlePhoneUpdate = async (newPhone) => {
    try {
      const success = await updateProfile({ phone: newPhone });
      if (success) {
        setPhone(newPhone);
        Alert.alert('Success', 'Phone number updated successfully!');
      } else {
        Alert.alert('Error', 'Failed to update phone number. Please try again.');
      }
    } catch (error) {
      console.error('Error updating phone:', error);
      Alert.alert('Error', 'Failed to update phone number. Please try again.');
    }
  };

  const handleDisableAccount = async () => {
    try {
      await disableUserAccount();
      Alert.alert(
        'Account Disabled',
        'Your account has been disabled. You have been signed out. To re-enable your account, please contact support.',
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
      console.error('Account disable error:', error);
      Alert.alert(
        'Disable Error',
        'There was an error disabling your account. Please try again or contact support.',
        [
          {
            text: 'OK'
          }
        ]
      );
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

      if (!validationStatus.residence) {
        Alert.alert('Missing Location', 'Please enter your location.');
        return;
      }

      if (!interests || interests.length < 10) {
        Alert.alert('Incomplete Interests', 'Please select at least 10 interests to save your profile.');
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
      
      // Save profile data (bio, interests, residence, images)
      console.log('💾 Saving profile data:', { bio, interests, residence, imageCount: allPhotoUrls.length });
      const profileSuccess = await updateProfile({
        bio: bio,
        interests: interests,
        residence: residence,
        images: allPhotoUrls,
      });
      console.log('✅ Profile save result:', profileSuccess);

      // Save personal data (name)
      console.log('💾 Saving personal data:', { name: fullName });
      const personalSuccess = await updatePersonal({
        name: fullName,
      });
      console.log('✅ Personal save result:', personalSuccess);



      if (profileSuccess && personalSuccess) {
        console.log('🎉 Profile save completed successfully:', { profileSuccess, personalSuccess });
        Alert.alert('Success', message);
        setShowProfile(false);
      } else {
        console.error('❌ Profile save failed:', { profileSuccess, personalSuccess });
        throw new Error(`Failed to update profile or personal data. Profile: ${profileSuccess}, Personal: ${personalSuccess}`);
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      Alert.alert('Error', `Failed to save profile: ${error.message}`);
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
        <MaterialIcons name={icon} size={24} color={"hotpink"} style={styles.settingIcon} />
        <Text style={[styles.settingText, destructive && styles.destructiveText]}>{title}</Text>
      </View>
      {showSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#767577', true: 'pink' }}
          thumbColor={value ? 'hotpink' : '#f4f3f4'}
        />
      ) : (
        <View style={styles.settingRight}>
          {displayValue && <Text style={styles.settingValue}>{displayValue}</Text>}
          <MaterialIcons name="chevron-right" size={24} color="#999" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <SettingItem
          icon="settings"
          title="Account"
          onPress={() => setShowAccountModal(true)}
        />
        <SettingItem
          icon="person"
          title="Profile"
          onPress={() => setShowProfile(true)}
        />
     
        <SettingItem
          icon="location-on"
          title="Location"
          value={isLocationSharingEnabled()}
          onPress={handleLocationSharingToggle}
          showSwitch
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feed</Text>
        <SettingItem
          icon="favorite"
          title="Gender"
          displayValue={getSexDisplayText(preferredSex)}
          onPress={handleSexPreferencePress}
        />
        <SettingItem
          icon="cake"
          title="Age"
          displayValue={`${ageRange.min}-${ageRange.max}`}
          onPress={handleAgeRangePress}
        />
        <SettingItem
          icon="location-on"
          title="Distance"
          displayValue={getDistanceDisplayText(maxDistance)}
          onPress={handleDistancePress}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem
          icon="help"
          title="Help Center"
          onPress={() => {}}
        />
        <SettingItem
          icon="description"
          title="Terms of Service"
          onPress={() => {}}
        />
        <SettingItem
          icon="security"
          title="Privacy Policy"
          onPress={() => {}}
        />
      </View>

      <Text style={styles.version}>Version 1.0.0</Text>

      {/* Account Modal */}
      <AccountSection
        visible={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        email={email}
        setEmail={setEmail}
        phone={phone}
        setPhone={setPhone}
        validationStatus={validationStatus}
        onEmailUpdate={handleEmailUpdate}
        onPhoneUpdate={handlePhoneUpdate}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onDisableAccount={handleDisableAccount}
        user={user}
      />

      {/* Age Range Modal */}
      <AgeRangeModal
        visible={showAgeModal}
        onClose={() => setShowAgeModal(false)}
        ageRange={ageRange}
        onSave={saveAgeRange}
      />

      {/* Sex Preference Modal */}
      <SexPreferenceModal
        visible={showSexModal}
        onClose={() => setShowSexModal(false)}
        preferredSex={preferredSex}
        onSave={saveSexPreference}
      />

      {/* Distance Modal */}
      <DistanceModal
        visible={showDistanceModal}
        onClose={() => setShowDistanceModal(false)}
        maxDistance={maxDistance}
        onSave={saveDistance}
      />

      {/* Profile Editing Modal */}
      <ProfileEditModal
        visible={showProfile}
        onClose={() => setShowProfile(false)}
        loading={loading}
        saving={saving}
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        residence={residence}
        setResidence={setResidence}
        validationStatus={validationStatus}
        photos={photos}
        setPhotos={setPhotos}
        onRemovePhoto={handlePhotoRemove}
        bio={bio}
        setBio={setBio}
        interests={interests}
        setInterests={setInterests}
        onSave={saveProfile}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: 'black',
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
  destructiveText: {
    color: '#ff3b30',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
});

