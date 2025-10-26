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
  const [pendingUpdates, setPendingUpdates] = useState(null);

  // Helper function to check if location sharing is enabled
  const isLocationSharingEnabled = () => {
    return geolocation !== null;
  };

  // Clear all profile data
  const clearProfileData = () => {
    setProfile(null);
    setPhotos([]);
    setBio('');
    setInterests([]);
    setResidence('');
    setGeolocation(null);
    setName('');
    setEmail('');
    setPhone('');
  };

  // Load user profile data
  const loadUserProfile = async (targetUserId = null) => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        clearProfileData();
        setUser(null);
        router.replace('/auth');
        return;
      }
      
      // Use targetUserId if provided, otherwise use currentUser.id
      const userIdToLoad = targetUserId || currentUser.id;
      
      // Check if user has changed
      if (user && user.id !== userIdToLoad) {
        console.log('🔄 User changed, clearing previous data');
        clearProfileData();
      }
      
      setUser(currentUser);
      console.log('👤 Loading profile for user:', userIdToLoad);

      // Load profile data including images from database
      const { data: profileData, error } = await supabase
        .from('profile')
        .select('id, bio, interests, images, residence, geolocation')
        .eq('id', userIdToLoad)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading profile:', error);
        return;
      }

      // Load personal data from personal table
      const { data: personalData, error: personalError } = await supabase
        .from('personal')
        .select('id, name, sex, birthdate')
        .eq('id', userIdToLoad)
        .single();

      if (personalError && personalError.code !== 'PGRST116') {
        console.error('Error loading personal data:', personalError);
        return;
      }

      if (profileData || personalData) {
        console.log('✅ Profile data loaded for user:', userIdToLoad);
        setProfile(profileData);
        setBio(profileData?.bio || '');
        setInterests(profileData?.interests || []);
        setResidence(profileData?.residence || '');
        setGeolocation(profileData?.geolocation || null);
        setName(personalData?.name || '');
        // Get email and phone from auth user object
        setEmail(currentUser?.email || '');
        setPhone(currentUser?.phone || '');
        
        // Load photos from both database and storage
        await loadPhotosFromStorage(userIdToLoad, profileData.images);
        
        // Update geolocation on app start/login only if location sharing is enabled
        // Check if geolocation is not null (meaning location sharing is enabled)
        if (profileData.geolocation !== null) {
          // Use requestAnimationFrame to defer the geolocation update to avoid useInsertionEffect warning
          requestAnimationFrame(async () => {
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
          });
        } else {
          console.log('📍 Location sharing disabled (geolocation is null), skipping geolocation update');
        }
      } else {
        console.log('📝 No profile data found for user:', userIdToLoad, '- starting with empty profile');
        // No profile data found, starting with empty profile
        setBio('');
        setInterests([]);
        setResidence('');
        setGeolocation(null);
        setName('');
        // Get email and phone from auth user object
        setEmail(currentUser?.email || '');
        setPhone(currentUser?.phone || '');
        
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

  // Update profile data (bio, interests, images, residence, geolocation)
  const updateProfile = async (updates) => {
    try {
      if (!user) return false;

      const { error } = await supabase
        .from('profile')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      // Update local state
      setProfile(prev => ({ ...prev, ...updates }));
      
      // Set pending updates to be processed in useEffect
      setPendingUpdates(updates);
      
      if (updates.images !== undefined) {
        await loadPhotosFromStorage(user.id, updates.images);
      }

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  // Update personal data (name, sex, birthdate)
  const updatePersonal = async (updates) => {
    try {
      if (!user) return false;

      const { error } = await supabase
        .from('personal')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating personal data:', error);
        return false;
      }

      // Set pending updates to be processed in useEffect
      setPendingUpdates(updates);

      return true;
    } catch (error) {
      console.error('Error updating personal data:', error);
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
    let isMounted = true;
    
    const initializeProfile = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (isMounted) {
          if (currentUser) {
            await loadUserProfile(currentUser.id);
          } else {
            await loadUserProfile();
          }
        }
      } catch (error) {
        console.error('Error initializing profile:', error);
      }
    };
    
    initializeProfile();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    let isMounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('🔄 Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in, load their profile
        console.log('👤 User signed in, loading profile for:', session.user.id);
        await loadUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // User signed out, clear all data
        console.log('👋 User signed out, clearing profile data');
        clearProfileData();
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed, check if user changed
        if (user && user.id !== session.user.id) {
          console.log('🔄 User changed during token refresh, reloading profile');
          await loadUserProfile(session.user.id);
        }
      } else if (event === 'USER_UPDATED' && session?.user) {
        // User data updated, reload profile if user changed
        if (user && user.id !== session.user.id) {
          console.log('🔄 User updated, reloading profile');
          await loadUserProfile(session.user.id);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [user?.id]); // Only depend on user.id to avoid infinite loops

  // Handle pending updates to avoid useInsertionEffect warning
  useEffect(() => {
    if (pendingUpdates) {
      // Use requestAnimationFrame to defer state updates and avoid useInsertionEffect warning
      requestAnimationFrame(() => {
        // Update specific fields if they exist in updates
        if (pendingUpdates.bio !== undefined) setBio(pendingUpdates.bio);
        if (pendingUpdates.interests !== undefined) setInterests(pendingUpdates.interests);
        if (pendingUpdates.residence !== undefined) setResidence(pendingUpdates.residence);
        if (pendingUpdates.geolocation !== undefined) setGeolocation(pendingUpdates.geolocation);
        if (pendingUpdates.name !== undefined) setName(pendingUpdates.name);
        if (pendingUpdates.email !== undefined) setEmail(pendingUpdates.email);
        if (pendingUpdates.phone !== undefined) setPhone(pendingUpdates.phone);
        
        // Clear pending updates
        setPendingUpdates(null);
      });
    }
  }, [pendingUpdates]);

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
    updatePersonal,
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