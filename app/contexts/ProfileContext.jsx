import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const ProfileContext = createContext();

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load user profile data
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.replace('/auth');
        return;
      }
      
      setUser(currentUser);
      console.log('Loading profile for user:', currentUser.id);

      // Load profile data including images from database
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, bio, interests, name, birthday, sex, email, phone, images')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profileData) {
        console.log('Profile data loaded:', profileData);
        setProfile(profileData);
        setBio(profileData.bio || '');
        setInterests(profileData.interests || []);
        
        // Load photos from both database and storage
        await loadPhotosFromStorage(currentUser.id, profileData.images);
      } else {
        console.log('No profile data found, starting with empty profile');
        setBio('');
        setInterests([]);
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load photos from storage
  const loadPhotosFromStorage = async (userId, dbImages = []) => {
    try {
      console.log('Loading photos for user:', userId);
      console.log('Database images:', dbImages);
      
      // Start with images from database if available
      let photoObjects = [];
      
      if (dbImages && Array.isArray(dbImages) && dbImages.length > 0) {
        photoObjects = dbImages.map((url, index) => ({
          id: `db-${index}`,
          uri: url,
          isExisting: true,
          fileName: `db-image-${index}`
        }));
        console.log('Photos loaded from database:', photoObjects.length, 'photos');
      }
      
      // Also check storage for any additional photos
      const { data: files, error } = await supabase.storage
        .from('users')
        .list(`${userId}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error('Error listing photos from storage:', error);
      } else if (files && files.length > 0) {
        // Add storage photos that aren't already in database
        const storagePhotoObjects = files
          .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
          .map((file, index) => ({
            id: `storage-${index}`,
            uri: supabase.storage.from('users').getPublicUrl(`${userId}/${file.name}`).data.publicUrl,
            isExisting: true,
            fileName: file.name
          }));
        
        // Merge storage photos with database photos, avoiding duplicates
        const existingUrls = new Set(photoObjects.map(photo => photo.uri));
        const newStoragePhotos = storagePhotoObjects.filter(photo => !existingUrls.has(photo.uri));
        
        photoObjects = [...photoObjects, ...newStoragePhotos];
        console.log('Additional photos loaded from storage:', newStoragePhotos.length, 'photos');
      }
      
      setPhotos(photoObjects);
      console.log('Total photos loaded:', photoObjects.length, 'photos');
      
    } catch (error) {
      console.error('Error loading photos:', error);
      setPhotos([]);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  // Update profile data
  const updateProfile = async (updates) => {
    try {
      if (!user) return false;

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Update local state
      setProfile(prev => ({ ...prev, ...updates }));
      
      // Update specific fields if they exist in updates
      if (updates.bio !== undefined) setBio(updates.bio);
      if (updates.interests !== undefined) setInterests(updates.interests);
      if (updates.images !== undefined) {
        await loadPhotosFromStorage(user.id, updates.images);
      }

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Update photos
  const updatePhotos = async (newPhotos) => {
    setPhotos(newPhotos);
    
    // Update the images array in the database
    const photoUrls = newPhotos
      .filter(photo => photo.uri && photo.uri.startsWith('http'))
      .map(photo => photo.uri);
    
    await updateProfile({ images: photoUrls });
  };

  // Remove photo
  const removePhoto = async (photo) => {
    try {
      if (photo.isExisting && photo.fileName) {
        // Remove from storage if it's a storage file
        if (!photo.fileName.startsWith('db-image-')) {
          console.log('Removing photo from storage:', photo.fileName);
          const { error } = await supabase.storage
            .from('users')
            .remove([`${user.id}/${photo.fileName}`]);

          if (error) {
            console.error('Error removing photo from storage:', error);
            return false;
          }
          
          console.log('Photo removed from storage successfully');
        }
      }
      
      // Remove from local state
      const remainingPhotos = photos.filter(p => p.id !== photo.id);
      setPhotos(remainingPhotos);
      
      // Update the images array in the database
      const remainingUrls = remainingPhotos
        .filter(photo => photo.uri && photo.uri.startsWith('http'))
        .map(photo => photo.uri);
      
      await updateProfile({ images: remainingUrls });
      return true;
    } catch (error) {
      console.error('Error in removePhoto:', error);
      return false;
    }
  };

  // Check if user has enough photos
  const hasEnoughPhotos = () => {
    return photos.length >= 3;
  };

  // Check if user has a bio
  const hasBio = () => {
    return bio && bio.trim().length > 0;
  };

  // Check if user has completed their profile (photos + bio)
  const hasCompletedProfile = () => {
    return hasEnoughPhotos() && hasBio();
  };

  // Get user's photo count
  const getPhotoCount = () => {
    return photos.length;
  };

  // Initialize profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const value = {
    // State
    user,
    profile,
    loading,
    refreshing,
    photos,
    bio,
    interests,
    
    // Actions
    loadUserProfile,
    refreshProfile,
    updateProfile,
    updatePhotos,
    removePhoto,
    hasEnoughPhotos,
    hasBio,
    hasCompletedProfile,
    getPhotoCount,
    
    // Setters for form state
    setBio,
    setInterests,
    setPhotos,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}; 