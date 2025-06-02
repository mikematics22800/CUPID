import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../context/auth'; // You'll need to create this context

export default function Layout() {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Add a small delay to ensure the navigation container is mounted
    const timeoutId = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      
      if (!isAuthenticated && !inAuthGroup) {
        // Redirect to login if not authenticated
        router.replace('/auth');
      } else if (isAuthenticated && inAuthGroup) {
        // Redirect to home if authenticated and trying to access auth screens
        router.replace('/(tabs)');
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, segments]);

  return (
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
    </Stack>
  );
}
