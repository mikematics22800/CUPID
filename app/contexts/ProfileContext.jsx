import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, getCurrentLocationAndresidence } from '../../lib/supabase';
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
  const [residence, setResidence] = useState('');
  const [geolocation, setGeolocation] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to check if location sharing is enabled
  const isLocationSharingEnabled = () => {
    return geolocation !== null;
  };

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
      // Loading profile for user

      // Load profile data including images from database
      const { data: profileData, error } = await supabase
        .from('users')
        .select('id, bio, interests, name, birthday, sex, email, phone, images, residence, geolocation')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      if (profileData) {
        // Profile data loaded
        setProfile(profileData);
        setBio(profileData.bio || '');
        setInterests(profileData.interests || []);
        setResidence(profileData.residence || '');
        setGeolocation(profileData.geolocation || null);
        setName(profileData.name || '');
        setEmail(profileData.email || '');
        setPhone(profileData.phone || '');
        
        // Load photos from both database and storage
        await loadPhotosFromStorage(currentUser.id, profileData.images);
        
        // Update geolocation on app start/login only if location sharing is enabled
        if (profileData.geolocation) {
          try {
            console.log('📍 Updating geolocation on app start/login');
            const location = await getCurrentLocationAndresidence();
            if (location) {
              console.log('✅ Geolocation updated on app start:', location.geolocation);
              await updateProfile({ geolocation: location.geolocation });
            }
          } catch (error) {
            console.error('❌ Error updating geolocation on app start:', error);
          }
        } else {
          console.log('📍 Location sharing disabled (geolocation is null), skipping geolocation update');
        }
      } else {
        // No profile data found, starting with empty profile
        setBio('');
        setInterests([]);
        setResidence('');
        setGeolocation(null);
        setName('');
        setEmail('');
        setPhone('');
        
        // Don't update geolocation for new users until they explicitly enable location sharing
        console.log('📍 New user, location sharing disabled by default (geolocation is null)');
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
          // Loading photos for user
      
      // Start with images from database if available
      let photoObjects = [];
      
      if (dbImages && Array.isArray(dbImages) && dbImages.length > 0) {
        photoObjects = dbImages.map((url, index) => ({
          id: `db-${index}`,
          uri: url,
          isExisting: true,
          fileName: `db-image-${index}`
        }));
        // Photos loaded from database
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
        // Additional photos loaded from storage
      }
      
      setPhotos(photoObjects);
      // Total photos loaded
      
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
      if (updates.residence !== undefined) setResidence(updates.residence);
      if (updates.geolocation !== undefined) setGeolocation(updates.geolocation);
      if (updates.name !== undefined) setName(updates.name);
      if (updates.email !== undefined) setEmail(updates.email);
      if (updates.phone !== undefined) setPhone(updates.phone);
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
          // Removing photo from storage
          const { error } = await supabase.storage
            .from('users')
            .remove([`${user.id}/${photo.fileName}`]);

          if (error) {
            console.error('Error removing photo from storage:', error);
            return false;
          }
          
          // Photo removed from storage successfully
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

  // Check if user has a name
  const hasName = () => {
    return name && name.trim().length > 0;
  };

  // Check if user has completed their profile (photos + bio + name)
  const hasCompletedProfile = () => {
    return hasEnoughPhotos() && hasBio() && hasName();
  };

  // Get user's photo count
  const getPhotoCount = () => {
    return photos.length;
  };

  // Function to update geolocation
  const updateGeolocation = async () => {
    try {
      console.log('📍 Manually updating geolocation');
      const location = await getCurrentLocationAndresidence();
      if (location) {
        console.log('✅ Geolocation updated manually:', location.geolocation);
        await updateProfile({ geolocation: location.geolocation });
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error manually updating geolocation:', error);
      return false;
    }
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
    residence,
    geolocation,
    name,
    email,
    phone,
    
    // Actions
    loadUserProfile,
    refreshProfile,
    updateProfile,
    updatePhotos,
    removePhoto,
    hasEnoughPhotos,
    hasBio,
    hasName,
    hasCompletedProfile,
    getPhotoCount,
    updateGeolocation,
    isLocationSharingEnabled,
    
    // Setters for form state
    setBio,
    setInterests,
    setPhotos,
    setResidence,
    setGeolocation,
    setName,
    setEmail,
    setPhone,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

// Default export
export default ProfileProvider; 