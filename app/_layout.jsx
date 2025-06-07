import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';

export default function Layout() {
  const router = useRouter();
  useEffect(() => {
    // Add a small delay to ensure the component is mounted
    const timer = setTimeout(() => {
      router.replace('/auth');
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

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
