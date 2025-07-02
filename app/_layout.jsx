import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import LocationPermissionHandler from './components/LocationPermissionHandler';
'../assets/images/heart.lottie';

// Component to handle location permission on first launch
function LocationPermissionHandlerWrapper() {
  const { isLocationSharingEnabled, updateProfile } = useProfile();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasShownLocationModal, setHasShownLocationModal] = useState(false);

  useEffect(() => {
    // Show location permission modal if user is authenticated, has completed profile, 
    // location sharing is not enabled, and we haven't shown the modal yet
    if (isLocationSharingEnabled() === false && !hasShownLocationModal) {
      // Add a small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        setShowLocationModal(true);
        setHasShownLocationModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLocationSharingEnabled, hasShownLocationModal]);

  const handleLocationEnabled = async (locationData) => {
    try {
      await updateProfile({ geolocation: locationData.geolocation });
      setShowLocationModal(false);
    } catch (error) {
      console.error('Error updating profile with location:', error);
      setShowLocationModal(false);
    }
  };

  const handleLocationDisabled = () => {
    setShowLocationModal(false);
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
            router.replace('/(tabs)/everyone');
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
        router.replace('/(tabs)/everyone');
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
