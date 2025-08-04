import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, initializeAppStateListener, cleanupAppStateListener } from '../lib/supabase';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import LocationPermissionHandler from './components/LocationPermissionHandler';
'../assets/images/heart.lottie';

// Component to handle location permission on first launch
function LocationPermissionHandlerWrapper() {
  const { isLocationSharingEnabled, updateProfile, user, hasCompletedProfile, loading } = useProfile();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasShownLocationModal, setHasShownLocationModal] = useState(false);
  const [locationPromptDisabled, setLocationPromptDisabled] = useState(false);

  // Load location prompt preference from AsyncStorage
  useEffect(() => {
    const loadLocationPromptPreference = async () => {
      try {
        const disabled = await AsyncStorage.getItem('location_prompt_disabled');
        setLocationPromptDisabled(disabled === 'true');
      } catch (error) {
        console.error('Error loading location prompt preference:', error);
      }
    };
    
    loadLocationPromptPreference();
  }, []);

  useEffect(() => {
    // Only show location permission modal if:
    // 1. User is authenticated (user exists)
    // 2. Profile is loaded (not loading)
    // 3. User has completed their profile
    // 4. Location sharing is not enabled
    // 5. Location prompt is not disabled
    // 6. We haven't shown the modal yet
    if (
      user && 
      !loading && 
      hasCompletedProfile() && 
      isLocationSharingEnabled() === false && 
      !locationPromptDisabled && 
      !hasShownLocationModal
    ) {
      // Add a small delay to ensure the app is fully loaded and avoid useInsertionEffect warning
      const timer = setTimeout(() => {
        setShowLocationModal(true);
        setHasShownLocationModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, loading, hasCompletedProfile, isLocationSharingEnabled, locationPromptDisabled, hasShownLocationModal]);

  const handleLocationEnabled = async (locationData) => {
    try {
      await updateProfile({ geolocation: locationData.geolocation });
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error updating profile with location:', error);
      setShowLocationModal(false);
    }
  };

  const handleLocationDisabled = async (neverAskAgain = false) => {
    setShowLocationModal(false);
    
    if (neverAskAgain) {
      try {
        await AsyncStorage.setItem('location_prompt_disabled', 'true');
        setLocationPromptDisabled(true);
        console.log('✅ Location prompt disabled permanently');
      } catch (error) {
        console.error('❌ Error saving location prompt preference:', error);
      }
    }
  };

  return (
    <LocationPermissionHandler
      visible={showLocationModal}
      onClose={() => setShowLocationModal(false)}
      onLocationEnabled={handleLocationEnabled}
      onLocationDisabled={handleLocationDisabled}
    />
  );
}

export default function Layout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize app state listener
  useEffect(() => {
    initializeAppStateListener();
    
    return () => {
      cleanupAppStateListener();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          // Only consider user authenticated if email is confirmed
          const isEmailConfirmed = session?.user?.email_confirmed_at;
          setIsAuthenticated(!!session && !!isEmailConfirmed);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        if (isMounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMounted) {
        if (event === 'SIGNED_IN') {
          // Check if user's email is confirmed
          if (session?.user?.email_confirmed_at) {
            setIsAuthenticated(true);
            router.replace('/(tabs)/feed');
          } else {
            // User is signed in but email not confirmed
            setIsAuthenticated(false);
            router.replace('/auth');
            // You could show a message here about email verification
          }
        } else if (event === 'SIGNED_OUT') {
          setIsAuthenticated(false);
          router.replace('/auth');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Handle initial navigation after loading
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(tabs)/feed');
      } else {
        router.replace('/auth');
      }
    }
  }, [isLoading, isAuthenticated]);

  // Show loading screen
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <PaperProvider theme={MD3LightTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ProfileProvider>
          <LocationPermissionHandlerWrapper />
          <Stack>
            <Stack.Screen 
              name="(tabs)" 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="auth" 
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="index" 
              options={{
                headerShown: false,
              }}
            />

          </Stack>
        </ProfileProvider>
      </GestureHandlerRootView>
    </PaperProvider>
  );
}
