import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { supabase } from '../../lib/supabase';
import { uploadPhotosToStorage } from '../../lib/supabase';
import PhotoSection from '../components/auth/PhotoSection';
import BioSection from '../components/auth/BioSection';
import { useRouter } from 'expo-router';
import { useProfile } from '../contexts/ProfileContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { 
    user, 
    profile, 
    loading, 
    photos, 
    bio, 
    interests, 
    setBio, 
    setInterests, 
    setPhotos,
    updateProfile,
    updatePhotos,
    removePhoto,
    hasEnoughPhotos,
    hasBio,
    hasCompletedProfile,
    refreshProfile
  } = useProfile();
  const [saving, setSaving] = useState(false);

  // Profile data is now loaded by the context
  // No need for useEffect or loadUserProfile/loadPhotosFromStorage functions

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

  const saveProfile = async () => {
    try {
      console.log('SaveProfile - Total photos:', photos.length);
      console.log('SaveProfile - Photos:', photos);
      
      if (!hasEnoughPhotos()) {
        Alert.alert('Not Enough Photos', 'Please upload at least 3 photos to save your profile.');
        return;
      }

      if (!hasBio()) {
        Alert.alert('Missing Bio', 'Please add a bio to save your profile.');
        return;
      }
      setSaving(true);

      // Upload new photos (only non-existing ones)
      const newPhotos = photos.filter(photo => !photo.isExisting);
      let newlyUploadedUrls = [];
      
      if (newPhotos.length > 0) {
        newlyUploadedUrls = await uploadPhotosToStorage(newPhotos, user.id);
        console.log('SaveProfile - Newly uploaded URLs:', newlyUploadedUrls);
      }

      // Build the complete images array:
      // 1. Get existing photo URLs (photos that were already in storage/database)
      const existingPhotoUrls = photos
        .filter(photo => photo.isExisting && photo.uri && photo.uri.startsWith('http'))
        .map(photo => photo.uri);
      
      // 2. Add newly uploaded URLs
      const allPhotoUrls = [...existingPhotoUrls, ...newlyUploadedUrls];

      console.log('SaveProfile - Existing photo URLs:', existingPhotoUrls);
      console.log('SaveProfile - Newly uploaded URLs:', newlyUploadedUrls);
      console.log('SaveProfile - Complete images array:', allPhotoUrls);
      console.log('SaveProfile - Total count:', allPhotoUrls.length);

      // Use context method to update profile
      const success = await updateProfile({
        bio: bio,
        interests: interests,
        images: allPhotoUrls,
      });

      if (success) {
        console.log('✅ Profile updated successfully with images array:', allPhotoUrls);
        Alert.alert('Success', 'Profile updated successfully!');
        router.back();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/animations/heart.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
          speed={1}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="hotpink" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={saveProfile} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.form} 
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Display read-only profile info */}
        {profile && (
          <View style={styles.profileCard}>
            <View style={styles.profileRow}>
              <Ionicons name="person" size={20} color="hotpink" style={styles.profileIcon} />
              <Text style={styles.profileValue}>{profile.name || '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="male-female" size={20} color="hotpink" style={styles.profileIcon} />
              <Text style={styles.profileValue}>{profile.sex || '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="calendar-outline" size={20} color="hotpink" style={styles.profileIcon} />
              <Text style={styles.profileValue}>{profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="mail" size={20} color="hotpink" style={styles.profileIcon} />
              <Text style={styles.profileValue}>{profile.email || '-'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Ionicons name="call" size={20} color="hotpink" style={styles.profileIcon} />
              <Text style={styles.profileValue}>{profile.phone || '-'}</Text>
            </View>
          </View>
        )}
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  form: {
    flex: 1,
    paddingHorizontal: 25,
  },
  formContent: {
    paddingVertical: 20,
    gap: 25,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileValue: {
    color: '#222',
    fontSize: 15,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
}); 