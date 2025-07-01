import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { ProfileProvider } from './contexts/ProfileContext';
'../assets/images/heart.lottie';

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
            router.replace('/(tabs)/swipe');
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
        router.replace('/(tabs)/swipe');
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
