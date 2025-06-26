import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { uploadPhotosToStorage } from '../../lib/supabase';
import PhotoSection from '../components/auth/PhotoSection';
import BioSection from '../components/auth/BioSection';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.replace('/auth');
        return;
      }
      
      setUser(currentUser);
      console.log('Loading profile for user:', currentUser.id);

      // Load profile data (excluding photos since they're in storage)
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, bio, interests, name, birthday, sex, email, phone')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data.');
        return;
      }

      if (profileData) {
        console.log('Profile data loaded:', profileData);
        setProfile(profileData);
        
        // Load existing bio
        setBio(profileData.bio || '');
        console.log('Bio loaded:', profileData.bio || '');
        
        // Load existing interests
        setInterests(profileData.interests || []);
        console.log('Interests loaded:', profileData.interests || []);
        
        // Load photos from storage instead of database
        await loadPhotosFromStorage(currentUser.id);
      } else {
        console.log('No profile data found, starting with empty profile');
        setBio('');
        setInterests([]);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
      Alert.alert('Error', 'Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const loadPhotosFromStorage = async (userId) => {
    try {
      console.log('Loading photos from storage for user:', userId);
      
      // List files in user's storage folder
      const { data: files, error } = await supabase.storage
        .from('users')
        .list(`${userId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error('Error listing photos from storage:', error);
        setPhotos([]);
        return;
      }

      if (files && files.length > 0) {
        // Convert storage files to photo objects
        const photoObjects = files
          .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
          .map((file, index) => ({
            id: `storage-${index}`,
            uri: supabase.storage.from('users').getPublicUrl(`${userId}/${file.name}`).data.publicUrl,
            isExisting: true,
            fileName: file.name
          }));
        
        setPhotos(photoObjects);
        console.log('Photos loaded from storage:', photoObjects.length, 'photos');
      } else {
        console.log('No photos found in storage');
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error loading photos from storage:', error);
      setPhotos([]);
    }
  };

  const handlePhotoRemove = async (photo) => {
    try {
      if (photo.isExisting && photo.fileName) {
        // Remove from storage
        console.log('Removing photo from storage:', photo.fileName);
        const { error } = await supabase.storage
          .from('users')
          .remove([`${user.id}/${photo.fileName}`]);

        if (error) {
          console.error('Error removing photo from storage:', error);
          Alert.alert('Error', 'Failed to remove photo from storage.');
          return;
        }
        
        console.log('Photo removed from storage successfully');
      }
      
      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error) {
      console.error('Error in handlePhotoRemove:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      // Upload new photos (only non-existing ones)
      const newPhotos = photos.filter(photo => !photo.isExisting);
      let photoUrls = [];
      
      if (newPhotos.length > 0) {
        photoUrls = await uploadPhotosToStorage(newPhotos, user.id);
      }

      // Check if profile exists first
      const { data: existingProfile, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking profile existence:', checkError);
        throw checkError;
      }

      let dbError;
      if (existingProfile) {
        // Profile exists, use UPDATE
        const { error } = await supabase
          .from('users')
          .update({
            bio: bio,
            interests: interests,
          })
          .eq('id', user.id);
        dbError = error;
      } else {
        // Profile doesn't exist, use INSERT
        const { error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            bio: bio,
            interests: interests,
          });
        dbError = error;
      }

      if (dbError) {
        console.error('Error updating profile:', dbError);
        throw dbError;
      }

      Alert.alert('Success', 'Profile updated successfully!');
      router.back();
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
        <Text>Loading profile...</Text>
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
}); 