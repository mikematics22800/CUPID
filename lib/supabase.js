import { AppState, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY

// Enhanced error logging utility
export const logSupabaseError = (operation, error, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    operation,
    error: {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      status: error?.status,
    },
    additionalData,
    stack: error?.stack,
  };

  console.error('🔴 Supabase Error Log:', JSON.stringify(errorLog, null, 2));
  
  // Log specific error types
  if (error?.code === '42501') {
    console.error('🚫 RLS Policy Violation - Check your Row Level Security policies');
    console.error('💡 Common causes:');
    console.error('   - User not authenticated');
    console.error('   - Missing RLS policy for INSERT operations');
    console.error('   - Policy conditions not met');
  }
  
  if (error?.code === '23505') {
    console.error('🔑 Unique Constraint Violation - Duplicate key value');
  }
  
  if (error?.code === '42P01') {
    console.error('📋 Table does not exist - Check table name and schema');
  }
  
  if (error?.code === '42703') {
    console.error('📝 Column does not exist - Check column names');
  }

  return errorLog;
};

// Enhanced success logging utility
export const logSupabaseSuccess = (operation, data, additionalData = {}) => {
  const timestamp = new Date().toISOString();
  const successLog = {
    timestamp,
    operation,
    data: data ? 'Success' : 'No data returned',
    additionalData,
  };

  console.log('🟢 Supabase Success Log:', JSON.stringify(successLog, null, 2));
  return successLog;
};

// Wrapper function for database operations with enhanced logging
export const executeWithLogging = async (operation, supabaseCall) => {
  try {
    console.log(`🔄 Starting operation: ${operation}`);
    const result = await supabaseCall();
    
    if (result.error) {
      logSupabaseError(operation, result.error, { 
        data: result.data,
        operation: operation 
      });
    } else {
      logSupabaseSuccess(operation, result.data, { 
        operation: operation 
      });
    }
    
    return result;
  } catch (error) {
    logSupabaseError(operation, error, { 
      operation: operation,
      errorType: 'Unexpected error'
    });
    throw error;
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export const uploadPhotosToStorage = async (photos, userId) => {
  const uploadedUrls = [];
  
  // Verify user authentication first
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !currentUser) {
    console.error('❌ Authentication error:', authError);
    throw new Error('User not authenticated. Please log in again.');
  }
  
  if (currentUser.id !== userId) {
    console.error('❌ User ID mismatch:', { currentUserId: currentUser.id, requestedUserId: userId });
    throw new Error('Authentication mismatch. Please try again.');
  }
  
  console.log('✅ User authenticated successfully:', currentUser.id);
  
  // Create a unique folder for this user's photos
  const userFolder = `${userId}`;
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${userFolder}/photo_${i + 1}_${Date.now()}.jpg`;
    
    try {
      console.log(`📤 Uploading photo ${i + 1}/${photos.length} to ${fileName}`);
      
      // Convert image to blob
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('users')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false // Don't overwrite existing files
        });

      if (error) {
        console.error(`❌ Error uploading photo ${i + 1}:`, error);
        console.error('🔍 Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error,
          statusText: error.statusText
        });
        
        // Check if it's an RLS policy error
        if (error.message?.includes('row-level security policy') || error.statusCode === 403) {
          console.error('🚫 RLS Policy Error - User may not be properly authenticated');
          console.error('💡 Make sure the user has a valid session before uploading');
          console.error('💡 Check that storage policies are properly configured');
          console.error('💡 Current user ID:', currentUser.id);
          console.error('💡 File path:', fileName);
          throw new Error('Authentication required for photo upload. Please check your storage policies and try again.');
        }
        
        throw error;
      }

      console.log(`✅ Successfully uploaded photo ${i + 1} to ${fileName}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('users')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    } catch (error) {
      console.error(`❌ Error in photo upload ${i + 1}:`, error);
      
      // Clean up any previously uploaded photos if one fails
      if (uploadedUrls.length > 0) {
        console.log('🧹 Cleaning up previously uploaded photos due to error...');
        for (let j = 0; j < uploadedUrls.length; j++) {
          try {
            const fileName = `${userFolder}/photo_${j + 1}_${Date.now()}.jpg`;
            await supabase.storage
              .from('users')
              .remove([fileName]);
          } catch (cleanupError) {
            console.error('Failed to cleanup photo:', cleanupError);
          }
        }
      }
      
      throw error;
    }
  }
  
  console.log(`🎉 Successfully uploaded all ${photos.length} photos for user ${userId}`);
  return uploadedUrls;
};

export async function register(firstName, lastName, phone, email, sex, birthday, password, onBack, setLoading) {
  try {
    setLoading(true);
    
    // First, sign up the user with Supabase Auth - don't create session immediately
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: undefined, // Let Supabase handle the redirect
        data: {
          firstName: firstName,
          lastName: lastName,
          phone: phone,
          sex: sex,
          birthday: birthday.toISOString(),
        }
      }
    });

    if (signUpError) {
      Alert.alert('Registration Error', signUpError.message);
      console.error('Sign up error:', signUpError);
      return;
    }

    if (!user) {
      Alert.alert('Registration Error', 'Failed to create account. Please try again.');
      return;
    }

    console.log('✅ User created successfully:', user.id);

    // Store user data for profile creation after email verification
    const userData = {
      firstName,
      lastName,
      phone,
      email,
      sex,
      birthday: birthday.toISOString(),
    };
    
    await AsyncStorage.setItem('registrationData', JSON.stringify(userData));

    // Show success message with email verification instructions
    Alert.alert(
      'Registration Almost Complete!',
      'Please check your email and verify your account before logging in.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to welcome screen after user acknowledges the message
            onBack();
          }
        }
      ]
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'An unexpected error occurred during registration.';
    
    if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.message?.includes('email')) {
      errorMessage = 'Email already exists. Please use a different email address.';
    } else if (error.message?.includes('session')) {
      errorMessage = 'Authentication issue. Please try again or contact support.';
    }
    
    Alert.alert('Registration Error', errorMessage);
  } finally {
    setLoading(false);
  }
}