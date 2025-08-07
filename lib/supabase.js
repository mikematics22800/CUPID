import { AppState, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'
import * as Location from 'expo-location'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
})

// Initialize app state listener to avoid useInsertionEffect warning
let appStateListener = null;

export const initializeAppStateListener = () => {
  if (appStateListener) {
    return; // Already initialized
  }
  
  appStateListener = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  });
};

export const cleanupAppStateListener = () => {
  if (appStateListener) {
    appStateListener.remove();
    appStateListener = null;
  }
};

export const createUserProfile = async (userId, userData) => {
  try {
    // Create user record in user table
    const { data: userRecord, error: userError } = await supabase
      .from('user')
      .insert([
        {
          id: userId,
          email: userData.email,
          phone: userData.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          banned: false,
          strikes: 0,
          disabled: false,
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      throw userError;
    }

    // Create personal record in personal table (immutable data)
    const { data: personalData, error: personalError } = await supabase
      .from('personal')
      .insert([
        {
          id: userId,
          name: userData.firstName + ' ' + userData.lastName,
          sex: userData.sex,
          birthdate: new Date(userData.birthday),
        }
      ])
      .select()
      .single();

    if (personalError) {
      console.error('Error creating personal record:', personalError);
      throw personalError;
    }

    // Create profile record in profile table (updatable data)
    const { data: profileData, error: profileError } = await supabase
      .from('profile')
      .insert([
        {
          id: userId,
          bio: userData.bio || '',
          interests: userData.interests || [],
          images: userData.images || [],
          residence: userData.residence || null,
          geolocation: userData.geolocation || null,
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile record:', profileError);
      throw profileError;
    }

    return { user: userRecord, personal: personalData, profile: profileData };
  } catch (error) {
    console.error('Error in createUserProfile:', error);
    throw error;
  }
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

    // Check if user records exist in all required tables
    const { data: existingUser, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: existingPersonal, error: personalError } = await supabase
      .from('personal')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: existingProfile, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('id', user.id)
      .single();

    // If any of the required records don't exist, create them
    if (userError?.code === 'PGRST116' || personalError?.code === 'PGRST116' || profileError?.code === 'PGRST116') {
      console.log('📝 Creating missing user records...');
      
      // Check if we have registration data
      const registrationData = await AsyncStorage.getItem('registrationData');
      
      if (registrationData) {
        try {
          const userData = JSON.parse(registrationData);
          
          // Create all required records
          await createUserProfile(user.id, userData);
          
          // Clear the registration data
          await AsyncStorage.removeItem('registrationData');
          
          Alert.alert('Success', 'Profile created successfully! Welcome to CUPID!');
        } catch (profileCreationError) {
          console.error('Error creating profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      } else {
        // No registration data found, create basic records
        try {
          await createUserProfile(user.id, {
            firstName: user.user_metadata?.firstName || 'User',
            lastName: user.user_metadata?.lastName || '',
            phone: user.user_metadata?.phone || '',
            email: user.email,
            sex: user.user_metadata?.sex || 'Male',
            birthday: user.user_metadata?.birthday || new Date().toISOString(),
            bio: user.user_metadata?.bio || '',
          });
          
        } catch (profileCreationError) {
          console.error('Error creating basic profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      }
    } else if (userError || personalError || profileError) {
      console.error('Error checking user records:', { userError, personalError, profileError });
    }

    // Update geolocation on login only if location sharing is enabled
    try {
      // Check if user has location sharing enabled (geolocation is not null)
      const { data: userProfile, error: profileError } = await supabase
        .from('profile')
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
            .from('profile')
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
    const { data: existingMatch, error: matchError } = await supabase
      .from('match')
      .select('*')
      .or(`and(user_1_id.eq.${user1Id},user_2_id.eq.${user2Id}),and(user_1_id.eq.${user2Id},user_2_id.eq.${user1Id})`)
      .single();
    if (existingMatch) {
      console.log(`✅ Match already exists between users ${user1Id} and ${user2Id}`);
      return existingMatch.id;
    }
    // Create new match record
    const { data: newMatch, error: createError } = await supabase
      .from('match')
      .insert([
        {
          user_1_id: user1Id,
          user_2_id: user2Id,
          user_1_score: null,
          user_2_score: null,
          active: true,
        }
      ])
      .select()
      .single();
    if (createError) {
      console.error('❌ Error creating match:', createError);
      throw createError;
    }
    console.log(`✅ Created new match between users ${user1Id} and ${user2Id}`);
    return newMatch.id;
  } catch (error) {
    console.error('❌ Error creating match:', error);
    throw error;
  }
};

// Function to handle swipe right on a like (create match and deactivate like)
export const handleLikeSwipeRight = async (likedUserId) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log(`💕 User ${currentUser.id} is swiping right on like from user ${likedUserId}`);
    
    // First, create the match
    const matchId = await createMatch(currentUser.id, likedUserId);
    
    // Then, deactivate the like (likedUser -> currentUser) by setting active to false
    const { data: deactivatedLike, error: deactivateError } = await supabase
      .from('like')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('sender_id', likedUserId)
      .eq('receiver_id', currentUser.id)
      .select('id')
      .single();
    
    if (deactivateError) {
      console.error('❌ Error deactivating like after match creation:', deactivateError);
      // Even if like deactivation fails, the match was created successfully
      console.log('⚠️ Match created but like deactivation failed');
    } else {
      console.log('✅ Like deactivated successfully after match creation');
    }
    
    return { 
      success: true, 
      isMatch: true,
      matchId: matchId
    };
  } catch (error) {
    console.error('❌ Error in handleLikeSwipeRight:', error);
    throw error;
  }
};

// Function to handle swipe left on a like (just deactivate the like)
export const handleLikeSwipeLeft = async (likedUserId) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log(`❌ User ${currentUser.id} is swiping left on like from user ${likedUserId}`);
    
    // Deactivate the like (likedUser -> currentUser) by setting active to false
    const { data: deactivatedLike, error: deactivateError } = await supabase
      .from('like')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('sender_id', likedUserId)
      .eq('receiver_id', currentUser.id)
      .select('id')
      .single();
    
    if (deactivateError) {
      console.error('❌ Error deactivating like:', deactivateError);
      // Check if it's because the like doesn't exist
      if (deactivateError.code === 'PGRST116') {
        console.log('📭 Like was already deactivated or never existed');
        return { success: true, alreadyDiscarded: true };
      }
      throw deactivateError;
    }
    
    console.log('✅ Like deactivated successfully');
    return { success: true, alreadyDiscarded: false };
  } catch (error) {
    console.error('❌ Error in handleLikeSwipeLeft:', error);
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
    console.log(`💕 User ${currentUser.id} is liking user ${likedUserId}`);
    
    // Check if already liked this user (only active likes)
    const { data: existingLike, error: fetchError } = await supabase
      .from('like')
      .select('id')
      .eq('sender_id', currentUser.id)
      .eq('receiver_id', likedUserId)
      .eq('active', true)
      .single();
    
    if (existingLike) {
      console.log('✅ User already liked this person');
      return { success: true, alreadyLiked: true };
    }
    
    // Create new like record
    const { error: createError } = await supabase
      .from('like')
      .insert([
        {
          sender_id: currentUser.id,
          receiver_id: likedUserId,
          active: true,
        }
      ]);
    
    if (createError) {
      console.error('❌ Error creating like:', createError);
      throw createError;
    }
    
    console.log('✅ Like added successfully');
    
    // Check if liked user has already liked current user (mutual like - only active likes)
    const { data: mutualLike, error: mutualLikeError } = await supabase
      .from('like')
      .select('id')
      .eq('sender_id', likedUserId)
      .eq('receiver_id', currentUser.id)
      .eq('active', true)
      .single();
    
    if (mutualLike) {
      console.log('🎉 It\'s a match! Creating match');
      // Create the match
      await createMatch(currentUser.id, likedUserId);
      return { 
        success: true, 
        alreadyLiked: false, 
        isMatch: true 
      };
    }
    
    return { 
      success: true, 
      alreadyLiked: false, 
      isMatch: false 
    };
  } catch (error) {
    console.error('❌ Error in handleUserLike:', error);
    throw error;
  }
};

// Function to check if two users have matched (mutual likes)
export const checkForMatch = async (user1Id, user2Id) => {
  try {
    // Check if both users have liked each other using the like table (only active likes)
    const { data: user1LikedUser2, error: user1Error } = await supabase
      .from('like')
      .select('id')
      .eq('sender_id', user1Id)
      .eq('receiver_id', user2Id)
      .eq('active', true)
      .single();

    const { data: user2LikedUser1, error: user2Error } = await supabase
      .from('like')
      .select('id')
      .eq('sender_id', user2Id)
      .eq('receiver_id', user1Id)
      .eq('active', true)
      .single();

    // Log actual errors (not "not found" errors)
    if (user1Error && user1Error.code !== 'PGRST116') {
      console.error('❌ Error checking user1 likes:', user1Error);
    }
    if (user2Error && user2Error.code !== 'PGRST116') {
      console.error('❌ Error checking user2 likes:', user2Error);
    }

    const user1LikedUser2Exists = !!user1LikedUser2;
    const user2LikedUser1Exists = !!user2LikedUser1;

    const isMatch = user1LikedUser2Exists && user2LikedUser1Exists;
    console.log(`🔍 Match check: User1 liked User2: ${user1LikedUser2Exists}, User2 liked User1: ${user2LikedUser1Exists}, Is Match: ${isMatch}`);

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

    // Get current user's personal data (immutable)
    const { data: currentUserPersonal, error: personalError } = await supabase
      .from('personal')
      .select('sex, birthdate')
      .eq('id', currentUser.id)
      .single();

    if (personalError) {
      console.error('❌ Error fetching current user personal data:', personalError);
      throw personalError;
    }

    // Get current user's profile data (updatable)
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profile')
      .select('interests, residence, geolocation')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserSex = currentUserPersonal?.sex;
    const currentUserBirthday = currentUserPersonal?.birthdate;
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

    // Get users that the current user has already liked (only active likes)
    const { data: userLikes, error: likeError } = await supabase
      .from('like')
      .select('receiver_id')
      .eq('sender_id', currentUser.id)
      .eq('active', true);

    if (likeError) {
      console.error('❌ Error fetching current user likes:', likeError);
      throw likeError;
    }

    let likedUserIds = [];
    if (userLikes && Array.isArray(userLikes)) {
      likedUserIds = userLikes.map(like => like.receiver_id);
    }

    // Get users who have already liked the current user (only active likes - these should appear in likes, not feed)
    const { data: usersWhoLikedMe, error: likedMeError } = await supabase
      .from('like')
      .select('sender_id')
      .eq('receiver_id', currentUser.id)
      .eq('active', true);

    if (likedMeError) {
      console.error('❌ Error fetching users who liked me:', likedMeError);
      throw likedMeError;
    }

    let usersWhoLikedMeIds = [];
    if (usersWhoLikedMe && Array.isArray(usersWhoLikedMe)) {
      usersWhoLikedMeIds = usersWhoLikedMe.map(like => like.sender_id);
    }

    // Get users that the current user has already matched with (both active and inactive matches)
    // This prevents ex-matches from appearing in the feed
    let matchedUserIds = [];
    const { data: userMatches, error: matchesError } = await supabase
      .from('match')
      .select('user_1_id, user_2_id, active')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`);

    if (!matchesError && userMatches) {
      matchedUserIds = userMatches.map(match => 
        match.user_1_id === currentUser.id ? match.user_2_id : match.user_1_id
      );
    }

    console.log(`📊 Users already liked: ${likedUserIds.length}`);
    console.log(`📊 Users who already liked me: ${usersWhoLikedMeIds.length}`);
    console.log(`📊 Users already matched: ${matchedUserIds.length}`);

    // Build query to get profiles to swipe on - need to join personal and profile tables
    let query = supabase
      .from('personal')
      .select(`
        id,
        name,
        sex,
        birthdate,
        profile!inner(
          bio,
          interests,
          images,
          residence,
          geolocation
        )
      `)
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

    // Filter out users that the current user has already liked, users who have already liked the current user, or matched with
    // According to the schema: when user A likes user B, user B should no longer appear in user A's feed
    // and user A should no longer appear in user B's feed, but user A will now appear in user B's likes
    const filteredProfiles = profiles.filter(profile => 
      !likedUserIds.includes(profile.id) && 
      !usersWhoLikedMeIds.includes(profile.id) && 
      !matchedUserIds.includes(profile.id)
    );

    // Process profiles to add age, photo URLs, calculate interest matches, and distance
    const processedProfiles = await Promise.all(
      filteredProfiles.map(async (profile) => {
        // Extract profile data from the joined query result
        const profileData = profile.profile;
        
        // Calculate age
        const age = profile.birthdate ? 
          Math.floor((new Date() - new Date(profile.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate interest matches
        const profileInterests = profileData.interests || [];
        const matchingInterests = currentUserInterests.filter(interest => 
          profileInterests.includes(interest)
        );
        const matchScore = matchingInterests.length;

        // Calculate distance using comprehensive location handling
        const distanceResult = await calculateUserDistance(
          currentUserGeolocation,
          currentUserResidence,
          profileData.geolocation,
          profileData.residence,
          userMaxDistance
        );
        
        const distance = distanceResult.distance;
        const withinDistance = distanceResult.withinDistance;
        const distanceMethod = distanceResult.distanceMethod;
        
        console.log(`📍 Distance to ${profile.name}: ${distance} miles (method: ${distanceMethod}, max: ${userMaxDistance})`);

        // Check if users are in the same residence (already handled in distance calculation above)
        let sameResidence = false;
        if (currentUserResidence && profileData.residence) {
          sameResidence = currentUserResidence === profileData.residence;
        }

        // Get all photos from database images array or fallback to storage
        let photoUrls = [];
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrls = profileData.images; // Use all images from database
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
          bio: profileData.bio || 'No bio available',
          interests: profileInterests,
          matchingInterests: matchingInterests,
          matchScore: matchScore,
          image: photoUrls.length > 0 ? photoUrls[0] : null, // Keep for backward compatibility
          images: photoUrls, // Add all images array
          sex: profile.sex,
          residence: profileData.residence || null,
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

    // Get likes received by current user using the like table (only active likes)
    const { data: likesReceived, error: likesError } = await supabase
      .from('like')
      .select('created_at, sender_id')
      .eq('receiver_id', currentUser.id)
      .eq('active', true)

    if (likesError) {
      console.error('❌ Error fetching likes received:', likesError);
      throw likesError;
    }

    console.log(`📊 Found ${likesReceived?.length || 0} users who liked current user`);

    if (!likesReceived || likesReceived.length === 0) {
      return [];
    }

    // Get user profiles for all users who liked the current user - need to join personal and profile tables
    const likerUserIds = likesReceived.map(like => like.sender_id);
    const { data: likerUsers, error: usersError } = await supabase
      .from('personal')
      .select(`
        id,
        name,
        sex,
        birthdate,
        profile!inner(
          bio,
          interests,
          images,
          residence
        )
      `)
      .in('id', likerUserIds);

    if (usersError) {
      console.error('❌ Error fetching liker users:', usersError);
      throw usersError;
    }

    // Process likes to get the liker's profile and add metadata
    const processedLikes = await Promise.all(
      likesReceived.map(async (like) => {
        // Find the liker's profile
        const likerUser = likerUsers.find(user => user.id === like.sender_id);

        if (!likerUser) {
          console.warn(`⚠️ Missing user profile for liker ${like.sender_id}`);
          return null;
        }

        // Extract profile data from the joined query result
        const profileData = likerUser.profile;

        // Calculate age
        const age = likerUser.birthdate ? 
          Math.floor((new Date() - new Date(likerUser.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get first photo from database images array or fallback to storage
        let photoUrls = [];
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrls = profileData.images; // Use all images from database
        } else {
          // Fallback to storage if no images in database
          try {
            const storagePhotoUrl = await getSignedPhotoUrl(likerUser.id);
            if (storagePhotoUrl) {
              photoUrls = [storagePhotoUrl];
            }
          } catch (photoError) {
            console.error('Error fetching photo for liker:', likerUser.id, photoError);
          }
        }

        return {
          id: likerUser.id,
          name: likerUser.name || 'Anonymous',
          age: age,
          bio: profileData.bio || 'No bio available',
          interests: profileData.interests || [],
          image: photoUrls.length > 0 ? photoUrls[0] : null, // Single image for backward compatibility
          images: photoUrls, // Array of images for carousel
          sex: likerUser.sex,
          residence: profileData.residence || null,
          distance: null, // Simplified - no distance calculation
          withinDistance: true // Simplified - include all likes
        };
      })
    );

    // Filter out null entries
    const validLikes = processedLikes.filter(like => like !== null);

    console.log(`✅ Successfully processed ${validLikes.length} likes`);
    return validLikes;

  } catch (error) {
    console.error('❌ Error in getUsersWhoLikedMe:', error);
    throw error;
  }
};

// Function to get matches for the current user
export const getMatches = async () => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`🔍 Finding matches for user: ${currentUser.id}`);

    // Get current user's matches from the match table (only active matches)
    const { data: userMatches, error: matchesError } = await supabase
      .from('match')
      .select('id, user_1_id, user_2_id, created_at')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .eq('active', true);

    // Get current user's profile to access geolocation
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profile')
      .select('geolocation')
      .eq('id', currentUser.id)
      .single();

    if (matchesError) {
      console.error('❌ Error fetching current user matches:', matchesError);
      throw matchesError;
    }

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserGeolocation = currentUserProfile?.geolocation;
    const matches = userMatches || [];

    console.log(`📊 Found ${matches.length} matches`);

    if (matches.length === 0) {
      return [];
    }

    // Get user profiles for all matched users - need to join personal and profile tables
    const matchedUserIds = matches.map(match => 
      match.user_1_id === currentUser.id ? match.user_2_id : match.user_1_id
    );
    const { data: matchedUsers, error: usersError } = await supabase
      .from('personal')
      .select(`
        id,
        name,
        sex,
        birthdate,
        profile!inner(
          bio,
          interests,
          images,
          residence,
          geolocation
        )
      `)
      .in('id', matchedUserIds);

    if (usersError) {
      console.error('❌ Error fetching matched users:', usersError);
      throw usersError;
    }

    // Process matches to get the other user's profile and add metadata
    const processedMatches = await Promise.all(
      matches.map(async (match) => {
        // Find the other user's profile
        const otherUserId = match.user_1_id === currentUser.id ? match.user_2_id : match.user_1_id;
        const otherUser = matchedUsers.find(user => user.id === otherUserId);

        if (!otherUser) {
          console.warn(`⚠️ Missing user profile for match with user ${otherUserId}`);
          return null;
        }

        // Ensure we have a valid match ID
        if (!match.id) {
          console.warn(`⚠️ Missing match ID for match between users ${currentUser.id} and ${otherUser.id}`);
          return null;
        }

        // Extract profile data from the joined query result
        const profileData = otherUser.profile;

        // Calculate age
        const age = otherUser.birthdate ? 
          Math.floor((new Date() - new Date(otherUser.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance if both users have geolocation data
        let distance = null;
        
        if (currentUserGeolocation && profileData.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const otherUserCoords = Array.isArray(profileData.geolocation) ? profileData.geolocation : JSON.parse(profileData.geolocation);
            
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
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrl = profileData.images[0]; // Use first image from database
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
          matchId: match.id, // Only use the actual match ID from database
          name: otherUser.name || 'Anonymous',
          age: age,
          bio: profileData.bio || 'No bio available',
          interests: profileData.interests || [],
          photo: photoUrl,
          residence: profileData.residence || null,
          distance: distance,
          userScore: null, // Quiz scores are now stored in user_1_score and user_2_score fields
          otherUserScore: null, // Not available in new schema
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

// Function to discard a like (remove like record from like table)
export const discardLike = async (discardedUserId) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log(`❌ User ${currentUser.id} is discarding like from user ${discardedUserId}`);
    
    // Deactivate like (discardedUser -> currentUser) by setting active to false
    const { data: deactivatedLike, error: deactivateError } = await supabase
      .from('like')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('sender_id', discardedUserId)
      .eq('receiver_id', currentUser.id)
      .select('id')
      .single();
    
    if (deactivateError) {
      console.error('❌ Error deactivating like:', deactivateError);
      // Check if it's because the like doesn't exist
      if (deactivateError.code === 'PGRST116') {
        console.log('📭 Like was already deactivated or never existed');
        return { success: true, alreadyDiscarded: true };
      }
      throw deactivateError;
    }
    
    console.log('✅ Like deactivated successfully');
    return { success: true, alreadyDiscarded: false };
  } catch (error) {
    console.error('❌ Error in discardLike:', error);
    throw error;
  }
};


// Function to unmatch users using match ID 
export const unmatchUsers= async (matchId) => {
  try {
    console.log(`❌ Unmatching using match ID: ${matchId}`);
    console.log(`🔍 matchId type: ${typeof matchId}`);
    console.log(`🔍 matchId length: ${matchId?.length}`);

    // Validate matchId format (should be a UUID)
    if (!matchId || typeof matchId !== 'string' || matchId.length !== 36) {
      console.error('❌ Invalid matchId format:', matchId);
      throw new Error('Invalid match ID format');
    }

    // First, let's check if the match exists and get its current state
    const { data: matches, error: matchError } = await supabase
      .from('match')
      .select('id, user_1_id, user_2_id, active')
      .eq('id', matchId);

    if (matchError) {
      console.error('❌ Error fetching match:', matchError);
      throw matchError;
    }

    if (!matches || matches.length === 0) {
      console.error('❌ Could not find match for match ID:', matchId);
      throw new Error('Match not found');
    }

    const match = matches[0];
    console.log(`🔍 Found match record:`, match);
    console.log(`🔍 Current active status: ${match.active}`);

    // Check if match is already inactive
    if (!match.active) {
      console.log(`⚠️ Match ${matchId} is already inactive`);
      return true; // Return success since the goal is already achieved
    }

    const user1Id = match.user_1_id;
    const user2Id = match.user_2_id;

    console.log(`🔍 Found users involved in match: ${user1Id} and ${user2Id}`);

    // Clear all messages for this match
    const { error: clearMessagesError } = await supabase
      .from('message')
      .delete()
      .eq('match_id', matchId);
    
    if (clearMessagesError) {
      console.error('❌ Error clearing messages:', clearMessagesError);
      throw clearMessagesError;
    }

    console.log(`✅ Messages cleared successfully`);

    // Deactivate the match record by setting active to false
    const { data: updatedMatches, error: deactivateMatchError } = await supabase
      .from('match')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', matchId)
      .eq('active', true) // Only update if currently active
      .select('active');
    
    if (deactivateMatchError) {
      console.error('❌ Error deactivating match:', deactivateMatchError);
      throw deactivateMatchError;
    }

    if (!updatedMatches || updatedMatches.length === 0) {
      console.error('❌ No rows were updated for match ID:', matchId);
      console.log(`🔍 This could mean the match was already inactive or the match ID is invalid`);
      // Don't throw an error, just return success since the goal is achieved
      return true;
    }

    const updatedMatch = updatedMatches[0];
    console.log(`✅ Match deactivated successfully. New active status: ${updatedMatch?.active}`);

    console.log(`✅ Successfully unmatched users ${user1Id} and ${user2Id}`);
    return true;

  } catch (error) {
    console.error('❌ Error in unmatchUsers:', error);
    throw error;
  }
};

// ===== CHAT FUNCTIONS =====

// Function to send a message 
export const sendMessage = async (roomId, content) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Since roomId is now a match ID, we need to verify the match exists and current user is part of it (only active matches)
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('*')
      .eq('id', roomId)
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .eq('active', true)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found for room ID:', roomId);
      throw new Error('Match not found');
    }

    // Create new message in the message table
    const { data: newMessage, error: messageError } = await supabase
      .from('message')
      .insert([
        {
          match_id: roomId,
          sender_id: currentUser.id,
          receiver_id: match.user_1_id === currentUser.id ? match.user_2_id : match.user_1_id,
          content: content,
        }
      ])
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error creating message:', messageError);
      throw messageError;
    }

    // Get current user's name for the response
    const { data: userProfile, error: userError } = await supabase
      .from('profile')
      .select('name')
      .eq('id', currentUser.id)
      .single();

    // Format the message to match the structure expected by the chat component
    const formattedMessage = {
      id: newMessage.id, // Use the actual message ID from the database
      content: newMessage.content,
      created_at: newMessage.created_at,
      sender_id: currentUser.id,
      sender_name: userProfile?.name || 'You'
    };

    return formattedMessage;
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    throw error;
  }
};

// Function to get messages
export const getMessages = async (roomId, limit = 50, offset = 0) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Verify the match exists and current user is part of it (only active matches)
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('*')
      .eq('id', roomId)
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .eq('active', true)
      .single();

    if (matchError || !match) {
      console.error('❌ Match not found for room ID:', roomId);
      throw new Error('Match not found');
    }

    // Get messages from the message table
    const { data: messages, error: messagesError } = await supabase
      .from('message')
      .select('*')
      .eq('match_id', roomId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      throw messagesError;
    }
    
    if (!messages || messages.length === 0) {
      return [];
    }

    // Get all unique sender IDs
    const senderIds = [...new Set(messages.map(message => message.sender_id))];

    // Get user profiles for all senders
    const { data: userProfiles, error: usersError } = await supabase
      .from('profile')
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
    const processedMessages = messages.map(message => ({
      id: message.id, // Use the actual message ID from the database
      content: message.content,
      created_at: message.created_at,
      sender_id: message.sender_id,
      sender_name: userMap[message.sender_id]?.name || 'Unknown User'
    }));

    // Sort by created_at and apply limit/offset
    const sortedMessages = processedMessages.sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    const paginatedMessages = sortedMessages.slice(offset, offset + limit);
    return paginatedMessages;
  } catch (error) {
    console.error('❌ Error in getMessages:', error);
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

      // In new schema, we need to subscribe to message table updates
      const subscription = supabase
        .channel(`messages:${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'message',
            filter: `match_id=eq.${roomId}`
          },
          (payload) => {
            console.log('📨 Message inserted:', payload);
            
            if (payload.new) {
              callback(payload.new, 'insert');
            }
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
    });
  });
};

// Function to delete a message
export const deleteMessage = async (messageId) => {
  try {
    console.log(`🗑️ Attempting to delete message with ID: ${messageId}`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // First, get the message to verify it exists and the user is the sender
    const { data: message, error: messageError } = await supabase
      .from('message')
      .select('*')
      .eq('id', messageId)
      .eq('sender_id', currentUser.id)
      .single();

    if (messageError || !message) {
      console.error('❌ Message not found or user is not the sender:', messageError);
      throw new Error('Message not found or you are not authorized to delete this message');
    }

    // Delete the message
    const { error: deleteError } = await supabase
      .from('message')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', currentUser.id);

    if (deleteError) {
      console.error('❌ Error deleting message:', deleteError);
      throw deleteError;
    }

    console.log('✅ Message deleted successfully');
    return { success: true, messageId };
  } catch (error) {
    console.error('❌ Error in deleteMessage:', error);
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

    // Get likes received by current user using the like table (only active likes)
    const { data: likesReceived, error: likesError } = await supabase
      .from('like')
      .select('created_at, sender_id')
      .eq('receiver_id', currentUser.id)
      .eq('active', true)

    if (likesError) {
      console.error('❌ Error fetching likes received:', likesError);
      throw likesError;
    }

    // Count likes received after the last viewed time
    const newLikesCount = likesReceived ? likesReceived.length : 0;

    console.log(`✅ New likes count: ${newLikesCount}`);
    return newLikesCount;
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

    // Get current user's matches from match table (only active matches)
    const { data: userMatches, error: matchesError } = await supabase
      .from('match')
      .select('id, user_1_id, user_2_id, created_at')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .eq('active', true);

    if (matchesError) {
      console.error('❌ Error fetching current user matches:', matchesError);
      throw matchesError;
    }
  
    console.log(`✅ New matches count: ${userMatches.length}`);
    return userMatches.length;
  } catch (error) {
    console.error('❌ Error in getNewMatchesCount:', error);
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
    const { geocodeCoordinates } = await import('./google.js');
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
    
    // Get personal data from personal table (immutable)
    const { data: personal, error: personalError } = await supabase
      .from('personal')
      .select('id, name, sex, birthdate')
      .eq('id', userId)
      .single();

    if (personalError) {
      console.error('❌ Error getting user personal data:', personalError);
      throw personalError;
    }

    // Get profile data from profile table (updatable)
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('id, bio, interests, images, residence, geolocation')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error getting user profile data:', profileError);
      throw profileError;
    }

    console.log(`✅ Retrieved profile data for ${personal.name}`);
    return {
      id: personal.id,
      name: personal.name,
      bio: profile.bio || '',
      interests: profile.interests || [],
      birthday: personal.birthdate,
      sex: personal.sex,
      images: profile.images || [],
      residence: profile.residence || null,
      geolocation: profile.geolocation || null,
      quiz: [] // Quiz data is stored in separate quiz table
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
      .from('profile')
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

    // 2. Delete user's like records (both sent and received)
    try {
      // Delete likes sent by this user
      const { error: sentLikesError } = await supabase
        .from('like')
        .delete()
        .eq('sender_id', userId);
      
      if (sentLikesError) {
        console.error('❌ Error deleting sent likes:', sentLikesError);
      } else {
        console.log('✅ User sent likes deleted');
      }

      // Delete likes received by this user
      const { error: receivedLikesError } = await supabase
        .from('like')
        .delete()
        .eq('receiver_id', userId);
      
      if (receivedLikesError) {
        console.error('❌ Error deleting received likes:', receivedLikesError);
      } else {
        console.log('✅ User received likes deleted');
      }
    } catch (likeError) {
      console.error('❌ Error handling like deletion:', likeError);
    }

    // 3. Remove user from other users' matches and clear messages
    try {
      // Get all matches that involve the user being deleted
      const { data: userMatches, error: matchesError } = await supabase
        .from('match')
        .select('*')
        .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`);

      if (!matchesError && userMatches) {
        console.log(`🗑️ Found ${userMatches.length} matches for user ${userId}`);
        
        // Delete all matches involving this user
        for (const match of userMatches) {
          const { error: deleteMatchError } = await supabase
            .from('match')
            .delete()
            .eq('id', match.id);
          
          if (deleteMatchError) {
            console.error(`❌ Error deleting match ${match.id}:`, deleteMatchError);
          }
        }
        
        console.log('✅ Deleted all matches for user');
      }

    } catch (matchesError) {
      console.error('❌ Error handling matches deletion:', matchesError);
    }

    // 4. Remove user from other users' likes (no longer needed in new schema)
    // In the new schema, likes are stored as individual records in the like table
    // When we delete the user's like records above, they're automatically removed
    console.log('✅ User likes automatically removed from like table');

    // 5. Quiz data is stored in the quiz table, so it will be deleted separately
    console.log('✅ Quiz data will be deleted from quiz table');

    // 6. Delete user records from all tables
    try {
      // Delete from personal table
      const { error: personalError } = await supabase
        .from('personal')
        .delete()
        .eq('id', userId);
      
      if (personalError) {
        console.error('❌ Error deleting user personal data:', personalError);
      } else {
        console.log('✅ User personal data deleted');
      }

      // Delete from profile table
      const { error: profileError } = await supabase
        .from('profile')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('❌ Error deleting user profile:', profileError);
      } else {
        console.log('✅ User profile deleted');
      }

      // Delete from quiz table
      const { error: quizError } = await supabase
        .from('quiz')
        .delete()
        .eq('id', userId);
      
      if (quizError) {
        console.error('❌ Error deleting user quiz:', quizError);
      } else {
        console.log('✅ User quiz deleted');
      }

      // Delete from user table
      const { error: userError } = await supabase
        .from('user')
        .delete()
        .eq('id', userId);
      
      if (userError) {
        console.error('❌ Error deleting user record:', userError);
      } else {
        console.log('✅ User record deleted');
      }

    } catch (deleteError) {
      console.error('❌ Error handling user deletion:', deleteError);
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

// Function to disable user account (set disabled = true)
export const disableUserAccount = async () => {
  try {
    console.log('⏸️ Starting account disable process');
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const userId = currentUser.id;
    console.log(`⏸️ Disabling account for user: ${userId}`);

    // Update user to set disabled = true
    const { error: updateError } = await supabase
      .from('user')
      .update({ disabled: true })
      .eq('id', userId);
    
    if (updateError) {
      console.error('❌ Error disabling user account:', updateError);
      throw new Error('Failed to disable account. Please try again.');
    }
    
    console.log('✅ Account disabled successfully');
    
    // Sign out the user
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error('❌ Error signing out after disable:', signOutError);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error in disableUserAccount:', error);
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
          .from('profile')
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

// Function to get users within x miles using geolocation or residence-based filtering
export const getUsersWithinDistance = async (maxDistance = 50, limit = 10) => {
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
      .from('profile')
      .select('residence, geolocation')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserResidence = currentUserProfile?.residence;
    const currentUserGeolocation = currentUserProfile?.geolocation;

    // Get users that the current user has already liked
    const { data: userLikes, error: likeError } = await supabase
      .from('like')
      .select('receiver_id')
      .eq('sender_id', currentUser.id);

    if (likeError) {
      console.error('❌ Error fetching current user likes:', likeError);
      throw likeError;
    }

    let likedUserIds = [];
    if (userLikes && Array.isArray(userLikes)) {
      likedUserIds = userLikes.map(like => like.receiver_id);
    }

    // Get users who have already liked the current user
    const { data: usersWhoLikedMe, error: likedMeError } = await supabase
      .from('like')
      .select('sender_id')
      .eq('receiver_id', currentUser.id);

    if (likedMeError) {
      console.error('❌ Error fetching users who liked me:', likedMeError);
      throw likedMeError;
    }

    let usersWhoLikedMeIds = [];
    if (usersWhoLikedMe && Array.isArray(usersWhoLikedMe)) {
      usersWhoLikedMeIds = usersWhoLikedMe.map(like => like.sender_id);
    }

    // Get users that the current user has already matched with (only active matches)
    let matchedUserIds = [];
    const { data: userMatches, error: matchesError } = await supabase
      .from('match')
      .select('user_1_id, user_2_id')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .eq('active', true);

    if (!matchesError && userMatches) {
      matchedUserIds = userMatches.map(match => 
        match.user_1_id === currentUser.id ? match.user_2_id : match.user_1_id
      );
    }

    console.log(`💕 Excluding ${likedUserIds.length} already liked users from distance filter`);
    console.log(`💕 Excluding ${usersWhoLikedMeIds.length} users who already liked me from distance filter`);
    console.log(`💕 Excluding ${matchedUserIds.length} already matched users from distance filter`);

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

    // Get all user profiles (excluding current user) - need to join personal and profile tables
    const { data: allProfiles, error: profilesError } = await supabase
      .from('personal')
      .select(`
        id,
        name,
        sex,
        birthdate,
        profile!inner(
          bio,
          interests,
          images,
          residence,
          geolocation
        )
      `)
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
        // Extract profile data from the joined query result
        const profileData = profile.profile;
        
        // Calculate age
        const age = profile.birthdate ? 
          Math.floor((new Date() - new Date(profile.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate distance using the best available method
        let distance = null;
        let withinDistance = true; // Default to true if no location data
        let distanceMethod = 'unknown';
        
        // Method 1: Both users have geolocation (location sharing enabled)
        if (currentUserGeolocation && profileData.geolocation) {
          try {
            const currentUserCoords = Array.isArray(currentUserGeolocation) ? currentUserGeolocation : JSON.parse(currentUserGeolocation);
            const profileCoords = Array.isArray(profileData.geolocation) ? profileData.geolocation : JSON.parse(profileData.geolocation);
            
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
        if (distance === null && currentUserResidence && profileData.residence) {
          try {
            const { calculateAddressDistance } = await import('./google.js');
            distance = await calculateAddressDistance(currentUserResidence, profileData.residence);
            
            if (distance !== null) {
              withinDistance = distance <= userMaxDistance;
              distanceMethod = 'residence_to_residence';
              console.log(`📍 Residence-to-residence distance to ${profile.name}: ${distance} miles (max: ${userMaxDistance})`);
            } else {
              // If address distance calculation fails, check if they're in the same residence
              const sameResidence = currentUserResidence === profileData.residence;
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
            const sameResidence = currentUserResidence === profileData.residence;
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
          if (currentUserGeolocation && profileData.residence) {
            // Current user has geolocation, profile has residence
            try {
              const { reverseGeocodeAddress } = await import('./google.js');
              const profileCoords = await reverseGeocodeAddress(profileData.residence);
              
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
          } else if (currentUserResidence && profileData.geolocation) {
            // Current user has residence, profile has geolocation
            try {
              const { reverseGeocodeAddress } = await import('./google.js');
              const currentUserCoords = await reverseGeocodeAddress(currentUserResidence);
              
              if (currentUserCoords) {
                const profileCoords = Array.isArray(profileData.geolocation) ? profileData.geolocation : JSON.parse(profileData.geolocation);
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
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrls = profileData.images;
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
          bio: profileData.bio || 'No bio available',
          interests: profileData.interests || [],
          image: photoUrls.length > 0 ? photoUrls[0] : null,
          images: photoUrls,
          sex: profile.sex,
          residence: profileData.residence || null,
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

    // Filter out users that the current user has already liked, users who have already liked the current user, or matched with
    const filteredProfiles = processedProfiles.filter(profile => 
      !likedUserIds.includes(profile.id) && 
      !usersWhoLikedMeIds.includes(profile.id) && 
      !matchedUserIds.includes(profile.id)
    );

    // Filter profiles by distance and sort by distance (closest first)
    const distanceFilteredProfiles = filteredProfiles
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

    console.log(`✅ Found ${distanceFilteredProfiles.length} users within ${maxDistance} miles (after excluding ${likedUserIds.length} already liked users, ${usersWhoLikedMeIds.length} users who already liked me, and ${matchedUserIds.length} already matched users)`);
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
    
    // Priority 1: Both users have residences - compare residences first (even if one also has geolocation)
    if (currentUserResidence && profileResidence) {
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
          const { calculateAddressDistance } = await import('./google.js');
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
    
    // Priority 2: Both users have geolocation (location sharing enabled)
    if (distance === null && currentUserGeolocation && profileGeolocation) {
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
    
    // Priority 3: Current user has geolocation, profile has residence (location sharing mixed)
    if (distance === null && currentUserGeolocation && profileResidence) {
      try {
        const { reverseGeocodeAddress } = await import('./google.js');
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
    
    // Priority 4: Current user has residence, profile has geolocation (location sharing mixed)
    if (distance === null && currentUserResidence && profileGeolocation) {
      try {
        const { reverseGeocodeAddress } = await import('./google.js');
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

// Function to generate quiz questions, answers, and fake answers
export const generateQuiz = async (userId, numQuestions = 10) => {
  try {
    console.log(`🤖 Generating quiz for user: ${userId} with ${numQuestions} questions`);
    
    // Get user profile data to personalize the quiz
    const { data: userProfile, error: profileError } = await supabase
      .from('profile')
      .select('name, bio, interests, birthday')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile for quiz generation:', profileError);
      throw new Error('Failed to fetch user profile for quiz generation');
    }

    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Calculate user's age
    const age = userProfile.birthday ? 
      Math.floor((new Date() - new Date(userProfile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    // Create a comprehensive prompt for Gemini
    const prompt = `You are creating a "Get to Know Me" quiz for a dating app user. 

USER PROFILE:
- Name: ${userProfile.name || 'User'}
- Bio: ${userProfile.bio || 'No bio provided'}
- Interests: ${userProfile.interests?.length > 0 ? userProfile.interests.join(', ') : 'No interests specified'}
- Age: ${age || 'Not specified'}

TASK: Generate exactly ${numQuestions} questions with answers based on the user's profile information.

REQUIREMENTS:
1. Create exactly ${numQuestions} questions that are personal, fun, and reveal interesting things about the user
2. Questions should be based on their interests, bio, and personality traits
3. Each question must have a specific, personal answer
4. For each question, provide exactly 3 fake/incorrect answers that are plausible but wrong
5. Questions should be engaging and help potential matches learn about the user
6. Mix different types of questions (favorites, experiences, preferences, personality traits, etc.)

RESPONSE FORMAT: You must respond with ONLY a valid JSON array. No other text.
Each inner array must contain exactly 5 elements: [question, correct_answer, fake_answer1, fake_answer2, fake_answer3]

EXAMPLE FORMAT:
[
  ["What's my favorite movie?", "The Matrix", "Inception", "Interstellar", "The Dark Knight"],
  ["What's my dream vacation destination?", "Japan", "Italy", "Australia", "Brazil"],
  ["What's my biggest fear?", "Spiders", "Heights", "Public Speaking", "Flying"],
  ["What's my favorite food?", "Pizza", "Sushi", "Tacos", "Burgers"],
  ["What's my ideal weekend activity?", "Hiking", "Netflix marathon", "Shopping", "Cooking"],
  ["What's my favorite season?", "Fall", "Summer", "Spring", "Winter"],
  ["What's my dream job?", "Software Engineer", "Doctor", "Teacher", "Artist"],
  ["What's my favorite music genre?", "Rock", "Pop", "Hip Hop", "Jazz"],
  ["What's my biggest accomplishment?", "Graduating college", "Running a marathon", "Learning guitar", "Traveling solo"],
  ["What's my favorite way to relax?", "Reading", "Gaming", "Meditation", "Yoga"]
]

IMPORTANT: 
- Respond with ONLY the JSON array, no additional text
- Use the user's actual interests and bio to create personalized questions
- If the user has limited profile info, create general personality questions
- Ensure all questions are appropriate for a dating app context
- Each question must have exactly 3 fake answers
- Generate exactly ${numQuestions} questions`;

    // Import the Gemini function
    const { promptGemini } = await import('./gemini.js');
    
    console.log('🤖 Sending prompt to Gemini for quiz generation...');
    const response = await promptGemini(prompt);
    console.log('🤖 Raw Gemini response:', response);
    
    // Parse the response to extract the quiz data
    let quizData;
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to parse as JSON first
      quizData = JSON.parse(cleanedResponse);
      console.log('✅ Successfully parsed JSON:', quizData);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.log('🔍 Attempting to extract array from response...');
      
      // If JSON parsing fails, try to extract array from the response
      const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          quizData = JSON.parse(arrayMatch[0]);
          console.log('✅ Successfully extracted and parsed array:', quizData);
        } catch (secondParseError) {
          console.error('❌ Second parse error:', secondParseError);
          throw new Error('Failed to parse quiz data from Gemini response. Please try again.');
        }
      } else {
        console.error('❌ No array found in response');
        throw new Error('No valid quiz data found in Gemini response. Please try again.');
      }
    }

    // Validate the quiz data
    if (!Array.isArray(quizData)) {
      throw new Error('Generated quiz data is not an array');
    }
    
    if (quizData.length !== numQuestions) {
      throw new Error(`Generated quiz must have exactly ${numQuestions} questions, got ${quizData.length}`);
    }

    // Validate each question has question, answer, and 3 fake answers
    for (let i = 0; i < quizData.length; i++) {
      if (!Array.isArray(quizData[i])) {
        throw new Error(`Question ${i + 1} is not an array`);
      }
      if (quizData[i].length !== 5) {
        throw new Error(`Question ${i + 1} must have exactly 5 elements (question, answer, fake_answer1, fake_answer2, fake_answer3), got ${quizData[i].length}`);
      }
      if (!quizData[i][0] || !quizData[i][1] || !quizData[i][2] || !quizData[i][3] || !quizData[i][4]) {
        throw new Error(`Question ${i + 1} cannot have empty question, answer, or fake answers`);
      }
    }

    // Extract questions, answers, and fake answers for database storage
    const questions = quizData.map(item => item[0]);
    const answers = quizData.map(item => item[1]);
    const fakeAnswers = quizData.map(item => [item[2], item[3], item[4]]);

    // Save the generated quiz to the database
    const { data, error } = await supabase
      .from('quiz')
      .upsert({
        id: userId,
        questions: questions,
        answers: answers,
        fake_answers: fakeAnswers,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error saving generated quiz:', error);
      throw error;
    }

    console.log(`✅ Quiz generated and saved successfully for user: ${userId}`);
    return {
      questions: quizData,
      data: data
    };
  } catch (error) {
    console.error('❌ Error in generateQuiz:', error);
    throw error;
  }
};

// Function to create or update a user's quiz
export const createOrUpdateQuiz = async (userId, quizData) => {
  try {
    console.log(`📝 Creating/updating quiz for user: ${userId}`);
    
    // Extract questions, answers, and fake answers from quizData
    const questions = quizData.map(item => item[0]);
    const answers = quizData.map(item => item[1]);
    const fakeAnswers = quizData.map(item => [item[2], item[3], item[4]]);

    // Convert fake_answers array to JSON string for storage as text
    const fakeAnswersText = JSON.stringify(fakeAnswers);

    // Update the user's quiz in the quiz table
    const { data, error } = await supabase
      .from('quiz')
      .upsert({
        id: userId,
        questions: questions,
        answers: answers,
        fake_answers: fakeAnswersText,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating quiz:', error);
      throw error;
    }

    console.log(`✅ Quiz updated successfully for user: ${userId}`);
    return data;
  } catch (error) {
    console.error('❌ Error in createOrUpdateQuiz:', error);
    throw error;
  }
};

// Function to get a user's quiz
export const getUserQuiz = async (userId) => {
  try {
    console.log(`📋 Getting quiz for user: ${userId}`);
    
    const { data: userQuiz, error } = await supabase
      .from('quiz')
      .select('questions, answers, fake_answers')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ Error getting user quiz:', error);
      throw error;
    }

    if (!userQuiz || !userQuiz.questions || userQuiz.questions.length === 0) {
      console.log(`📋 No quiz found for user: ${userId}`);
      return null;
    }

    // Parse fake_answers from JSON string
    let fakeAnswers = [];
    try {
      if (userQuiz.fake_answers) {
        fakeAnswers = JSON.parse(userQuiz.fake_answers);
      }
    } catch (parseError) {
      console.warn('⚠️ Error parsing fake_answers, using empty array:', parseError);
      fakeAnswers = [];
    }

    // Format the quiz data to match the expected structure for QuizTaker component
    const formattedQuiz = userQuiz.questions.map((question, index) => {
      const correctAnswer = userQuiz.answers[index];
      const questionFakeAnswers = fakeAnswers[index] || [];
      
      // Create options array with correct answer and fake answers
      const options = [correctAnswer];
      
      // Add fake answers to options
      questionFakeAnswers.forEach(fakeAnswer => {
        if (fakeAnswer && !options.includes(fakeAnswer)) {
          options.push(fakeAnswer);
        }
      });
      
      // Shuffle the options to randomize the order
      const shuffledOptions = options.sort(() => Math.random() - 0.5);
      
      return {
        question: question,
        options: shuffledOptions,
        correctAnswer: correctAnswer
      };
    });

    console.log(`✅ Retrieved quiz for user: ${userId} with ${formattedQuiz.length} questions`);
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
    
    // Get the quiz owner's quiz from the quiz table
    const { data: userQuiz, error } = await supabase
      .from('quiz')
      .select('questions, answers')
      .eq('id', quizOwnerId)
      .single();

    if (error) {
      console.error('❌ Error fetching quiz:', error);
      throw error;
    }

    // Handle case where no quiz is found
    if (!userQuiz || !userQuiz.questions || userQuiz.questions.length === 0) {
      console.log(`📋 No quiz found for user: ${quizOwnerId}`);
      throw new Error('Quiz not found for this user');
    }

    const quizQuestions = userQuiz.questions;
    const quizAnswers = userQuiz.answers;

    // Calculate score by comparing answers with correct answers
    let correctAnswers = 0;
    const totalQuestions = quizQuestions.length;

    for (let i = 0; i < totalQuestions; i++) {
      if (answers[i] && quizAnswers[i] && answers[i] === quizAnswers[i]) {
        correctAnswers++;
      }
    }

    const score = parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(2));
    
    console.log(`📊 Quiz score calculated: ${score}% (${correctAnswers}/${totalQuestions})`);
    return { score, correctAnswers, totalQuestions };
  } catch (error) {
    console.error('❌ Error in submitQuizAnswers:', error);
    throw error;
  }
};

export const saveQuizScore = async (quizOwnerId, quizTakerId, score) => {
  try {
    console.log(`💾 Saving quiz score: ${score}% for quiz taker ${quizTakerId} on quiz owner ${quizOwnerId}`);
    
    // Validate input parameters
    if (!quizOwnerId || !quizTakerId || score === undefined || score === null) {
      throw new Error('Missing required parameters: quizOwnerId, quizTakerId, and score are required');
    }

    // Ensure score is a valid number between 0 and 100
    const numericScore = parseFloat(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      throw new Error('Score must be a valid number between 0 and 100');
    }

    // Find the match between the two users
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('*')
      .or(`and(user_1_id.eq.${quizTakerId},user_2_id.eq.${quizOwnerId}),and(user_1_id.eq.${quizOwnerId},user_2_id.eq.${quizTakerId})`)
      .single();

    if (matchError || !match) {
      console.error('❌ No existing match found between users');
      throw new Error('Cannot save quiz score: No existing match found between the users. A match must exist before saving quiz scores.');
    }

    console.log(`✅ Found existing match: ${match.id}`);

    // Determine which user is user_1 and which is user_2 to update the correct score field
    let updateData = {};
    if (match.user_1_id === quizTakerId) {
      // Quiz taker is user_1, quiz owner is user_2
      updateData = { user_1_score: numericScore };
    } else {
      // Quiz taker is user_2, quiz owner is user_1
      updateData = { user_2_score: numericScore };
    }

    // Update the match with the quiz score
    const { error: updateError } = await supabase
      .from('match')
      .update(updateData)
      .eq('id', match.id);

    if (updateError) {
      console.error('❌ Error updating match with quiz score:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully updated quiz score to ${numericScore}%`);
    return { success: true, score: numericScore };
  } catch (error) {
    console.error('❌ Error in saveQuizScore:', error);
    throw error;
  }
};

// Function to get quiz score for a specific quiz owner
export const getQuizScore = async (quizTakerId) => {
  try {
    console.log(`📊 Getting quiz score for quiz taker: ${quizTakerId}`);
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated');
    }

    // Get the match between current user and quiz owner
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('user_1_id, user_2_id, user_1_score, user_2_score')
      .or(`and(user_1_id.eq.${currentUser.id},user_2_id.eq.${quizTakerId}),and(user_1_id.eq.${quizTakerId},user_2_id.eq.${currentUser.id})`)
      .single();

    if (matchError || !match) {
      console.log(`📭 No match found between current user and quiz taker: ${quizTakerId}`);
      return null;
    }

    // Determine which score field to use based on who is user_1 vs user_2
    let score = null;
    if (match.user_1_id === currentUser.id) {
      score = match.user_1_score;
    } else {
      score = match.user_2_score;
    }

    console.log(`✅ Retrieved quiz score: ${score}% for quiz taker: ${quizTakerId}`);
    return score;
  } catch (error) {
    console.error('❌ Error in getQuizScore:', error);
    return null;
  }
};

// Function to get the other user's quiz score on current user's quiz
export const getOtherUserQuizScore = async (otherUserId) => {
  try {
    console.log(`📊 Getting other user's quiz score for user: ${otherUserId}`);
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated');
    }

    // Get the match between current user and other user
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('user_1_id, user_2_id, user_1_score, user_2_score')
      .or(`and(user_1_id.eq.${currentUser.id},user_2_id.eq.${otherUserId}),and(user_1_id.eq.${otherUserId},user_2_id.eq.${currentUser.id})`)
      .single();

    if (matchError || !match) {
      console.log(`📭 No match found between current user and other user: ${otherUserId}`);
      return null;
    }

    // Determine which score field to use based on who is user_1 vs user_2
    let score = null;
    if (match.user_1_id === otherUserId) {
      // Other user is user_1, so get their score (user_1_score)
      score = match.user_1_score;
    } else {
      // Other user is user_2, so get their score (user_2_score)
      score = match.user_2_score;
    }

    console.log(`✅ Retrieved other user's quiz score: ${score}% for user: ${otherUserId}`);
    return score;
  } catch (error) {
    console.error('❌ Error in getOtherUserQuizScore:', error);
    return null;
  }
};

// Function to delete a user's quiz
export const deleteQuiz = async (userId) => {
  try {
    console.log(`🗑️ Deleting quiz for user: ${userId}`);
    
    const { error } = await supabase
      .from('quiz')
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

// Analytics functions for charts
export const getAnalyticsData = async (days = 7) => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📊 Getting analytics data for user: ${currentUser.id} for ${days} days`);
    
    // Calculate date range based on days parameter
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    
    // Get current user's likes sent with timestamps (all likes, active and inactive)
    const { data: likesSent, error: likesError } = await supabase
      .from('like')
      .select('id, created_at')
      .eq('sender_id', currentUser.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get current user's likes received with timestamps (all likes, active and inactive)
    const { data: likesReceived, error: likesReceivedError } = await supabase
      .from('like')
      .select('id, created_at')
      .eq('receiver_id', currentUser.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get current user's matches with timestamps (all matches, active and inactive)
    const { data: matches, error: matchesError } = await supabase
      .from('match')
      .select('id, created_at')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (likesError) {
      console.error('❌ Error fetching user likes sent:', likesError);
      throw likesError;
    }

    if (likesReceivedError) {
      console.error('❌ Error fetching user likes received:', likesReceivedError);
      throw likesReceivedError;
    }

    if (matchesError) {
      console.error('❌ Error fetching user matches:', matchesError);
      throw matchesError;
    }

    // Generate date range for the specified number of days
    const generateDateRange = (numDays) => {
      const dates = [];
      const today = new Date();
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
      }
      return dates;
    };

    const dateRange = generateDateRange(days);

    // Process likes sent data by date
    const likesSentByDate = {};
    likesSent?.forEach(like => {
      const date = like.created_at.split('T')[0];
      likesSentByDate[date] = (likesSentByDate[date] || 0) + 1;
    });

    // Process likes received data by date
    const likesReceivedByDate = {};
    likesReceived?.forEach(like => {
      const date = like.created_at.split('T')[0];
      likesReceivedByDate[date] = (likesReceivedByDate[date] || 0) + 1;
    });

    // Process matches data by date
    const matchesByDate = {};
    matches?.forEach(match => {
      const date = match.created_at.split('T')[0];
      matchesByDate[date] = (matchesByDate[date] || 0) + 1;
    });

    // Create datasets for charts
    const likesSentData = dateRange.map(date => likesSentByDate[date] || 0);
    const likesReceivedData = dateRange.map(date => likesReceivedByDate[date] || 0);
    const matchesData = dateRange.map(date => matchesByDate[date] || 0);

    // Create labels for display (show fewer labels for longer periods)
    const createLabels = (numDays) => {
      if (numDays <= 7) {
        return dateRange.map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      } else if (numDays <= 30) {
        // Show every 3rd day for 8-30 days
        return dateRange.filter((_, index) => index % 3 === 0).map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      } else {
        // Show every 7th day for longer periods
        return dateRange.filter((_, index) => index % 7 === 0).map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      }
    };

    const labels = createLabels(days);

    const analyticsData = {
      likesGiven: {
        labels: labels,
        data: likesSentData
      },
      likesReceived: {
        labels: labels,
        data: likesReceivedData
      },
      matches: {
        labels: labels,
        data: matchesData
      },
      totalLikes: likesSent?.length || 0,
      totalMatches: matches?.length || 0
    };

    console.log(`✅ Analytics data retrieved successfully`);
    return analyticsData;

  } catch (error) {
    console.error('❌ Error in getAnalyticsData:', error);
    throw error;
  }
};

// Get analytics summary data
export const getAnalyticsSummary = async () => {
  try {
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📊 Getting analytics summary for user: ${currentUser.id}`);
    
    // Get likes received (likes where current user is the receiver) - all likes, active and inactive
    const { data: likesReceived, error: likesReceivedError } = await supabase
      .from('like')
      .select('id, created_at')
      .eq('receiver_id', currentUser.id);

    // Get likes given (likes where current user is the sender) - all likes, active and inactive
    const { data: likesGiven, error: likesGivenError } = await supabase
      .from('like')
      .select('id, created_at')
      .eq('sender_id', currentUser.id);

    // Get total matches - all matches, active and inactive
    const { data: matches, error: matchesError } = await supabase
      .from('match')
      .select('id')
      .or(`user_1_id.eq.${currentUser.id},user_2_id.eq.${currentUser.id}`);

    // Get profile views (this would need to be implemented based on your tracking system)
    // For now, we'll use a placeholder
    const profileViews = likesReceived?.length || 0;

    if (likesReceivedError || likesGivenError || matchesError) {
      console.error('❌ Error fetching summary data:', { likesReceivedError, likesGivenError, matchesError });
      throw new Error('Failed to fetch summary data');
    }

    // Calculate metrics
    const totalLikesReceived = likesReceived?.length || 0;
    const totalLikesGiven = likesGiven?.length || 0;
    const totalMatches = matches?.length || 0;
    const matchRate = totalLikesGiven > 0 ? Math.round((totalMatches / totalLikesGiven) * 100) : 0;
    
    // Calculate average likes per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentLikes = likesGiven?.filter(like => 
      new Date(like.created_at) >= sevenDaysAgo
    ) || [];
    const averageLikesPerDay = Math.round(recentLikes.length / 7);

    const summaryData = {
      totalLikesReceived,
      likesGiven: totalLikesGiven,
      totalMatches,
      matchRate,
      profileViews,
      averageLikesPerDay
    };

    console.log(`✅ Analytics summary retrieved successfully`);
    return summaryData;

  } catch (error) {
    console.error('❌ Error in getAnalyticsSummary:', error);
    throw error;
  }
};

