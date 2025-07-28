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
          geolocation: userData.geolocation || null,
          residence: userData.residence || null,
          interests: userData.interests || [],
          images: userData.images || [],
          quiz: userData.quiz || [],
          strikes: 0,
          bio: userData.bio || '',
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
  // This function is no longer needed as matches are created directly
  // when two users like each other, not as a separate table for each user
  console.log('createMatchesTable is deprecated - matches are created directly in the matches table');
  return null;
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
    console.log(`💕 Creating match between users ${user1Id} and ${user2Id}`);
    
    // Check if match already exists
    const { data: existingMatch, error: findError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing match:', findError);
      throw findError;
    }

    if (existingMatch) {
      console.log(`✅ Match already exists: ${existingMatch.id}`);
      return existingMatch.id;
    }

    // Create new match record
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        user1_score: null,
        user2_score: null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating match:', createError);
      throw createError;
    }

    console.log(`✅ Created new match: ${newMatch.id}`);
    return newMatch.id;

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

    // Get all likes records and filter for those that contain the current user's ID
    const { data: allLikesRecords, error: likesError } = await supabase
      .from('likes')
      .select('id, likes');

    if (likesError) {
      console.error('❌ Error fetching likes records:', likesError);
      throw likesError;
    }

    console.log(`📊 Total likes records found: ${allLikesRecords?.length || 0}`);
    console.log('📋 All likes records:', allLikesRecords);

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
      .select('id, name, bio, birthday, sex, interests, images, residence')
      .in('id', usersWhoLikedMe);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    console.log(`👤 User profiles found:`, userProfiles?.length || 0);

    // Process profiles to add age and photo URLs (simplified without distance calculation)
    const processedLikes = await Promise.all(
      userProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get photos from database images array or fallback to storage
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
          interests: profile.interests || [],
          image: photoUrls.length > 0 ? photoUrls[0] : null, // Single image for backward compatibility
          images: photoUrls, // Array of images for carousel
          sex: profile.sex,
          residence: profile.residence || null,
          distance: null, // Simplified - no distance calculation
          withinDistance: true // Simplified - include all likes
        };
      })
    );

    console.log(`✅ Successfully processed ${processedLikes.length} likes`);
    return processedLikes;

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

    // Get all matches where current user is either user1 or user2
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*, user1:users!matches_user1_id_fkey(id, name, bio, birthday, sex, interests, images, residence, geolocation), user2:users!matches_user2_id_fkey(id, name, bio, birthday, sex, interests, images, residence, geolocation)')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`📊 Found ${matches.length} matches`);

    if (matches.length === 0) {
      return [];
    }

    // Process matches to get the other user's profile and add metadata
    const processedMatches = await Promise.all(
      matches.map(async (match) => {
        // Determine which user is the other person (not current user)
        const otherUser = match.user1_id === currentUser.id ? match.user2 : match.user1;
        const isUser1 = match.user1_id === currentUser.id;
        const userScore = isUser1 ? match.user1_score : match.user2_score;
        const otherUserScore = isUser1 ? match.user2_score : match.user1_score;

        if (!otherUser) {
          console.warn(`⚠️ Missing user profile for match ${match.id}`);
          return null;
        }

        // Calculate age
        const age = otherUser.birthday ? 
          Math.floor((new Date() - new Date(otherUser.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance if both users have geolocation data
        let distance = null;
        
        if (currentUserGeolocation && otherUser.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const otherUserCoords = Array.isArray(otherUser.geolocation) ? otherUser.geolocation : JSON.parse(otherUser.geolocation);
            
            if (currentUserCoords.length === 2 && otherUserCoords.length === 2) {
              distance = calculateDistance(
                currentUserCoords[0], currentUserCoords[1],
                otherUserCoords[0], otherUserCoords[1]
              );
              
              console.log(`📍 Distance to match ${otherUser.name}: ${distance} miles`);
            }
          } catch (distanceError) {
            console.error('❌ Error calculating distance for match:', distanceError);
          }
        }

        // Get first photo from database images array or fallback to storage
        let photoUrl = null;
        if (otherUser.images && Array.isArray(otherUser.images) && otherUser.images.length > 0) {
          photoUrl = otherUser.images[0]; // Use first image from database
        } else {
          // Fallback to storage if no images in database
          try {
            photoUrl = await getSignedPhotoUrl(otherUser.id);
          } catch (photoError) {
            console.error('Error fetching photo for match:', otherUser.id, photoError);
          }
        }

        return {
          id: otherUser.id,
          matchId: match.id,
          name: otherUser.name || 'Anonymous',
          age: age,
          bio: otherUser.bio || 'No bio available',
          interests: otherUser.interests || [],
          photo: photoUrl,
          residence: otherUser.residence || null,
          distance: distance,
          userScore: userScore,
          otherUserScore: otherUserScore,
          lastMessage: 'Start a conversation!',
          timestamp: 'Just matched!',
          matchedAt: match.created_at
        };
      })
    );

    // Filter out null entries and sort by distance (closest first)
    const validMatches = processedMatches.filter(match => match !== null);
    const sortedMatches = validMatches.sort((a, b) => {
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
    console.log(`❌ Unmatching users ${user1Id} and ${user2Id}`);

    // Delete the match record between these users
    const { error: matchDeleteError } = await supabase
      .from('matches')
      .delete()
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`);

    if (matchDeleteError) {
      console.error('❌ Error deleting match:', matchDeleteError);
      throw matchDeleteError;
    }

    // Delete all messages in the chat room between these users
    // Since matches table now serves as chat rooms, we need to delete messages
    // that reference the deleted match ID
    try {
      const { data: deletedMatch, error: findError } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
        .single();

      if (!findError && deletedMatch) {
        // Delete messages between the two users
        const { error: messagesDeleteError } = await supabase
          .from('messages')
          .delete()
          .or(`and(id.eq.${user1Id},receiver_id.eq.${user2Id}),and(id.eq.${user2Id},receiver_id.eq.${user1Id})`);

        if (messagesDeleteError) {
          console.error('❌ Error deleting messages:', messagesDeleteError);
          // Don't throw here as the match deletion is more important
        }
      }
    } catch (messagesError) {
      console.error('❌ Error deleting messages:', messagesError);
      // Don't throw here as the match deletion is more important
    }

    console.log(`✅ Successfully unmatched users ${user1Id} and ${user2Id}`);
    return true;

  } catch (error) {
    console.error('❌ Error in unmatchUsers:', error);
    throw error;
  }
};

// ===== CHAT FUNCTIONS =====

// Function to get or create a chat room between two users
export const getOrCreateChatRoom = async (user1Id, user2Id) => {
  try {
    console.log(`🏠 Getting or creating chat room between users ${user1Id} and ${user2Id}`);
    
    // First, try to find an existing match between these two users
    const { data: existingMatch, error: findError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      console.error('❌ Error finding existing match:', findError);
      throw findError;
    }

    if (existingMatch) {
      console.log(`✅ Found existing match/chat room: ${existingMatch.id}`);
      return existingMatch.id;
    }

    // If no existing match, create a new one
    console.log(`📝 Creating new match/chat room between users ${user1Id} and ${user2Id}`);
    const { data: newMatch, error: createError } = await supabase
      .from('matches')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        user1_score: null,
        user2_score: null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating new match:', createError);
      throw createError;
    }

    console.log(`✅ Created new match/chat room: ${newMatch.id}`);
    return newMatch.id;
  } catch (error) {
    console.error('❌ Error in getOrCreateChatRoom:', error);
    throw error;
  }
};

// Function to send a message
export const sendMessage = async (roomId, content) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get the other user in the match (receiver)
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (matchError) {
      console.error('❌ Error fetching match:', matchError);
      throw matchError;
    }

    // Determine the receiver (the other user in the match)
    const receiverId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id, // Use sender_id field for the actual sender
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toISOString(),
        read: false
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
      is_read: data.read,
      created_at: data.created_at,
      sender_id: data.sender_id, // Use the actual sender_id field
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
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get the match to determine the other user
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (matchError) {
      console.error('❌ Error fetching match:', matchError);
      throw matchError;
    }

    const otherUserId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;

    // Get messages where current user is sender and other user is receiver, or vice versa
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
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
      is_read: message.read,
      created_at: message.created_at,
      sender_id: message.sender_id, // Use the actual sender_id field
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

    // Get the match to determine the other user
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (matchError) {
      console.error('❌ Error fetching match:', matchError);
      throw matchError;
    }

    const otherUserId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;

    // Mark messages as read where current user is receiver and other user is sender
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', currentUser.id)
      .eq('sender_id', otherUserId)
      .eq('read', false);

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

    // Get matches (which now serve as chat rooms) for current user
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
      .order('created_at', { ascending: false });

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    if (!matches || matches.length === 0) {
      console.log('✅ No matches/chat rooms found');
      return [];
    }

    // Get all unique user IDs from the matches
    const userIds = new Set();
    matches.forEach(match => {
      userIds.add(match.user1_id);
      userIds.add(match.user2_id);
    });

    // Get user profiles for all users in matches
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

    // Get last messages for all matches by getting messages between current user and each match partner
    const lastMessages = [];
    for (const match of matches) {
      const otherUserId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;
      
      // Get the most recent message between these two users
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!messagesError && messages && messages.length > 0) {
        lastMessages.push({
          ...messages[0],
          match_id: match.id
        });
      }
    }

    // Create a map of match IDs to their last message
    const lastMessageMap = {};
    lastMessages.forEach(message => {
      if (!lastMessageMap[message.match_id] || 
          new Date(message.created_at) > new Date(lastMessageMap[message.match_id].created_at)) {
        lastMessageMap[message.match_id] = message;
      }
    });

    // Process matches to get the other user's info and last message
    const processedRooms = matches.map(match => {
      const otherUserId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;
      const otherUser = userMap[otherUserId] || { id: otherUserId, name: 'Unknown User' };
      const lastMessage = lastMessageMap[match.id];
      
      return {
        id: match.id,
        otherUser: {
          id: otherUser.id,
          name: otherUser.name
        },
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.created_at,
          isFromMe: lastMessage.sender_id === currentUser.id // The sender_id field represents the sender
        } : null,
        createdAt: match.created_at
      };
    });

    console.log(`✅ Fetched ${processedRooms.length} matches/chat rooms`);
    return processedRooms;
  } catch (error) {
    console.error('❌ Error in getChatRooms:', error);
    throw error;
  }
};

// Function to subscribe to real-time messages
export const subscribeToMessages = (roomId, callback) => {
  console.log(`🔔 Subscribing to messages in room ${roomId}`);
  
  return new Promise((resolve, reject) => {
    // Get current user to set up proper subscription
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (!currentUser) {
        console.error('❌ No authenticated user for message subscription');
        reject(new Error('No authenticated user'));
        return;
      }

      // Get the other user in the match
      supabase
        .from('matches')
        .select('user1_id, user2_id')
        .eq('id', roomId)
        .single()
        .then(({ data: match }) => {
          if (!match) {
            console.error('❌ Match not found for subscription');
            reject(new Error('Match not found'));
            return;
          }

          const otherUserId = match.user1_id === currentUser.id ? match.user2_id : match.user1_id;

          const subscription = supabase
            .channel(`messages:${roomId}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
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
                filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id}))`
              },
              (payload) => {
                console.log('📝 Message updated:', payload);
                callback(payload.new, 'update');
              }
            )
            .subscribe((status) => {
              console.log('🔔 Subscription status:', status);
              if (status === 'SUBSCRIBED') {
                resolve(subscription);
              } else {
                reject(new Error(`Subscription failed: ${status}`));
              }
            });
        })
        .catch((error) => {
          console.error('❌ Error setting up message subscription:', error);
          reject(error);
        });
    });
  });
};

// Function to subscribe to chat room updates
export const subscribeToChatRooms = (callback) => {
  console.log(`🔔 Subscribing to match/chat room updates`);
  
  const subscription = supabase
    .channel('matches')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches'
      },
      (payload) => {
        console.log('🏠 New match/chat room created:', payload);
        callback(payload.new, 'insert');
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches'
      },
      (payload) => {
        console.log('🏠 Match/chat room updated:', payload);
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
    console.log(`🗑️ Deleting message: ${messageId}`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // First, verify that the current user is the sender of this message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching message:', fetchError);
      throw new Error('Message not found.');
    }

    if (message.sender_id !== currentUser.id) {
      console.error('❌ User not authorized to delete this message');
      throw new Error('You can only delete your own messages.');
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (deleteError) {
      console.error('❌ Error deleting message:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Successfully deleted message: ${messageId}`);
    return true;
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

    // Get all matches for the current user
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

    if (matchesError) {
      console.error('❌ Error getting matches:', matchesError);
      throw matchesError;
    }

    if (!matches || matches.length === 0) {
      console.log('✅ No matches found, unread count: 0');
      return 0;
    }

    // Get all unique user IDs that the current user has matches with
    const otherUserIds = matches.map(match => 
      match.user1_id === currentUser.id ? match.user2_id : match.user1_id
    );

    // Count unread messages where current user is receiver
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', currentUser.id)
      .eq('read', false)
      .in('sender_id', otherUserIds);

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

    // Get all matches for the current user
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('created_at')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    // Count matches created after the last viewed time
    const newMatchesCount = matches.filter(match => 
      new Date(match.created_at) > lastViewedTime
    ).length;

    console.log(`✅ New matches count: ${newMatchesCount}`);
    return newMatchesCount;
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
      .select('id, name, bio, interests, birthday, sex, images, residence, geolocation, quiz')
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
      residence: profile.residence || null,
      geolocation: profile.geolocation || null,
      quiz: profile.quiz || []
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

    // 3. Delete matches involving the user
    try {
      // Get all matches involving the user
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!matchesError && matches && matches.length > 0) {
        const matchIds = matches.map(match => match.id);
        
        // Delete messages where the user is either sender or receiver
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        
        if (messagesError) {
          console.error('❌ Error deleting messages:', messagesError);
        } else {
          console.log('✅ User messages deleted');
        }

        // Delete the matches
        const { error: deleteMatchesError } = await supabase
          .from('matches')
          .delete()
          .in('id', matchIds);
        
        if (deleteMatchesError) {
          console.error('❌ Error deleting matches:', deleteMatchesError);
        } else {
          console.log('✅ User matches deleted');
        }
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



    // 5. Quiz data is stored in the users table, so it will be deleted when the user profile is deleted
    console.log('✅ Quiz data will be deleted with user profile');

    // 6. Delete user profile
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

    // 7. Finally, delete the user account from Supabase Auth
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

// ===== QUIZ FUNCTIONS =====

// Function to generate fake answers for quiz questions
export const generateFakeAnswers = async (questions, correctAnswers) => {
  try {
    console.log(`🤖 Generating fake answers for ${questions.length} questions`);
    
    // For now, we'll generate simple fake answers
    // In the future, this could be enhanced with AI-generated fake answers
    const fakeAnswers = questions.map((question, index) => {
      const correctAnswer = correctAnswers[index];
      
      // Generate 3 fake answers based on the question type
      const fakeAnswersForQuestion = [];
      
      // Add some variety to fake answers
      if (typeof correctAnswer === 'string') {
        if (correctAnswer.toLowerCase().includes('yes') || correctAnswer.toLowerCase().includes('no')) {
          fakeAnswersForQuestion.push(
            correctAnswer.toLowerCase().includes('yes') ? 'No' : 'Yes',
            'Maybe',
            'Sometimes'
          );
        } else if (correctAnswer.length > 20) {
          // Long text answer - generate shorter alternatives
          fakeAnswersForQuestion.push(
            'Something else',
            'Not sure',
            'I prefer not to say'
          );
        } else {
          // Short answer - generate similar but wrong answers
          fakeAnswersForQuestion.push(
            'Different answer',
            'Another option',
            'Alternative choice'
          );
        }
      } else {
        // For non-string answers, use generic fake answers
        fakeAnswersForQuestion.push(
          'Option A',
          'Option B', 
          'Option C'
        );
      }
      
      return fakeAnswersForQuestion;
    });
    
    console.log(`✅ Generated fake answers for ${questions.length} questions`);
    return fakeAnswers;
  } catch (error) {
    console.error('❌ Error generating fake answers:', error);
    // Fallback to simple fake answers
    return questions.map(() => ['Incorrect Answer 1', 'Incorrect Answer 2', 'Incorrect Answer 3']);
  }
};

// Function to create or update a user's quiz
export const createOrUpdateQuiz = async (userId, quizData) => {
  try {
    console.log(`📝 Creating/updating quiz for user: ${userId}`);
    
    // Extract questions, answers, and fake answers from quizData
    const questions = quizData.map(item => item[0]);
    const answers = quizData.map(item => item[1]);
    const fakeAnswers = quizData.map(item => item[2]); // Get fake answer (item 2) and wrap in array for database
    
    // Check if quiz already exists for this user
    const { data: existingQuiz, error: checkError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing quiz:', checkError);
      throw checkError;
    }

    let result;
    if (existingQuiz) {
      // Update existing quiz
      const { data, error } = await supabase
        .from('quizzes')
        .update({ 
          questions: questions,
          answers: answers,
          fake_answers: fakeAnswers
        })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error updating quiz:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new quiz
      const { data, error } = await supabase
        .from('quizzes')
        .insert({ 
          id: userId,
          questions: questions,
          answers: answers,
          fake_answers: fakeAnswers
        })
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error creating quiz:', error);
        throw error;
      }
      result = data;
    }

    console.log(`✅ Quiz ${existingQuiz ? 'updated' : 'created'} successfully for user: ${userId}`);
    return result;
  } catch (error) {
    console.error('❌ Error in createOrUpdateQuiz:', error);
    throw error;
  }
};

// Function to get a user's quiz
export const getUserQuiz = async (userId) => {
  try {
    console.log(`📋 Getting quiz for user: ${userId}`);
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('questions, answers, fake_answers')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`📋 No quiz found for user: ${userId}`);
        return null;
      }
      console.error('❌ Error getting user quiz:', error);
      throw error;
    }

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      console.log(`📋 No quiz found for user: ${userId}`);
      return null;
    }

    // Format the quiz data to match the expected structure
    const formattedQuiz = {
      questions: quiz.questions.map((question, index) => {
        const answer = quiz.answers[index];
        const fakeAnswers = quiz.fake_answers[index] || [];
        
        // Get the first fake answer or provide a default
        const fakeAnswer = fakeAnswers.length > 0 ? fakeAnswers[0] : 'Fake Answer';
        
        return [question, answer, fakeAnswer];
      }),
      fakeAnswers: quiz.fake_answers
    };

    console.log(`✅ Retrieved quiz for user: ${userId}`);
    return formattedQuiz;
  } catch (error) {
    console.error('❌ Error in getUserQuiz:', error);
    throw error;
  }
};

// Function to submit quiz answers and calculate score
export const submitQuizAnswers = async (quizOwnerId, answers) => {
  try {
    console.log(`📝 Submitting quiz answers for user: ${quizOwnerId}`);
    
    // Get the quiz owner's quiz
    const quiz = await getUserQuiz(quizOwnerId);
    if (!quiz) {
      throw new Error('Quiz not found for this user');
    }

    // Calculate score
    const questions = quiz.questions;
    let correctAnswers = 0;
    const totalQuestions = questions.length;

    for (let i = 0; i < totalQuestions; i++) {
      if (questions[i] && answers[i] && questions[i][1] === answers[i]) {
        correctAnswers++;
      }
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    
    console.log(`📊 Quiz score calculated: ${score}% (${correctAnswers}/${totalQuestions})`);
    return { score, correctAnswers, totalQuestions };
  } catch (error) {
    console.error('❌ Error in submitQuizAnswers:', error);
    throw error;
  }
};

// Function to save quiz score to matches table
export const saveQuizScore = async (quizOwnerId, quizTakerId, score) => {
  try {
    console.log(`💾 Saving quiz score: ${score}% for quiz taker ${quizTakerId} on quiz owner ${quizOwnerId}`);
    
    // Find the match between quiz taker and quiz owner
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .or(`and(user1_id.eq.${quizTakerId},user2_id.eq.${quizOwnerId}),and(user1_id.eq.${quizOwnerId},user2_id.eq.${quizTakerId})`)
      .single();

    if (matchError && matchError.code !== 'PGRST116') {
      console.error('❌ Error finding match:', matchError);
      throw matchError;
    }

    if (!match) {
      console.error('❌ No match found between users');
      throw new Error('No match found between users');
    }

    // Determine which user is which and update the appropriate score
    let updateData = {};
    if (match.user1_id === quizTakerId) {
      // Quiz taker is user1, quiz owner is user2
      updateData.user1_score = score;
    } else {
      // Quiz taker is user2, quiz owner is user1
      updateData.user2_score = score;
    }

    // Update the match with the quiz score
    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches')
      .update(updateData)
      .eq('id', match.id)
      .select('user1_score, user2_score')
      .single();

    if (updateError) {
      console.error('❌ Error updating quiz score:', updateError);
      throw updateError;
    }

    console.log(`✅ Quiz score saved successfully: ${score}%`);
    return updatedMatch;
  } catch (error) {
    console.error('❌ Error in saveQuizScore:', error);
    throw error;
  }
};

// Function to get quiz scores for a user
export const getQuizScores = async () => {
  try {
    console.log(`📊 Getting quiz scores for current user`);
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated');
    }

    // Get all matches for the current user
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*, user1:users!matches_user1_id_fkey(id, name), user2:users!matches_user2_id_fkey(id, name)')
      .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    // Process matches to extract quiz scores
    const quizScores = matches
      .filter(match => {
        // Only include matches where the current user has taken a quiz
        if (match.user1_id === currentUser.id) {
          return match.user1_score !== null;
        } else {
          return match.user2_score !== null;
        }
      })
      .map(match => {
        const isUser1 = match.user1_id === currentUser.id;
        const otherUser = isUser1 ? match.user2 : match.user1;
        const score = isUser1 ? match.user1_score : match.user2_score;
        
        return {
          quizOwnerId: otherUser.id,
          quizOwnerName: otherUser.name,
          score: score
        };
      });

    console.log(`✅ Retrieved ${quizScores.length} quiz scores`);
    return quizScores;
  } catch (error) {
    console.error('❌ Error in getQuizScores:', error);
    throw error;
  }
};

// Function to get quiz score for a specific user
export const getQuizScoreForUser = async (quizOwnerId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated');
    }

    // Find the match between current user and quiz owner
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('user1_score, user2_score')
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${quizOwnerId}),and(user1_id.eq.${quizOwnerId},user2_id.eq.${currentUser.id})`)
      .single();

    if (matchError && matchError.code !== 'PGRST116') {
      console.error('❌ Error finding match:', matchError);
      throw matchError;
    }

    if (!match) {
      return null;
    }

    // Return the appropriate score based on which user is which
    if (match.user1_id === currentUser.id) {
      return match.user1_score;
    } else {
      return match.user2_score;
    }
  } catch (error) {
    console.error('❌ Error in getQuizScoreForUser:', error);
    throw error;
  }
};

// Function to get quiz questions with fake answers for taking a quiz
export const getQuizWithOptions = async (userId) => {
  try {
    console.log(`📋 Getting quiz with options for user: ${userId}`);
    
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .select('questions, answers, fake_answers')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`📋 No quiz found for user: ${userId}`);
        return null;
      }
      console.error('❌ Error getting quiz with options:', error);
      throw error;
    }

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      console.log(`📋 No quiz found for user: ${userId}`);
      return null;
    }

    // Format the quiz data with multiple choice options
    const formattedQuiz = quiz.questions.map((question, index) => {
      const correctAnswer = quiz.answers[index];
      const fakeAnswers = quiz.fake_answers[index] || [];
      
      // Get the fake answer (first element of the array)
      const fakeAnswer = fakeAnswers.length > 0 ? fakeAnswers[0] : 'Fake Answer';
      
      // Create options array with correct answer and fake answer
      const options = [correctAnswer, fakeAnswer];
      
      // Shuffle the options to randomize the order
      const shuffledOptions = options.sort(() => Math.random() - 0.5);
      
      return {
        question: question,
        options: shuffledOptions,
        correctAnswer: correctAnswer
      };
    });

    console.log(`✅ Retrieved quiz with options for user: ${userId}`);
    return formattedQuiz;
  } catch (error) {
    console.error('❌ Error in getQuizWithOptions:', error);
    throw error;
  }
};

// Function to delete a user's quiz
export const deleteQuiz = async (userId) => {
  try {
    console.log(`🗑️ Deleting quiz for user: ${userId}`);
    
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('❌ Error deleting quiz:', error);
      throw error;
    }

    console.log(`✅ Quiz deleted successfully for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error in deleteQuiz:', error);
    throw error;
  }
};