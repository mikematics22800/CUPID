import { AppState, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import * as Location from 'expo-location'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY

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

  // Only log critical operations
  if (operation.includes('auth') || operation.includes('error')) {
    console.log('🟢 Supabase Success Log:', JSON.stringify(successLog, null, 2));
  }
  return successLog;
};

// Wrapper function for database operations with enhanced logging
export const executeWithLogging = async (operation, supabaseCall) => {
  try {
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

export const supabase = createClient(url, key, {
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

export const createUserProfile = async (userId, userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          name: userData.firstName + ' ' + userData.lastName,
          birthday: new Date(userData.birthday),
          sex: userData.sex,
          email: userData.email,
          phone: userData.phone,
          geolocation: userData.geolocation || null, // Include geolocation if provided
          strikes: 0,
          status: 'active',
          created_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
}

export const createLikesTable = async (userId) => {
  const { data, error } = await supabase
    .from('likes')
    .insert([{ 
      id: userId,
      likes: []
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating likes table:', error);
    throw error;
  }

  return data;
}

export const createMatchesTable = async (userId) => {
  const { data, error } = await supabase
    .from('matches')
    .insert([{ 
      id: userId,
      matches: []
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating matches table:', error);
    throw error;
  }
  return data;
}

export async function signInWithEmail(email, password, setLoading) {
  try {
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      // Check if the error is due to email not being confirmed
      if (error.message?.includes('Email not confirmed') || error.message?.includes('not confirmed')) {
        Alert.alert(
          'Email Not Verified', 
          'Please check your email and click the verification link before logging in.',
          [
            {
              text: 'Resend Email',
              onPress: async () => {
                try {
                  const { error: resendError } = await supabase.auth.resend({
                    type: 'signup',
                    email: email,
                  });
                  if (resendError) {
                    Alert.alert('Error', 'Failed to resend verification email.');
                  } else {
                    Alert.alert('Success', 'Verification email sent! Please check your inbox.');
                  }
                } catch (resendError) {
                  Alert.alert('Error', 'Failed to resend verification email.');
                }
              }
            },
            {
              text: 'OK',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Login Error', error.message);
      }
      return;
    }

    if (!user) {
      Alert.alert('Login Error', 'Failed to sign in. Please try again.');
      return;
    }

    // Check if user profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, check if we have registration data
      const registrationData = await AsyncStorage.getItem('registrationData');
      
      if (registrationData) {
        try {
          const userData = JSON.parse(registrationData);
          
          // Create the profile
          await createUserProfile(user.id, userData);
          
          // Create likes and matches tables for the new user
          try {
            await createLikesTable(user.id);
            console.log('✅ Likes table created for user:', user.id);
          } catch (likesError) {
            console.error('❌ Error creating likes table:', likesError);
          }
          
          try {
            await createMatchesTable(user.id);
            console.log('✅ Matches table created for user:', user.id);
          } catch (matchesError) {
            console.error('❌ Error creating matches table:', matchesError);
          }
          
          // Clear the registration data
          await AsyncStorage.removeItem('registrationData');
          
          Alert.alert('Success', 'Profile created successfully! Welcome to CUPID!');
        } catch (profileCreationError) {
          console.error('Error creating profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      } else {
        // No registration data found, create a basic profile
        try {
          await createUserProfile(user.id, {
            firstName: user.user_metadata?.firstName || 'User',
            lastName: user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone || '',
            email: user.email,
            sex: user.user_metadata?.sex || null,
            birthday: user.user_metadata?.birthday || new Date().toISOString(),
            bio: user.user_metadata?.bio || '',
          });
          
          // Create likes and matches tables for the new user
          try {
            await createLikesTable(user.id);
            console.log('✅ Likes table created for user:', user.id);
          } catch (likesError) {
            console.error('❌ Error creating likes table:', likesError);
          }
          
          try {
            await createMatchesTable(user.id);
            console.log('✅ Matches table created for user:', user.id);
          } catch (matchesError) {
            console.error('❌ Error creating matches table:', matchesError);
          }
          
        } catch (profileCreationError) {
          console.error('Error creating basic profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      }
    } else if (profileError) {
      console.error('Error checking profile:', profileError);
    }

    // Update geolocation on login only if location sharing is enabled
    try {
      // Check if user has location sharing enabled (geolocation is not null)
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('geolocation')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('❌ Error checking user profile for geolocation:', profileError);
      } else if (userProfile && userProfile.geolocation !== null) {
        console.log('📍 Updating geolocation on login (location sharing enabled)');
        const location = await getCurrentLocationAndresidence();
        if (location) {
          console.log('✅ Geolocation updated on login:', location.geolocation);
          const { error: updateError } = await supabase
            .from('users')
            .update({ geolocation: location.geolocation })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('❌ Error updating geolocation on login:', updateError);
          } else {
            console.log('✅ User geolocation updated in database on login');
          }
        } else {
          console.log('⚠️ No location data available on login');
        }
      } else {
        console.log('📍 Location sharing disabled, skipping geolocation update on login');
      }
    } catch (locationError) {
      console.error('❌ Error updating geolocation on login:', locationError);
      // Don't block login if geolocation update fails
    }

    // Continue with normal login flow
    
  } catch (error) {
    console.error('Login error:', error);
    Alert.alert('Error', 'An unexpected error occurred during login.');
  } finally {
    if (setLoading) {
      setLoading(false);
    }
  }
}

export async function signInWithPhone(phoneNumber) {
  try {
    // Format phone number to ensure it's in the correct format for Twilio
    let formattedPhone = phoneNumber;
    
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Ensure it starts with +1 for US numbers (adjust for your country)
    if (cleaned.length === 10) {
      formattedPhone = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formattedPhone = `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      formattedPhone = cleaned;
    } else {
      formattedPhone = `+${cleaned}`;
    }
    
    console.log(`📱 Attempting phone login with formatted number: ${formattedPhone}`);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    })
    
    if (error) {
      console.error('Phone login error:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to send verification code.';
      
      if (error.message?.includes('Twilio') || error.message?.includes('20003')) {
        errorMessage = 'SMS service is currently unavailable. Please try email login or contact support.';
      } else if (error.message?.includes('phone')) {
        errorMessage = 'Invalid phone number format. Please enter a valid phone number.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      } else {
        errorMessage = error.message || 'Failed to send verification code.';
      }
      
      Alert.alert('Phone Login Error', errorMessage);
    } else {
      Alert.alert('Success', 'Verification code sent to your phone number!');
      console.log('✅ OTP sent to phone number:', formattedPhone);
    }
  } catch (error) {
    console.error('Unexpected phone login error:', error);
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
  }
}

export const uploadPhotosToStorage = async (photos, userId) => {
  const uploadedUrls = [];
  
  // Verify user authentication first
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !currentUser) {
    console.error('Authentication error:', authError);
    throw new Error('User not authenticated. Please log in again.');
  }
  
  if (currentUser.id !== userId) {
    console.error('User ID mismatch:', { currentUserId: currentUser.id, requestedUserId: userId });
    throw new Error('Authentication mismatch. Please try again.');
  }
  
  console.log('User authenticated successfully:', currentUser.id);
  
  // Create a unique folder for this user's photos
  const userFolder = `${userId}`;
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${userFolder}/photo_${i + 1}_${Date.now()}.jpg`;
    
    try {
      console.log(`Uploading photo ${i + 1}/${photos.length} to ${fileName}`);
      
      // Use direct file upload instead of fetch-blob conversion
      const { data, error } = await supabase.storage
        .from('users/')
        .upload(fileName, {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `photo_${i + 1}.jpg`
        }, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error(`Error uploading photo ${i + 1}:`, error);
        
        // Check if it's an RLS policy error
        if (error.message?.includes('row-level security policy') || error.statusCode === 403) {
          throw new Error('Authentication required for photo upload. Please check your storage policies and try again.');
        }
        
        throw error;
      }

      console.log(`Successfully uploaded photo ${i + 1} to ${fileName}`);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('users')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    } catch (error) {
      console.error(`Error in photo upload ${i + 1}:`, error);
      
      // Clean up any previously uploaded photos if one fails
      if (uploadedUrls.length > 0) {
        console.log('Cleaning up previously uploaded photos due to error...');
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
  
  // Note: Database update is handled by the calling function (profile.jsx)
  // This prevents double-updating the images array
  console.log(`📝 Uploaded ${uploadedUrls.length} photos to storage. Database update will be handled by profile save function.`);
  
  console.log(`Successfully uploaded all ${photos.length} photos for user ${userId}`);
  return uploadedUrls;
};

export async function register(firstName, lastName, phone, email, sex, birthday, password, onBack, setLoading, onRegistrationSuccess) {
  try {
    setLoading(true);
    
    // Format phone number for consistency
    let formattedPhone = phone;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      formattedPhone = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formattedPhone = `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      formattedPhone = cleaned;
    } else {
      formattedPhone = `+${cleaned}`;
    }
    
    console.log(`📝 Starting dual verification registration for: ${email} and ${formattedPhone}`);
    
    // Don't request location during registration - let user choose later
    let geolocation = null;
    console.log('📍 Location sharing disabled by default - user can enable later in settings');
    
    // First, sign up the user with Supabase Auth - don't create session immediately
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: email,
      password: password,
      phone: formattedPhone,
      options: {
        emailRedirectTo: undefined, // Let Supabase handle the redirect
        data: {
          firstName: firstName,
          lastName: lastName,
          phone: formattedPhone,
          sex: sex,
          birthday: birthday.toISOString(),
        }
      }
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      
      // Provide more specific error messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (signUpError.message?.includes('email')) {
        errorMessage = 'Email already exists. Please use a different email address.';
      } else if (signUpError.message?.includes('phone')) {
        errorMessage = 'Phone number already exists. Please use a different phone number.';
      } else if (signUpError.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (signUpError.message?.includes('Twilio') || signUpError.message?.includes('20003')) {
        errorMessage = 'SMS service is currently unavailable. Please try again later or contact support.';
      } else {
        errorMessage = signUpError.message || 'Registration failed. Please try again.';
      }
      
      Alert.alert('Registration Error', errorMessage);
      return;
    }

    if (!user) {
      Alert.alert('Registration Error', 'Failed to create account. Please try again.');
      return;
    }

    console.log('✅ User created successfully:', user.id);

    // Store user data for profile creation after verification
    const userData = {
      firstName,
      lastName,
      phone: formattedPhone,
      email,
      sex,
      birthday: birthday.toISOString(),
      geolocation: geolocation, // Include geolocation in registration data
    };
    
    await AsyncStorage.setItem('registrationData', JSON.stringify(userData));

    // Call the success callback with email and phone for verification
    if (onRegistrationSuccess) {
      onRegistrationSuccess(email, formattedPhone);
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'An unexpected error occurred during registration.';
    
    if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    } else if (error.message?.includes('email')) {
      errorMessage = 'Email already exists. Please use a different email address.';
    } else if (error.message?.includes('phone')) {
      errorMessage = 'Phone number already exists. Please use a different phone number.';
    } else if (error.message?.includes('session')) {
      errorMessage = 'Authentication issue. Please try again or contact support.';
    }
    
    Alert.alert('Registration Error', errorMessage);
  } finally {
    setLoading(false);
  }
}

// New function to verify both email and phone simultaneously
export async function verifyRegistration(emailCode, phoneCode, onSuccess, setLoading) {
  try {
    setLoading(true);
    
    console.log('🔐 Starting dual verification process');
    
    // Verify email first
    const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
      email: emailCode.email,
      token: emailCode.token,
      type: 'email'
    });
    
    if (emailError) {
      console.error('Email verification error:', emailError);
      Alert.alert('Verification Error', 'Email verification failed. Please check your email and try again.');
      return;
    }
    
    console.log('✅ Email verified successfully');
    
    // Verify phone number
    const { data: phoneData, error: phoneError } = await supabase.auth.verifyOtp({
      phone: phoneCode.phone,
      token: phoneCode.token,
      type: 'sms'
    });
    
    if (phoneError) {
      console.error('Phone verification error:', phoneError);
      Alert.alert('Verification Error', 'Phone verification failed. Please check your SMS and try again.');
      return;
    }
    
    console.log('✅ Phone verified successfully');
    
    // Both verifications successful
    Alert.alert(
      'Verification Complete!',
      'Both your email and phone number have been verified successfully. You can now log in.',
      [
        {
          text: 'Login Now',
          onPress: () => {
            onSuccess();
          }
        }
      ]
    );
    
  } catch (error) {
    console.error('Verification error:', error);
    Alert.alert('Verification Error', 'An unexpected error occurred during verification. Please try again.');
  } finally {
    setLoading(false);
  }
}

// Function to create a match between two users
export const createMatch = async (user1Id, user2Id) => {
  try {
    // Update matches for user1
    const { data: user1MatchesRecord, error: user1Error } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', user1Id)
      .single();

    let user1Matches = [];
    if (user1MatchesRecord && user1MatchesRecord.matches) {
      if (typeof user1MatchesRecord.matches === 'string') {
        try {
          user1Matches = JSON.parse(user1MatchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse user1 matches as JSON:', parseError);
          user1Matches = [];
        }
      } else if (Array.isArray(user1MatchesRecord.matches)) {
        user1Matches = user1MatchesRecord.matches;
      }
    }

    // Add user2 to user1's matches if not already there
    if (!user1Matches.includes(user2Id)) {
      user1Matches.push(user2Id);
      
      let user1UpdateResult;
      if (user1MatchesRecord) {
        user1UpdateResult = await supabase
          .from('matches')
          .update({ matches: user1Matches })
          .eq('id', user1Id)
          .select('matches')
          .single();
      } else {
        user1UpdateResult = await supabase
          .from('matches')
          .insert({
            id: user1Id,
            matches: user1Matches
          })
          .select('matches')
          .single();
      }

      if (user1UpdateResult.error) {
        console.error('❌ Error updating user1 matches:', user1UpdateResult.error);
        throw user1UpdateResult.error;
      }
    }

    // Update matches for user2
    const { data: user2MatchesRecord, error: user2Error } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', user2Id)
      .single();

    let user2Matches = [];
    if (user2MatchesRecord && user2MatchesRecord.matches) {
      if (typeof user2MatchesRecord.matches === 'string') {
        try {
          user2Matches = JSON.parse(user2MatchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse user2 matches as JSON:', parseError);
          user2Matches = [];
        }
      } else if (Array.isArray(user2MatchesRecord.matches)) {
        user2Matches = user2MatchesRecord.matches;
      }
    }

    // Add user1 to user2's matches if not already there
    if (!user2Matches.includes(user1Id)) {
      user2Matches.push(user1Id);
      
      let user2UpdateResult;
      if (user2MatchesRecord) {
        user2UpdateResult = await supabase
          .from('matches')
          .update({ matches: user2Matches })
          .eq('id', user2Id)
          .select('matches')
          .single();
      } else {
        user2UpdateResult = await supabase
          .from('matches')
          .insert({
            id: user2Id,
            matches: user2Matches
          })
          .select('matches')
          .single();
      }

      if (user2UpdateResult.error) {
        console.error('❌ Error updating user2 matches:', user2UpdateResult.error);
        throw user2UpdateResult.error;
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Error creating match:', error);
    throw error;
  }
};

// Function to handle user likes
export const handleUserLike = async (likedUserId) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Add liked user to current user's likes array
    const { data: existingLikeRecord, error: fetchError } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', currentUser.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching current user likes record:', fetchError);
      throw fetchError;
    }

    let currentUserLikes = [];
    if (existingLikeRecord && existingLikeRecord.likes) {
      if (typeof existingLikeRecord.likes === 'string') {
        try {
          currentUserLikes = JSON.parse(existingLikeRecord.likes);
        } catch (parseError) {
          console.error('❌ Failed to parse current user likes as JSON:', parseError);
          currentUserLikes = [];
        }
      } else if (Array.isArray(existingLikeRecord.likes)) {
        currentUserLikes = existingLikeRecord.likes;
      }
    }

    // Check if liked user is already in current user's likes array
    if (currentUserLikes.includes(likedUserId)) {
      return { success: true, alreadyLiked: true };
    }

    // Add liked user's ID to current user's likes array
    const updatedCurrentUserLikes = [...currentUserLikes, likedUserId];

    let updateResult;
    if (existingLikeRecord) {
      // Update existing record
      updateResult = await supabase
        .from('likes')
        .update({ likes: updatedCurrentUserLikes })
        .eq('id', currentUser.id)
        .select('likes')
        .single();
    } else {
      // Create new record
      updateResult = await supabase
        .from('likes')
        .insert({
          id: currentUser.id,
          likes: updatedCurrentUserLikes
        })
        .select('likes')
        .single();
    }

    if (updateResult.error) {
      console.error('❌ Error updating current user\'s likes:', updateResult.error);
      throw updateResult.error;
    }
    
    // Check if this creates a mutual match (only if the liked user has also liked the current user)
    const isMatch = await checkForMatch(currentUser.id, likedUserId);
    
    // If it's a match, create the match and remove from likes
    if (isMatch) {
      try {
        // Create the match in the matches table
        await createMatch(currentUser.id, likedUserId);
        
        // Remove both users from each other's likes arrays
        await removeFromLikes(currentUser.id, likedUserId);
        
      } catch (matchError) {
        console.error('❌ Error creating match or removing from likes:', matchError);
        // Don't throw here, the like was still successful
      }
    }
    
    return { 
      success: true, 
      alreadyLiked: false, 
      isMatch: isMatch 
    };

  } catch (error) {
    console.error('❌ Error in handleUserLike:', error);
    throw error;
  }
};

// Function to remove both users from each other's likes arrays when they match
export const removeFromLikes = async (user1Id, user2Id) => {
  try {
    // Remove user2 from user1's likes
    const { data: user1LikesRecord, error: user1Error } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', user1Id)
      .single();

    if (!user1Error && user1LikesRecord && user1LikesRecord.likes) {
      let user1Likes = [];
      if (typeof user1LikesRecord.likes === 'string') {
        try {
          user1Likes = JSON.parse(user1LikesRecord.likes);
        } catch (parseError) {
          console.error('❌ Failed to parse user1 likes as JSON:', parseError);
          user1Likes = [];
        }
      } else if (Array.isArray(user1LikesRecord.likes)) {
        user1Likes = user1LikesRecord.likes;
      }

      // Remove user2 from user1's likes
      const updatedUser1Likes = user1Likes.filter(id => id !== user2Id);
      
      if (updatedUser1Likes.length !== user1Likes.length) {
        await supabase
          .from('likes')
          .update({ likes: updatedUser1Likes })
          .eq('id', user1Id);
      }
    }

    // Remove user1 from user2's likes
    const { data: user2LikesRecord, error: user2Error } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', user2Id)
      .single();

    if (!user2Error && user2LikesRecord && user2LikesRecord.likes) {
      let user2Likes = [];
      if (typeof user2LikesRecord.likes === 'string') {
        try {
          user2Likes = JSON.parse(user2LikesRecord.likes);
        } catch (parseError) {
          console.error('❌ Failed to parse user2 likes as JSON:', parseError);
          user2Likes = [];
        }
      } else if (Array.isArray(user2LikesRecord.likes)) {
        user2Likes = user2LikesRecord.likes;
      }

      // Remove user1 from user2's likes
      const updatedUser2Likes = user2Likes.filter(id => id !== user1Id);
      
      if (updatedUser2Likes.length !== user2Likes.length) {
        await supabase
          .from('likes')
          .update({ likes: updatedUser2Likes })
          .eq('id', user2Id);
      }
    }

  } catch (error) {
    console.error('❌ Error removing from likes:', error);
    throw error;
  }
};

// Function to check if two users have matched (mutual likes)
export const checkForMatch = async (user1Id, user2Id) => {
  try {
    // Get both users' like records
    const { data: user1LikesRecord, error: user1Error } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', user1Id)
      .single();

    const { data: user2LikesRecord, error: user2Error } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', user2Id)
      .single();

    // Parse likes arrays for both users
    let user1likes = [];
    let user2likes = [];

    // Handle user1 likes
    if (user1LikesRecord && user1LikesRecord.likes) {
      if (typeof user1LikesRecord.likes === 'string') {
        try {
          user1likes = JSON.parse(user1LikesRecord.likes);
        } catch (e) {
          console.error('❌ Failed to parse user1 likes:', e);
          user1likes = [];
        }
      } else if (Array.isArray(user1LikesRecord.likes)) {
        user1likes = user1LikesRecord.likes;
      }
    }

    // Handle user2 likes
    if (user2LikesRecord && user2LikesRecord.likes) {
      if (typeof user2LikesRecord.likes === 'string') {
        try {
          user2likes = JSON.parse(user2LikesRecord.likes);
        } catch (e) {
          console.error('❌ Failed to parse user2 likes:', e);
          user2likes = [];
        }
      } else if (Array.isArray(user2LikesRecord.likes)) {
        user2likes = user2LikesRecord.likes;
      }
    }

    // Log actual errors (not "not found" errors)
    if (user1Error && user1Error.code !== 'PGRST116') {
      console.error('❌ Error checking user1 likes:', user1Error);
    }
    if (user2Error && user2Error.code !== 'PGRST116') {
      console.error('❌ Error checking user2 likes:', user2Error);
    }

    // Check if both users have liked each other
    const isMatch = user1likes.includes(user2Id) && user2likes.includes(user1Id);

    return isMatch;

  } catch (error) {
    console.error('❌ Error checking for match:', error);
    return false;
  }
};

// Function to get signed URL for a photo (more reliable than public URLs)
export const getSignedPhotoUrl = async (userId) => {
  try {
    console.log(`📸 Getting signed URL for user: ${userId}`);
    
    // List files in the user's storage folder
    const { data: files, error: listError } = await supabase.storage
      .from('users')
      .list(`${userId}/`, {
        limit: 9, // Get more files to find the best one
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (listError) {
      console.error('❌ Error listing files for user:', listError);
      return null;
    }

    if (!files || files.length === 0) {
      console.log(`📭 No photos found for user: ${userId}`);
      return null;
    }

    // Find the first image file (prioritize jpg, then other formats)
    const imageFiles = files.filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i));
    if (imageFiles.length === 0) {
      console.log(`📭 No image files found for user: ${userId}`);
      return null;
    }

    // Sort by name to get a consistent first image
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    const firstPhoto = imageFiles[0];
    const filePath = `${userId}/${firstPhoto.name}`;

    console.log(`📁 Creating signed URL for file: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from('users')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('❌ Error creating signed URL:', error);
      return null;
    }

    console.log(`✅ Successfully created signed URL for: ${filePath}`);
    return data.signedUrl;
  } catch (error) {
    console.error('❌ Error in getSignedPhotoUrl:', error);
    return null;
  }
};

// Function to get user profiles for swiping (excluding current user and already liked users)
export const getSwipeProfiles = async (limit = 10) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get current user's profile to get their interests and geolocation
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('sex, birthday, interests, residence, geolocation')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserSex = currentUserProfile?.sex;
    const currentUserBirthday = currentUserProfile?.birthday;
    const currentUserInterests = currentUserProfile?.interests || [];
    const currentUserResidence = currentUserProfile?.residence;
    const currentUserGeolocation = currentUserProfile?.geolocation;

    // Get user's distance preference from AsyncStorage
    const maxDistance = await AsyncStorage.getItem(`maxDistance_${currentUser.id}`);
    const userMaxDistance = maxDistance ? parseInt(maxDistance) : 50; // Default to 50 miles

    console.log(`📍 User's max distance preference: ${userMaxDistance} miles`);
    console.log(`📍 User's geolocation:`, currentUserGeolocation);

    // Calculate current user's age
    const currentUserAge = currentUserBirthday ? 
      Math.floor((new Date() - new Date(currentUserBirthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

    // Get users that the current user has already liked
    const { data: currentUserLikesRecord, error: likedError } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', currentUser.id)
      .single();

    if (likedError && likedError.code !== 'PGRST116') {
      console.error('❌ Error fetching current user likes:', likedError);
      throw likedError;
    }

    let likedUserIds = [];
    if (currentUserLikesRecord && currentUserLikesRecord.likes) {
      if (typeof currentUserLikesRecord.likes === 'string') {
        try {
          likedUserIds = JSON.parse(currentUserLikesRecord.likes);
        } catch (parseError) {
          console.error('❌ Failed to parse current user likes:', parseError);
          likedUserIds = [];
        }
      } else if (Array.isArray(currentUserLikesRecord.likes)) {
        likedUserIds = currentUserLikesRecord.likes;
      }
    }

    // Build query to get profiles to swipe on
    let query = supabase
      .from('users')
      .select('id, name, bio, birthday, sex, interests, images, residence, geolocation')
      .neq('id', currentUser.id) // Exclude current user
      .limit(limit * 3); // Get more profiles to allow for distance filtering

    // Add basic filtering (you can enhance this based on your requirements)
    if (currentUserSex) {
      // For now, show all users regardless of sex preference
      // You can add more sophisticated filtering here
    }

    const { data: profiles, error } = await query;

    if (error) {
      console.error('❌ Error fetching swipe profiles:', error);
      throw error;
    }

    // Filter out users that the current user has already liked
    const filteredProfiles = profiles.filter(profile => !likedUserIds.includes(profile.id));

    // Process profiles to add age, photo URLs, calculate interest matches, and distance
    const processedProfiles = await Promise.all(
      filteredProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate interest matches
        const profileInterests = profile.interests || [];
        const matchingInterests = currentUserInterests.filter(interest => 
          profileInterests.includes(interest)
        );
        const matchScore = matchingInterests.length;

        // Calculate distance using comprehensive location handling
        const distanceResult = await calculateUserDistance(
          currentUserGeolocation,
          currentUserResidence,
          profile.geolocation,
          profile.residence,
          userMaxDistance
        );
        
        const distance = distanceResult.distance;
        const withinDistance = distanceResult.withinDistance;
        const distanceMethod = distanceResult.distanceMethod;
        
        console.log(`📍 Distance to ${profile.name}: ${distance} miles (method: ${distanceMethod}, max: ${userMaxDistance})`);

        // Check if users are in the same residence (already handled in distance calculation above)
        let sameResidence = false;
        if (currentUserResidence && profile.residence) {
          sameResidence = currentUserResidence === profile.residence;
        }

        // Get all photos from database images array or fallback to storage
        let photoUrls = [];
        if (profile.images && Array.isArray(profile.images) && profile.images.length > 0) {
          photoUrls = profile.images; // Use all images from database
        } else {
          // Fallback to storage if no images in database
          try {
            const storagePhotoUrl = await getSignedPhotoUrl(profile.id);
            if (storagePhotoUrl) {
              photoUrls = [storagePhotoUrl];
            }
          } catch (photoError) {
            console.error('Error fetching photo for profile:', profile.id, photoError);
          }
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profileInterests,
          matchingInterests: matchingInterests,
          matchScore: matchScore,
          image: photoUrls.length > 0 ? photoUrls[0] : null, // Keep for backward compatibility
          images: photoUrls, // Add all images array
          sex: profile.sex,
          residence: profile.residence || null,
          sameResidence: sameResidence,
          distance: distance,
          withinDistance: withinDistance
        };
      })
    );

    // Filter profiles by distance and sort by match score
    const distanceFilteredProfiles = processedProfiles.filter(profile => profile.withinDistance);
    
    // Sort profiles by match score (highest first) and then limit to requested amount
    const sortedProfiles = distanceFilteredProfiles
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    console.log(`✅ Fetched ${sortedProfiles.length} profiles for swiping (filtered from ${processedProfiles.length} total, ${distanceFilteredProfiles.length} within distance)`);
    console.log(`📍 Distance filtering: ${userMaxDistance} miles max`);
    
    return sortedProfiles;

  } catch (error) {
    console.error('❌ Error in getSwipeProfiles:', error);
    throw error;
  }
};

// Function to get users who liked the current user
export const getUsersWhoLikedMe = async () => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`🔍 Finding users who liked: ${currentUser.id}`);

    // Get current user's profile to get geolocation and residence
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('geolocation, residence')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserGeolocation = currentUserProfile?.geolocation;
    const currentUserResidence = currentUserProfile?.residence;

    // Get user's distance preference from AsyncStorage
    const maxDistance = await AsyncStorage.getItem(`maxDistance_${currentUser.id}`);
    const userMaxDistance = maxDistance ? parseInt(maxDistance) : 50; // Default to 50 miles

    console.log(`📍 User's max distance preference: ${userMaxDistance} miles`);

    // Get all likes records and filter for those that contain the current user's ID
    const { data: allLikesRecords, error: likesError } = await supabase
      .from('likes')
      .select('id, likes');

    if (likesError) {
      console.error('❌ Error fetching likes records:', likesError);
      throw likesError;
    }

    console.log(`📊 Total likes records found: ${allLikesRecords?.length || 0}`);

    // Filter records where the likes array contains the current user's ID
    const usersWhoLikedMe = [];
    
    for (const record of allLikesRecords) {
      if (record.id === currentUser.id) {
        console.log(`⏭️ Skipping current user's own record: ${record.id}`);
        continue; // Skip current user's own record
      }
      
      let likesArray = [];
      if (record.likes) {
        if (typeof record.likes === 'string') {
          try {
            likesArray = JSON.parse(record.likes);
          } catch (parseError) {
            console.error('❌ Failed to parse likes as JSON:', parseError);
            continue;
          }
        } else if (Array.isArray(record.likes)) {
          likesArray = record.likes;
        }
      }
      
      if (likesArray.includes(currentUser.id)) {
        usersWhoLikedMe.push(record.id);
        console.log(`✅ Added user ${record.id} to users who liked me`);
      }
    }

    console.log(`📊 Found ${usersWhoLikedMe.length} users who liked current user`);

    if (usersWhoLikedMe.length === 0) {
      console.log(`📭 No users found who liked current user`);
      return [];
    }

    // Get user profiles for all the users who liked the current user
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, bio, birthday, sex, interests, images, residence, geolocation')
      .in('id', usersWhoLikedMe);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    console.log(`👤 User profiles found:`, userProfiles?.length || 0);

    // Process profiles to add age, photo URLs, and distance
    const processedLikes = await Promise.all(
      userProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance if both users have geolocation data
        let distance = null;
        let withinDistance = true; // Default to true if no geolocation data
        
        if (currentUserGeolocation && profile.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const profileCoords = Array.isArray(profile.geolocation) ? profile.geolocation : JSON.parse(profile.geolocation);
            
            if (currentUserCoords.length === 2 && profileCoords.length === 2) {
              distance = calculateDistance(
                currentUserCoords[0], currentUserCoords[1],
                profileCoords[0], profileCoords[1]
              );
              withinDistance = distance <= userMaxDistance;
              
              console.log(`📍 Distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
            }
          } catch (distanceError) {
            console.error('❌ Error calculating distance:', distanceError);
            withinDistance = true; // If distance calculation fails, include the profile
          }
        } else if (currentUserResidence && profile.residence) {
          // If geolocation is not available, try to calculate distance using residences
          try {
            const { calculateAddressDistance } = await import('./google_maps');
            distance = await calculateAddressDistance(currentUserResidence, profile.residence);
            
            if (distance !== null) {
              withinDistance = distance <= userMaxDistance;
              console.log(`📍 Residence-based distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
            } else {
              // If address distance calculation fails, check if they're in the same residence
              const sameResidence = currentUserResidence === profile.residence;
              if (sameResidence) {
                distance = 0;
                withinDistance = true;
                console.log(`📍 Same residence as ${profile.name}: ${currentUserResidence}`);
              } else {
                console.log(`📍 Could not calculate distance to ${profile.name}, including in results`);
                withinDistance = true; // Include if we can't determine distance
              }
            }
          } catch (addressDistanceError) {
            console.error('❌ Error calculating address distance:', addressDistanceError);
            // Check if they're in the same residence as fallback
            const sameResidence = currentUserResidence === profile.residence;
            if (sameResidence) {
              distance = 0;
              withinDistance = true;
              console.log(`📍 Same residence as ${profile.name}: ${currentUserResidence}`);
            } else {
              console.log(`📍 Could not calculate distance to ${profile.name}, including in results`);
              withinDistance = true; // Include if we can't determine distance
            }
          }
        } else {
          console.log(`📍 No location data available for ${profile.name}, including in results`);
        }

        // Get first photo from database images array or fallback to storage
        let photoUrl = null;
        if (profile.images && Array.isArray(profile.images) && profile.images.length > 0) {
          photoUrl = profile.images[0]; // Use first image from database
        } else {
          // Fallback to storage if no images in database
          try {
            photoUrl = await getSignedPhotoUrl(profile.id);
          } catch (photoError) {
            console.error('Error fetching photo for profile:', profile.id, photoError);
          }
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profile.interests || [],
          image: photoUrl,
          sex: profile.sex,
          residence: profile.residence || null,
          distance: distance,
          withinDistance: withinDistance
        };
      })
    );

    // Filter by distance and sort by distance (closest first)
    const distanceFilteredLikes = processedLikes.filter(like => like.withinDistance);
    const sortedLikes = distanceFilteredLikes.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    console.log(`✅ Successfully processed ${sortedLikes.length} likes (filtered from ${processedLikes.length} total)`);
    console.log(`📍 Distance filtering: ${userMaxDistance} miles max`);
    return sortedLikes;

  } catch (error) {
    console.error('❌ Error in getUsersWhoLikedMe:', error);
    throw error;
  }
};

// Function to get matches for the current user
export const getMatchesForUser = async () => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`🔍 Finding matches for user: ${currentUser.id}`);

    // Get current user's profile to get geolocation
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('geolocation')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserGeolocation = currentUserProfile?.geolocation;

    // Get the matches record for the current user
    const { data: matchesRecord, error: matchesError } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', currentUser.id)
      .single();

    if (matchesError && matchesError.code !== 'PGRST116') {
      console.error('❌ Error fetching matches record:', matchesError);
      throw matchesError;
    }

    let matchedUserIds = [];
    if (matchesRecord && matchesRecord.matches) {
      if (typeof matchesRecord.matches === 'string') {
        try {
          matchedUserIds = JSON.parse(matchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse matches as JSON:', parseError);
          matchedUserIds = [];
        }
      } else if (Array.isArray(matchesRecord.matches)) {
        matchedUserIds = matchesRecord.matches;
      }
    }

    console.log(`📊 Found ${matchedUserIds.length} matched user IDs`);

    if (matchedUserIds.length === 0) {
      return [];
    }

    // Get user profiles for all matched users
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, bio, birthday, sex, interests, images, residence, geolocation')
      .in('id', matchedUserIds);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    // Process profiles to add age, photo URLs, and distance
    const processedMatches = await Promise.all(
      userProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance if both users have geolocation data
        let distance = null;
        
        if (currentUserGeolocation && profile.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const profileCoords = Array.isArray(profile.geolocation) ? profile.geolocation : JSON.parse(profile.geolocation);
            
            if (currentUserCoords.length === 2 && profileCoords.length === 2) {
              distance = calculateDistance(
                currentUserCoords[0], currentUserCoords[1],
                profileCoords[0], profileCoords[1]
              );
              
              console.log(`📍 Distance to match ${profile.name}: ${distance} miles`);
            }
          } catch (distanceError) {
            console.error('❌ Error calculating distance for match:', distanceError);
          }
        }

        // Get first photo from database images array or fallback to storage
        let photoUrl = null;
        if (profile.images && Array.isArray(profile.images) && profile.images.length > 0) {
          photoUrl = profile.images[0]; // Use first image from database
        } else {
          // Fallback to storage if no images in database
          try {
            photoUrl = await getSignedPhotoUrl(profile.id);
          } catch (photoError) {
            console.error('Error fetching photo for match:', profile.id, photoError);
          }
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profile.interests || [],
          photo: photoUrl,
          residence: profile.residence || null,
          distance: distance,
          lastMessage: 'Start a conversation!',
          timestamp: 'Just matched!'
        };
      })
    );

    // Sort matches by distance (closest first)
    const sortedMatches = processedMatches.sort((a, b) => {
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    console.log(`✅ Successfully processed ${sortedMatches.length} matches`);
    return sortedMatches;

  } catch (error) {
    console.error('❌ Error in getMatchesForUser:', error);
    throw error;
  }
};

// Function to discard a like (remove liked user from current user's likes array)
export const discardLike = async (discardedUserId) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`🗑️ User ${currentUser.id} is discarding like from user ${discardedUserId}`);

    // Get the current user's likes record
    const { data: currentUserLikesRecord, error: fetchError } = await supabase
      .from('likes')
      .select('likes')
      .eq('id', currentUser.id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching current user likes record:', fetchError);
      if (fetchError.code === 'PGRST116') {
        console.log('📝 No likes record found for current user, creating one');
        // Create a new record with empty likes array
        const { data: insertResult, error: insertError } = await supabase
          .from('likes')
          .insert({
            id: currentUser.id,
            likes: []
          })
          .select('likes')
          .single();
        
        if (insertError) {
          console.error('❌ Error creating likes record:', insertError);
          throw insertError;
        }
        
        console.log('✅ Created empty likes record for current user');
        return { success: true, alreadyDiscarded: true };
      }
      throw fetchError;
    }

    let currentUserLikes = [];
    if (currentUserLikesRecord && currentUserLikesRecord.likes) {
      if (typeof currentUserLikesRecord.likes === 'string') {
        try {
          currentUserLikes = JSON.parse(currentUserLikesRecord.likes);
        } catch (parseError) {
          console.error('❌ Failed to parse current user likes as JSON:', parseError);
          currentUserLikes = [];
        }
      } else if (Array.isArray(currentUserLikesRecord.likes)) {
        currentUserLikes = currentUserLikesRecord.likes;
      }
    }

    console.log(`📊 Current user's likes array:`, currentUserLikes);
    console.log(`🔍 Discarded user ID ${discardedUserId} in likes array:`, currentUserLikes.includes(discardedUserId));

    // Check if discarded user is in current user's likes list
    if (!currentUserLikes.includes(discardedUserId)) {
      console.log('⚠️ Discarded user not in current user\'s likes list, nothing to discard');
      return { success: true, alreadyDiscarded: true };
    }

    // Remove discarded user's ID from current user's likes array
    const updatedLikes = currentUserLikes.filter(id => id !== discardedUserId);
    console.log(`📝 Updated current user's likes array:`, updatedLikes);

    // Update the current user's likes record
    const { data: updateResult, error: updateError } = await supabase
      .from('likes')
      .update({ likes: updatedLikes })
      .eq('id', currentUser.id)
      .select('likes')
      .single();

    if (updateError) {
      console.error('❌ Error updating current user likes:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully updated current user's likes record:`, updateResult);
    console.log(`✅ Successfully removed user ${discardedUserId} from current user's likes`);
    
    return { 
      success: true, 
      alreadyDiscarded: false 
    };

  } catch (error) {
    console.error('❌ Error in discardLike:', error);
    throw error;
  }
};

// Function to unmatch users (remove from matches)
export const unmatchUsers = async (user1Id, user2Id) => {
  try {
    // Remove user2 from user1's matches
    const { data: user1MatchesRecord, error: user1Error } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', user1Id)
      .single();

    if (!user1Error && user1MatchesRecord && user1MatchesRecord.matches) {
      let user1Matches = [];
      if (typeof user1MatchesRecord.matches === 'string') {
        try {
          user1Matches = JSON.parse(user1MatchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse user1 matches as JSON:', parseError);
          user1Matches = [];
        }
      } else if (Array.isArray(user1MatchesRecord.matches)) {
        user1Matches = user1MatchesRecord.matches;
      }

      // Remove user2 from user1's matches
      const updatedUser1Matches = user1Matches.filter(id => id !== user2Id);
      
      if (updatedUser1Matches.length !== user1Matches.length) {
        await supabase
          .from('matches')
          .update({ matches: updatedUser1Matches })
          .eq('id', user1Id);
      }
    }

    // Remove user1 from user2's matches
    const { data: user2MatchesRecord, error: user2Error } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', user2Id)
      .single();

    if (!user2Error && user2MatchesRecord && user2MatchesRecord.matches) {
      let user2Matches = [];
      if (typeof user2MatchesRecord.matches === 'string') {
        try {
          user2Matches = JSON.parse(user2MatchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse user2 matches as JSON:', parseError);
          user2Matches = [];
        }
      } else if (Array.isArray(user2MatchesRecord.matches)) {
        user2Matches = user2MatchesRecord.matches;
      }

      // Remove user1 from user2's matches
      const updatedUser2Matches = user2Matches.filter(id => id !== user1Id);
      
      if (updatedUser2Matches.length !== user2Matches.length) {
        await supabase
          .from('matches')
          .update({ matches: updatedUser2Matches })
          .eq('id', user2Id);
      }
    }

    // Delete chat room and messages between the two users
    try {
      // Find the chat room between these two users
      const { data: chatRoom, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .single();

      if (!chatError && chatRoom) {
        // Delete all messages in this chat room
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .eq('room_id', chatRoom.id);

        if (messagesError) {
          console.error('❌ Error deleting chat messages:', messagesError);
        }

        // Delete the chat room itself
        const { error: deleteChatError } = await supabase
          .from('chats')
          .delete()
          .eq('id', chatRoom.id);

        if (deleteChatError) {
          console.error('❌ Error deleting chat room:', deleteChatError);
        }
      }
    } catch (chatDeleteError) {
      console.error('❌ Error deleting chat data:', chatDeleteError);
      // Don't throw here, as the unmatch was successful
    }

    return true;

  } catch (error) {
    console.error('❌ Error unmatching users:', error);
    throw error;
  }
};

// ===== CHAT FUNCTIONS =====

// Function to get or create a chat room between two users
export const getOrCreateChatRoom = async (user1Id, user2Id) => {
  try {
    console.log(`🏠 Getting or creating chat room between users ${user1Id} and ${user2Id}`);
    
    // First, try to find an existing chat room between these two users
    const { data: existingRoom, error: findError } = await supabase
      .from('chats')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding existing chat room:', findError);
      throw findError;
    }

    if (existingRoom) {
      console.log(`✅ Found existing chat room: ${existingRoom.id}`);
      return existingRoom.id;
    }

    // If no existing room, create a new one
    console.log(`📝 Creating new chat room between users ${user1Id} and ${user2Id}`);
    const { data: newRoom, error: createError } = await supabase
      .from('chats')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating new chat room:', createError);
      throw createError;
    }

    console.log(`✅ Created new chat room: ${newRoom.id}`);
    return newRoom.id;
  } catch (error) {
    console.error('❌ Error in getOrCreateChatRoom:', error);
    throw error;
  }
};

// Function to send a message
export const sendMessage = async (roomId, content, messageType = 'text') => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: currentUser.id,
        content: content,
        message_type: messageType
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }

    // Get current user's name for the response
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('id', currentUser.id)
      .single();

    // Format the message to match the structure expected by the chat component
    const formattedMessage = {
      id: data.id,
      content: data.content,
      message_type: data.message_type,
      is_read: data.is_read,
      created_at: data.created_at,
      sender_id: data.sender_id,
      sender_name: userProfile?.name || 'You'
    };

    return formattedMessage;
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    throw error;
  }
};

// Function to get messages for a chat room
export const getMessages = async (roomId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get all unique sender IDs
    const senderIds = [...new Set(data.map(message => message.sender_id))];

    // Get user profiles for all senders
    const { data: userProfiles, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', senderIds);

    if (usersError) {
      console.error('❌ Error fetching user profiles:', usersError);
      throw usersError;
    }

    // Create a map of user IDs to user profiles
    const userMap = {};
    userProfiles.forEach(user => {
      userMap[user.id] = user;
    });

    // Process messages to include sender information
    const processedMessages = data.map(message => ({
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      is_read: message.is_read,
      created_at: message.created_at,
      sender_id: message.sender_id,
      sender_name: userMap[message.sender_id]?.name || 'Unknown User'
    }));

    // Reverse the array to show oldest messages first
    const messages = processedMessages.reverse();
    return messages;
  } catch (error) {
    console.error('❌ Error in getMessages:', error);
    throw error;
  }
};

// Function to mark messages as read
export const markMessagesAsRead = async (roomId) => {
  try {
    console.log(`👁️ Marking messages as read in room ${roomId}`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('room_id', roomId)
      .neq('sender_id', currentUser.id)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Error marking messages as read:', error);
      throw error;
    }

    console.log(`✅ Marked messages as read`);
    return data;
  } catch (error) {
    console.error('❌ Error in markMessagesAsRead:', error);
    throw error;
  }
};

// Function to get chat rooms for current user
export const getChatRooms = async () => {
  try {
    console.log(`🏠 Fetching chat rooms for current user`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get chat rooms for current user
    const { data: chatRooms, error: roomsError } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .order('updated_at', { ascending: false });

    if (roomsError) {
      console.error('❌ Error fetching chat rooms:', roomsError);
      throw roomsError;
    }

    if (!chatRooms || chatRooms.length === 0) {
      console.log('✅ No chat rooms found');
      return [];
    }

    // Get all unique user IDs from the chat rooms
    const userIds = new Set();
    chatRooms.forEach(room => {
      userIds.add(room.user1_id);
      userIds.add(room.user2_id);
    });

    // Get user profiles for all users in chat rooms
    const { data: userProfiles, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', Array.from(userIds));

    if (usersError) {
      console.error('❌ Error fetching user profiles:', usersError);
      throw usersError;
    }

    // Create a map of user IDs to user profiles
    const userMap = {};
    userProfiles.forEach(user => {
      userMap[user.id] = user;
    });

    // Get last messages for all chat rooms
    const roomIds = chatRooms.map(room => room.id);
    const { data: lastMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .in('room_id', roomIds)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('❌ Error fetching last messages:', messagesError);
      throw messagesError;
    }

    // Create a map of room IDs to their last message
    const lastMessageMap = {};
    lastMessages.forEach(message => {
      if (!lastMessageMap[message.room_id] || 
          new Date(message.created_at) > new Date(lastMessageMap[message.room_id].created_at)) {
        lastMessageMap[message.room_id] = message;
      }
    });

    // Process chat rooms to get the other user's info and last message
    const processedRooms = chatRooms.map(room => {
      const otherUserId = room.user1_id === currentUser.id ? room.user2_id : room.user1_id;
      const otherUser = userMap[otherUserId] || { id: otherUserId, name: 'Unknown User' };
      const lastMessage = lastMessageMap[room.id];
      
      return {
        id: room.id,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          messageType: lastMessage.message_type,
          createdAt: lastMessage.created_at,
          isFromMe: lastMessage.sender_id === currentUser.id
        } : null,
        createdAt: room.created_at,
        updatedAt: room.updated_at
      };
    });

    console.log(`✅ Fetched ${processedRooms.length} chat rooms`);
    return processedRooms;
  } catch (error) {
    console.error('❌ Error in getChatRooms:', error);
    throw error;
  }
};

// Function to subscribe to real-time messages
export const subscribeToMessages = (roomId, callback) => {
  console.log(`🔔 Subscribing to messages in room ${roomId}`);
  
  const subscription = supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('📨 New message received:', payload);
        callback(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        console.log('📝 Message updated:', payload);
        callback(payload.new, 'update');
      }
    )
    .subscribe();

  return subscription;
};

// Function to subscribe to chat room updates
export const subscribeToChatRooms = (callback) => {
  console.log(`🔔 Subscribing to chat room updates`);
  
  const subscription = supabase
    .channel('chats')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chats'
      },
      (payload) => {
        console.log('🏠 New chat room created:', payload);
        callback(payload.new, 'insert');
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'chats'
      },
      (payload) => {
        console.log('🏠 Chat room updated:', payload);
        callback(payload.new, 'update');
      }
    )
    .subscribe();

  return subscription;
};

// Function to unsubscribe from real-time updates
export const unsubscribeFromChannel = (subscription) => {
  if (subscription) {
    console.log('🔕 Unsubscribing from channel');
    supabase.removeChannel(subscription);
  }
};

// Function to delete a message (only sender can delete)
export const deleteMessage = async (messageId) => {
  try {
    console.log(`🗑️ Deleting message ${messageId}`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const { data, error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);

    if (error) {
      console.error('❌ Error deleting message:', error);
      throw error;
    }

    console.log(`✅ Message deleted successfully`);
    return data;
  } catch (error) {
    console.error('❌ Error in deleteMessage:', error);
    throw error;
  }
};

// Function to get unread message count for a user
export const getUnreadMessageCount = async () => {
  try {
    console.log(`📊 Getting unread message count`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // First, get all chat room IDs for the current user
    const { data: chatRooms, error: roomsError } = await supabase
      .from('chats')
      .select('id')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

    if (roomsError) {
      console.error('❌ Error getting chat rooms:', roomsError);
      throw roomsError;
    }

    if (!chatRooms || chatRooms.length === 0) {
      console.log('✅ No chat rooms found, unread count: 0');
      return 0;
    }

    // Extract room IDs
    const roomIds = chatRooms.map(room => room.id);

    // Now get unread message count for these rooms
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', currentUser.id)
      .eq('is_read', false)
      .in('room_id', roomIds);

    if (error) {
      console.error('❌ Error getting unread count:', error);
      throw error;
    }

    console.log(`✅ Unread message count: ${count}`);
    return count || 0;
  } catch (error) {
    console.error('❌ Error in getUnreadMessageCount:', error);
    throw error;
  }
};

// Function to get new likes count for the current user
export const getNewLikesCount = async () => {
  try {
    console.log(`💕 Getting new likes count`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get the last viewed timestamp for likes
    const lastViewedLikes = await AsyncStorage.getItem(`likes_viewed_${currentUser.id}`);
    const lastViewedTime = lastViewedLikes ? new Date(lastViewedLikes) : new Date(0);

    // Get all likes records and count how many contain the current user's ID
    const { data: allLikesRecords, error: likesError } = await supabase
      .from('likes')
      .select('id, likes');

    if (likesError) {
      console.error('❌ Error fetching likes records:', likesError);
      throw likesError;
    }

    let newLikesCount = 0;
    
    for (const record of allLikesRecords) {
      if (record.id === currentUser.id) {
        continue; // Skip current user's own record
      }
      
      let likesArray = [];
      if (record.likes) {
        if (typeof record.likes === 'string') {
          try {
            likesArray = JSON.parse(record.likes);
          } catch (parseError) {
            console.error('❌ Failed to parse likes as JSON:', parseError);
            continue;
          }
        } else if (Array.isArray(record.likes)) {
          likesArray = record.likes;
        }
      }
      
      if (likesArray.includes(currentUser.id)) {
        newLikesCount++;
      }
    }

    // If user has never viewed likes before, show all likes as new
    // Otherwise, show 0 since we can't track individual like timestamps
    const finalCount = lastViewedTime.getTime() === 0 ? newLikesCount : 0;

    console.log(`✅ New likes count: ${finalCount}`);
    return finalCount;
  } catch (error) {
    console.error('❌ Error in getNewLikesCount:', error);
    throw error;
  }
};

// Function to get new matches count for the current user
export const getNewMatchesCount = async () => {
  try {
    console.log(`🎉 Getting new matches count`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get the last viewed timestamp for matches
    const lastViewedMatches = await AsyncStorage.getItem(`matches_viewed_${currentUser.id}`);
    const lastViewedTime = lastViewedMatches ? new Date(lastViewedMatches) : new Date(0);

    // Get the matches record for the current user
    const { data: matchesRecord, error: matchesError } = await supabase
      .from('matches')
      .select('matches')
      .eq('id', currentUser.id)
      .single();

    if (matchesError && matchesError.code !== 'PGRST116') {
      console.error('❌ Error fetching matches record:', matchesError);
      throw matchesError;
    }

    let matchedUserIds = [];
    if (matchesRecord && matchesRecord.matches) {
      if (typeof matchesRecord.matches === 'string') {
        try {
          matchedUserIds = JSON.parse(matchesRecord.matches);
        } catch (parseError) {
          console.error('❌ Failed to parse matches as JSON:', parseError);
          matchedUserIds = [];
        }
      } else if (Array.isArray(matchesRecord.matches)) {
        matchedUserIds = matchesRecord.matches;
      }
    }

    // If user has never viewed matches before, show all matches as new
    // Otherwise, show 0 since we can't track individual match timestamps
    const finalCount = lastViewedTime.getTime() === 0 ? matchedUserIds.length : 0;

    console.log(`✅ New matches count: ${finalCount}`);
    return finalCount;
  } catch (error) {
    console.error('❌ Error in getNewMatchesCount:', error);
    throw error;
  }
};

// Function to mark likes as viewed (clear likes badge)
export const markLikesAsViewed = async () => {
  try {
    console.log(`👁️ Marking likes as viewed`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Store the current timestamp as the last viewed time for likes
    const viewedTimestamp = new Date().toISOString();
    await AsyncStorage.setItem(`likes_viewed_${currentUser.id}`, viewedTimestamp);
    
    console.log(`✅ Marked likes as viewed at: ${viewedTimestamp}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error in markLikesAsViewed:', error);
    throw error;
  }
};

// Function to mark matches as viewed (clear matches badge)
export const markMatchesAsViewed = async () => {
  try {
    console.log(`👁️ Marking matches as viewed`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Store the current timestamp as the last viewed time for matches
    const viewedTimestamp = new Date().toISOString();
    await AsyncStorage.setItem(`matches_viewed_${currentUser.id}`, viewedTimestamp);
    
    console.log(`✅ Marked matches as viewed at: ${viewedTimestamp}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error in markMatchesAsViewed:', error);
    throw error;
  }
};

// Function to get current location and geocode to residence
export const getCurrentLocationAndresidence = async () => {
  try {
    console.log(`📍 Getting current location and geocoding to residence`);
    
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Location permission denied');
      return null;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const coordinates = [location.coords.latitude, location.coords.longitude];
    console.log(`📍 Current location: ${coordinates[0]}, ${coordinates[1]}`);

    // Geocode the coordinates to get residence
    const { geocodeCoordinates } = await import('./google_maps');
    const geocodedData = await geocodeCoordinates(coordinates[0], coordinates[1]);
    
    if (geocodedData) {
      console.log('✅ Location geocoded successfully:', geocodedData.locationString);
      return {
        coordinates: coordinates,
        residence: geocodedData.locationString,
        geolocation: coordinates,
        geocodedData: geocodedData
      };
    } else {
      console.log('❌ Failed to geocode location');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting current location:', error);
    return null;
  }
};

// Function to calculate distance between two coordinates using Haversine formula
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  return Math.round(distance);
};

// Function to get user profile data including interests and bio
export const getUserProfileData = async (userId) => {
  try {
    console.log(`👤 Getting profile data for user ${userId}`);
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('id, name, bio, interests, birthday, sex, images, residence')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error getting user profile:', error);
      throw error;
    }

    console.log(`✅ Retrieved profile data for ${profile.name}`);
    return {
      id: profile.id,
      name: profile.name,
      bio: profile.bio || '',
      interests: profile.interests || [],
      birthday: profile.birthday,
      sex: profile.sex,
      images: profile.images || [],
      residence: profile.residence || null
    };
  } catch (error) {
    console.error('❌ Error in getUserProfileData:', error);
    throw error;
  }
};

// Function to get user images from database
export const getUserImages = async (userId) => {
  try {
    console.log(`📸 Getting images for user ${userId}`);
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('images')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error getting user images:', error);
      return [];
    }

    const images = profile?.images || [];
    console.log(`✅ Retrieved ${images.length} images for user ${userId}`);
    return images;
  } catch (error) {
    console.error('❌ Error in getUserImages:', error);
    return [];
  }
};

// Function to delete user account and all associated data
export const deleteUserAccount = async () => {
  try {
    console.log('🗑️ Starting account deletion process');
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const userId = currentUser.id;
    console.log(`🗑️ Deleting account for user: ${userId}`);

    // 1. Delete user's photos from storage
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('users')
        .list(`${userId}/`);

      if (!listError && files && files.length > 0) {
        const fileNames = files.map(file => `${userId}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from('users')
          .remove(fileNames);
        
        if (deleteError) {
          console.error('❌ Error deleting user photos:', deleteError);
        } else {
          console.log('✅ User photos deleted from storage');
        }
      }
    } catch (photoError) {
      console.error('❌ Error handling photo deletion:', photoError);
    }

    // 2. Delete user's likes record
    try {
      const { error: likesError } = await supabase
        .from('likes')
        .delete()
        .eq('id', userId);
      
      if (likesError) {
        console.error('❌ Error deleting likes record:', likesError);
      } else {
        console.log('✅ User likes record deleted');
      }
    } catch (likesError) {
      console.error('❌ Error handling likes deletion:', likesError);
    }

    // 3. Delete user's matches record
    try {
      const { error: matchesError } = await supabase
        .from('matches')
        .delete()
        .eq('id', userId);
      
      if (matchesError) {
        console.error('❌ Error deleting matches record:', matchesError);
      } else {
        console.log('✅ User matches record deleted');
      }
    } catch (matchesError) {
      console.error('❌ Error handling matches deletion:', matchesError);
    }

    // 4. Remove user from other users' likes arrays
    try {
      const { data: allLikesRecords, error: fetchError } = await supabase
        .from('likes')
        .select('id, likes');

      if (!fetchError && allLikesRecords) {
        for (const record of allLikesRecords) {
          if (record.id !== userId && record.likes) {
            let likesArray = [];
            if (typeof record.likes === 'string') {
              try {
                likesArray = JSON.parse(record.likes);
              } catch (parseError) {
                console.error('❌ Failed to parse likes as JSON:', parseError);
                continue;
              }
            } else if (Array.isArray(record.likes)) {
              likesArray = record.likes;
            }

            if (likesArray.includes(userId)) {
              const updatedLikes = likesArray.filter(id => id !== userId);
              await supabase
                .from('likes')
                .update({ likes: updatedLikes })
                .eq('id', record.id);
            }
          }
        }
        console.log('✅ Removed user from other users\' likes arrays');
      }
    } catch (likesUpdateError) {
      console.error('❌ Error updating other users\' likes:', likesUpdateError);
    }

    // 5. Remove user from other users' matches arrays
    try {
      const { data: allMatchesRecords, error: fetchError } = await supabase
        .from('matches')
        .select('id, matches');

      if (!fetchError && allMatchesRecords) {
        for (const record of allMatchesRecords) {
          if (record.id !== userId && record.matches) {
            let matchesArray = [];
            if (typeof record.matches === 'string') {
              try {
                matchesArray = JSON.parse(record.matches);
              } catch (parseError) {
                console.error('❌ Failed to parse matches as JSON:', parseError);
                continue;
              }
            } else if (Array.isArray(record.matches)) {
              matchesArray = record.matches;
            }

            if (matchesArray.includes(userId)) {
              const updatedMatches = matchesArray.filter(id => id !== userId);
              await supabase
                .from('matches')
                .update({ matches: updatedMatches })
                .eq('id', record.id);
            }
          }
        }
        console.log('✅ Removed user from other users\' matches arrays');
      }
    } catch (matchesUpdateError) {
      console.error('❌ Error updating other users\' matches:', matchesUpdateError);
    }

    // 6. Delete chat rooms and messages involving the user
    try {
      // Get chat rooms involving the user
      const { data: chatRooms, error: roomsError } = await supabase
        .from('chats')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!roomsError && chatRooms && chatRooms.length > 0) {
        const roomIds = chatRooms.map(room => room.id);
        
        // Delete messages in these rooms
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('room_id', roomIds);
        
        if (messagesError) {
          console.error('❌ Error deleting messages:', messagesError);
        } else {
          console.log('✅ Chat messages deleted');
        }

        // Delete the chat rooms
        const { error: deleteRoomsError } = await supabase
          .from('chats')
          .delete()
          .in('id', roomIds);
        
        if (deleteRoomsError) {
          console.error('❌ Error deleting chat rooms:', deleteRoomsError);
        } else {
          console.log('✅ Chat rooms deleted');
        }
      }
    } catch (chatError) {
      console.error('❌ Error handling chat deletion:', chatError);
    }

    // 7. Delete user profile
    try {
      const { error: profileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('❌ Error deleting user profile:', profileError);
      } else {
        console.log('✅ User profile deleted');
      }
    } catch (profileError) {
      console.error('❌ Error handling profile deletion:', profileError);
    }

    // 8. Finally, delete the user account from Supabase Auth
    try {
      // Since we can't use admin.deleteUser from client, we'll sign out the user
      // and the account deletion will be handled by the backend or user will need to contact support
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Error signing out user:', signOutError);
      } else {
        console.log('✅ User signed out successfully');
      }
      
      // Note: Complete account deletion from Supabase Auth requires admin privileges
      // The user should contact support or use the Supabase dashboard to completely delete their account
      console.log('ℹ️ User data has been removed. For complete account deletion, please contact support.');
      
    } catch (authDeleteError) {
      console.error('❌ Error in auth cleanup:', authDeleteError);
      // As a fallback, sign out the user
      await supabase.auth.signOut();
    }

    console.log('✅ Account deletion completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in deleteUserAccount:', error);
    throw error;
  }
};

// Function to update user geolocation and fetch new profiles
export const updateGeolocationAndFetchProfiles = async (limit = 10) => {
  try {
    console.log('📍 Starting geolocation update and profile fetch');
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Update geolocation first
    try {
      console.log('📍 Updating user geolocation');
      const location = await getCurrentLocationAndresidence();
      if (location) {
        console.log('✅ Geolocation updated:', location.geolocation);
        
        // Update user profile with new geolocation
        const { error: updateError } = await supabase
          .from('users')
          .update({ geolocation: location.geolocation })
          .eq('id', currentUser.id);
        
        if (updateError) {
          console.error('❌ Error updating user geolocation in database:', updateError);
        } else {
          console.log('✅ User geolocation updated in database');
        }
      } else {
        console.log('⚠️ No location data available for update');
      }
    } catch (locationError) {
      console.error('❌ Error updating geolocation:', locationError);
      // Continue with profile fetch even if geolocation update fails
    }
    
    // Fetch new profiles with updated geolocation
    const profiles = await getSwipeProfiles(limit);
    console.log(`✅ Fetched ${profiles.length} profiles with updated geolocation`);
    
    return profiles;
  } catch (error) {
    console.error('❌ Error in updateGeolocationAndFetchProfiles:', error);
    throw error;
  }
};

// Function to get swipe profiles with automatic geolocation update after 10 swipes
export const getSwipeProfilesWithGeolocationUpdate = async (limit = 10, shouldUpdateLocation = false) => {
  try {
    if (shouldUpdateLocation) {
      console.log('🔄 Updating geolocation and fetching new profiles');
      return await updateGeolocationAndFetchProfiles(limit);
    } else {
      console.log('📋 Fetching profiles without geolocation update');
      return await getSwipeProfiles(limit);
    }
  } catch (error) {
    console.error('❌ Error in getSwipeProfilesWithGeolocationUpdate:', error);
    throw error;
  }
};

// Function to get users within x miles using geolocation or residence-based filtering
export const getUsersWithinDistance = async (maxDistance = 50, limit = 50) => {
  try {
    console.log(`🔍 Finding users within ${maxDistance} miles`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get current user's profile to get residence and geolocation
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('residence, geolocation')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserResidence = currentUserProfile?.residence;
    const currentUserGeolocation = currentUserProfile?.geolocation;

    // Determine if location sharing is enabled
    const isLocationSharingEnabled = currentUserGeolocation !== null;
    
    if (isLocationSharingEnabled) {
      console.log('📍 Location sharing enabled - using geolocation for distance filtering');
    } else if (currentUserResidence) {
      console.log('📍 Location sharing disabled - using residence for distance filtering');
    } else {
      console.log('❌ No location data available for current user');
      throw new Error('Please set your residence or enable location sharing to find nearby users.');
    }

    // Get all user profiles (excluding current user)
    const { data: allProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, bio, birthday, sex, interests, images, residence, geolocation')
      .neq('id', currentUser.id)
      .limit(limit * 2); // Get more profiles to allow for distance filtering

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    console.log(`📊 Found ${allProfiles.length} users for distance filtering`);

    // Process profiles to calculate distances
    const processedProfiles = await Promise.all(
      allProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance using the best available method
        let distance = null;
        let withinDistance = true; // Default to true if no location data
        let distanceMethod = 'unknown';
        
        // Method 1: Both users have geolocation (location sharing enabled)
        if (currentUserGeolocation && profile.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const profileCoords = Array.isArray(profile.geolocation) ? profile.geolocation : JSON.parse(profile.geolocation);
            
            if (currentUserCoords.length === 2 && profileCoords.length === 2) {
              distance = calculateDistance(
                currentUserCoords[0], currentUserCoords[1],
                profileCoords[0], profileCoords[1]
              );
              withinDistance = distance <= userMaxDistance;
              distanceMethod = 'geolocation_to_geolocation';
              
              console.log(`📍 Geolocation-to-geolocation distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
            }
          } catch (distanceError) {
            console.error('❌ Error calculating geolocation distance:', distanceError);
            withinDistance = true; // If distance calculation fails, include the profile
          }
        }
        
        // Method 2: Both users have residences (location sharing disabled or mixed)
        if (distance === null && currentUserResidence && profile.residence) {
          try {
            const { calculateAddressDistance } = await import('./google_maps');
            distance = await calculateAddressDistance(currentUserResidence, profile.residence);
            
            if (distance !== null) {
              withinDistance = distance <= userMaxDistance;
              distanceMethod = 'residence_to_residence';
              console.log(`📍 Residence-to-residence distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
            } else {
              // If address distance calculation fails, check if they're in the same residence
              const sameResidence = currentUserResidence === profile.residence;
              if (sameResidence) {
                distance = 0;
                withinDistance = true;
                distanceMethod = 'same_residence';
                console.log(`📍 Same residence as ${profile.name}: ${currentUserResidence}`);
              } else {
                console.log(`📍 Could not calculate distance to ${profile.name}, including in results`);
                withinDistance = true; // Include if we can't determine distance
              }
            }
          } catch (addressDistanceError) {
            console.error('❌ Error calculating address distance:', addressDistanceError);
            // Check if they're in the same residence as fallback
            const sameResidence = currentUserResidence === profile.residence;
            if (sameResidence) {
              distance = 0;
              withinDistance = true;
              distanceMethod = 'same_residence';
              console.log(`📍 Same residence as ${profile.name}: ${currentUserResidence}`);
            } else {
              console.log(`📍 Could not calculate distance to ${profile.name}, including in results`);
              withinDistance = true; // Include if we can't determine distance
            }
          }
        }
        
        // Method 3: Mixed scenario - one user has geolocation, one has residence
        if (distance === null) {
          if (currentUserGeolocation && profile.residence) {
            // Current user has geolocation, profile has residence
            try {
              const { reverseGeocodeAddress } = await import('./google_maps');
              const profileCoords = await reverseGeocodeAddress(profile.residence);
              
              if (profileCoords) {
                const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
                
                if (currentUserCoords.length === 2) {
                  distance = calculateDistance(
                    currentUserCoords[0], currentUserCoords[1],
                    profileCoords.latitude, profileCoords.longitude
                  );
                  withinDistance = distance <= userMaxDistance;
                  distanceMethod = 'geolocation_to_residence';
                  console.log(`📍 Geolocation-to-residence distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
                }
              }
            } catch (mixedError) {
              console.error('❌ Error calculating mixed geolocation-to-residence distance:', mixedError);
              withinDistance = true; // Include if we can't determine distance
            }
          } else if (currentUserResidence && profile.geolocation) {
            // Current user has residence, profile has geolocation
            try {
              const { reverseGeocodeAddress } = await import('./google_maps');
              const currentUserCoords = await reverseGeocodeAddress(currentUserResidence);
              
              if (currentUserCoords) {
                const profileCoords = Array.isArray(profile.geolocation) ? profile.geolocation : JSON.parse(profile.geolocation);
                
                if (profileCoords.length === 2) {
                  distance = calculateDistance(
                    currentUserCoords.latitude, currentUserCoords.longitude,
                    profileCoords[0], profileCoords[1]
                  );
                  withinDistance = distance <= userMaxDistance;
                  distanceMethod = 'residence_to_geolocation';
                  console.log(`📍 Residence-to-geolocation distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
                }
              }
            } catch (mixedError) {
              console.error('❌ Error calculating mixed residence-to-geolocation distance:', mixedError);
              withinDistance = true; // Include if we can't determine distance
            }
          }
        }
        
        // Fallback: No location data available
        if (distance === null) {
          console.log(`📍 No location data available for ${profile.name}, including in results`);
          withinDistance = true; // Include if we can't determine distance
        }

        // Get photos from database images array or fallback to storage
        let photoUrls = [];
        if (profile.images && Array.isArray(profile.images) && profile.images.length > 0) {
          photoUrls = profile.images;
        } else {
          try {
            const storagePhotoUrl = await getSignedPhotoUrl(profile.id);
            if (storagePhotoUrl) {
              photoUrls = [storagePhotoUrl];
            }
          } catch (photoError) {
            console.error('Error fetching photo for profile:', profile.id, photoError);
          }
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profile.interests || [],
          image: photoUrls.length > 0 ? photoUrls[0] : null,
          images: photoUrls,
          sex: profile.sex,
          residence: profile.residence || null,
          distance: distance,
          distanceMethod: distanceMethod,
          withinDistance: withinDistance
        };
      })
    );

    // Debug: Log all processed profiles
    console.log('📊 All processed profiles:');
    processedProfiles.forEach(profile => {
      console.log(`  ${profile.name}: distance=${profile.distance}, method=${profile.distanceMethod}, withinDistance=${profile.withinDistance}`);
    });

    // Filter profiles by distance and sort by distance (closest first)
    const distanceFilteredProfiles = processedProfiles
      .filter(profile => profile.withinDistance)
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      })
      .slice(0, limit);

    console.log('📊 Distance filtered profiles:');
    distanceFilteredProfiles.forEach(profile => {
      console.log(`  ${profile.name}: distance=${profile.distance}, method=${profile.distanceMethod}`);
    });

    console.log(`✅ Found ${distanceFilteredProfiles.length} users within ${maxDistance} miles`);
    console.log(`📍 Distance filtering: ${maxDistance} miles max (${isLocationSharingEnabled ? 'geolocation-based' : 'residence-based'})`);
    
    return distanceFilteredProfiles;

  } catch (error) {
    console.error('❌ Error in getUsersWithinDistance:', error);
    throw error;
  }
};

// Function to calculate distance between two users with comprehensive location handling
export const calculateUserDistance = async (currentUserGeolocation, currentUserResidence, profileGeolocation, profileResidence, maxDistance) => {
  try {
    console.log(`📍 Calculating distance between users`);
    console.log(`  Current user - Geolocation: ${currentUserGeolocation ? 'enabled' : 'disabled'}, Residence: ${currentUserResidence || 'none'}`);
    console.log(`  Profile user - Geolocation: ${profileGeolocation ? 'enabled' : 'disabled'}, Residence: ${profileResidence || 'none'}`);
    
    let distance = null;
    let withinDistance = true; // Default to true if no location data
    let distanceMethod = 'unknown';
    
    // Scenario 1: Both users have geolocation (location sharing enabled)
    if (currentUserGeolocation && profileGeolocation) {
      try {
        const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
        const profileCoords = Array.isArray(profileGeolocation) ? profileGeolocation : JSON.parse(profileGeolocation);
        
        if (currentUserCoords.length === 2 && profileCoords.length === 2) {
          distance = calculateDistance(
            currentUserCoords[0], currentUserCoords[1],
            profileCoords[0], profileCoords[1]
          );
          withinDistance = distance <= maxDistance;
          distanceMethod = 'geolocation_to_geolocation';
          
          console.log(`📍 Geolocation-to-geolocation distance: ${distance} miles (max: ${maxDistance})`);
        }
      } catch (distanceError) {
        console.error('❌ Error calculating geolocation distance:', distanceError);
        withinDistance = true; // If distance calculation fails, include the profile
      }
    }
    
    // Scenario 2: Current user has geolocation, profile has residence (location sharing mixed)
    if (distance === null && currentUserGeolocation && profileResidence) {
      try {
        const { reverseGeocodeAddress } = await import('./google_maps');
        const profileCoords = await reverseGeocodeAddress(profileResidence);
        
        if (profileCoords) {
          const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
          
          if (currentUserCoords.length === 2) {
            distance = calculateDistance(
              currentUserCoords[0], currentUserCoords[1],
              profileCoords.latitude, profileCoords.longitude
            );
            withinDistance = distance <= maxDistance;
            distanceMethod = 'geolocation_to_residence';
            console.log(`📍 Geolocation-to-residence distance: ${distance} miles (max: ${maxDistance})`);
          }
        }
      } catch (mixedError) {
        console.error('❌ Error calculating geolocation-to-residence distance:', mixedError);
        withinDistance = true; // Include if we can't determine distance
      }
    }
    
    // Scenario 3: Current user has residence, profile has geolocation (location sharing mixed)
    if (distance === null && currentUserResidence && profileGeolocation) {
      try {
        const { reverseGeocodeAddress } = await import('./google_maps');
        const currentUserCoords = await reverseGeocodeAddress(currentUserResidence);
        
        if (currentUserCoords) {
          const profileCoords = Array.isArray(profileGeolocation) ? profileGeolocation : JSON.parse(profileGeolocation);
          
          if (profileCoords.length === 2) {
            distance = calculateDistance(
              currentUserCoords.latitude, currentUserCoords.longitude,
              profileCoords[0], profileCoords[1]
            );
            withinDistance = distance <= maxDistance;
            distanceMethod = 'residence_to_geolocation';
            console.log(`📍 Residence-to-geolocation distance: ${distance} miles (max: ${maxDistance})`);
          }
        }
      } catch (mixedError) {
        console.error('❌ Error calculating residence-to-geolocation distance:', mixedError);
        withinDistance = true; // Include if we can't determine distance
      }
    }
    
    // Scenario 4: Both users have residences (location sharing disabled or mixed)
    if (distance === null && currentUserResidence && profileResidence) {
      // First check if they're in the same residence (exact string match)
      const sameResidence = currentUserResidence === profileResidence;
      if (sameResidence) {
        distance = 0;
        withinDistance = true;
        distanceMethod = 'same_residence';
        console.log(`📍 Same residence: ${currentUserResidence}`);
      } else {
        // Try to calculate distance between residences
        try {
          const { calculateAddressDistance } = await import('./google_maps');
          distance = await calculateAddressDistance(currentUserResidence, profileResidence);
          
          if (distance !== null) {
            withinDistance = distance <= maxDistance;
            distanceMethod = 'residence_to_residence';
            console.log(`📍 Residence-to-residence distance: ${distance} miles (max: ${maxDistance})`);
          } else {
            console.log(`📍 Could not calculate distance between residences, including in results`);
            withinDistance = true; // Include if we can't determine distance
          }
        } catch (addressDistanceError) {
          console.error('❌ Error calculating address distance:', addressDistanceError);
          console.log(`📍 Could not calculate distance between residences, including in results`);
          withinDistance = true; // Include if we can't determine distance
        }
      }
    }
    
    // Fallback: No location data available
    if (distance === null) {
      console.log(`📍 No location data available, including in results`);
      withinDistance = true; // Include if we can't determine distance
    }
    
    return {
      distance,
      withinDistance,
      distanceMethod
    };
    
  } catch (error) {
    console.error('❌ Error in calculateUserDistance:', error);
    return {
      distance: null,
      withinDistance: true, // Include if error occurs
      distanceMethod: 'error'
    };
  }
};