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
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneNumber,
  })
  
  if (error) {
    Alert.alert('Phone Login Error', error.message);
  } else {
    Alert.alert('Success', 'OTP sent to your phone number!');
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
        .from('users')
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
  
  console.log(`Successfully uploaded all ${photos.length} photos for user ${userId}`);
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

// Function to create a match between two users
export const createMatch = async (user1Id, user2Id) => {
  try {
    console.log(`🎉 Creating match between users ${user1Id} and ${user2Id}`);

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

    console.log(`✅ Successfully created match between users ${user1Id} and ${user2Id}`);
    return true;

  } catch (error) {
    console.error('❌ Error creating match:', error);
    throw error;
  }
};

// Function to handle user likes
export const handleUserLike = async (likedUserId) => {
  try {
    console.log(likedUserId)
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`💕 User ${currentUser.id} is liking user ${likedUserId}`);

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

    console.log(`📊 Current user's likes array:`, currentUserLikes);

    // Check if liked user is already in current user's likes array
    if (currentUserLikes.includes(likedUserId)) {
      console.log('⚠️ Liked user already in current user\'s likes array');
      return { success: true, alreadyLiked: true };
    }

    // Add liked user's ID to current user's likes array
    const updatedCurrentUserLikes = [...currentUserLikes, likedUserId];
    console.log(`📝 Updated current user's likes array:`, updatedCurrentUserLikes);

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

    console.log(`✅ Successfully added liked user to current user's likes array`);
    
    // Check if this creates a mutual match (only if the liked user has also liked the current user)
    const isMatch = await checkForMatch(currentUser.id, likedUserId);
    console.log(`🔍 Match check result: ${isMatch}`);
    
    // If it's a match, create the match and remove from likes
    if (isMatch) {
      try {
        // Create the match in the matches table
        await createMatch(currentUser.id, likedUserId);
        console.log(`🎉 Match created successfully between ${currentUser.id} and ${likedUserId}`);
        
        // Remove both users from each other's likes arrays
        await removeFromLikes(currentUser.id, likedUserId);
        console.log(`🗑️ Removed both users from likes arrays`);
        
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
    console.log(`🗑️ Removing users ${user1Id} and ${user2Id} from each other's likes arrays`);

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
        console.log(`✅ Removed user ${user2Id} from user ${user1Id}'s likes`);
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
        console.log(`✅ Removed user ${user1Id} from user ${user2Id}'s likes`);
      }
    }

    console.log(`✅ Successfully removed both users from each other's likes arrays`);

  } catch (error) {
    console.error('❌ Error removing from likes:', error);
    throw error;
  }
};

// Function to check if two users have matched (mutual likes)
export const checkForMatch = async (user1Id, user2Id) => {
  try {
    console.log(`🔍 Checking for match between users ${user1Id} and ${user2Id}`);
    
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

    console.log(`📊 Like status:`, {
      user1likes,
      user2likes,
      user1LikesUser2: user1likes.includes(user2Id),
      user2LikesUser1: user2likes.includes(user1Id)
    });

    // Check if both users have liked each other
    const isMatch = user1likes.includes(user2Id) && user2likes.includes(user1Id);
    
    if (isMatch) {
      console.log(`🎉 MATCH! Users ${user1Id} and ${user2Id} have matched!`);
    } else {
      console.log(`❌ No match between users ${user1Id} and ${user2Id}`);
    }

    return isMatch;

  } catch (error) {
    console.error('❌ Error checking for match:', error);
    return false;
  }
};

// Function to get signed URL for a photo (more reliable than public URLs)
export const getSignedPhotoUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from('users')
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
    console.log(data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedPhotoUrl:', error);
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

    // Get current user's profile to get their interests
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('users')
      .select('sex, birthday, interests')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching current user profile:', profileError);
      throw profileError;
    }

    const currentUserSex = currentUserProfile?.sex;
    const currentUserBirthday = currentUserProfile?.birthday;
    const currentUserInterests = currentUserProfile?.interests || [];

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
      .select('id, name, bio, birthday, sex, interests')
      .neq('id', currentUser.id) // Exclude current user
      .limit(limit * 2); // Get more profiles to allow for better sorting

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

    // Process profiles to add age, photo URLs, and calculate interest matches
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

        // Get first photo from storage
        let photoUrl = null;
        try {
          const { data: files } = await supabase.storage
            .from('users')
            .list(`${profile.id}/`, {
              limit: 1,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (files && files.length > 0) {
            const firstPhoto = files.find(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i));
            if (firstPhoto) {
              photoUrl = supabase.storage.from('users').getSignedPhotoUrl(`${profile.id}/${firstPhoto.name}`).data.signedUrl;
            }
          }
        } catch (photoError) {
          console.error('Error fetching photo for profile:', profile.id, photoError);
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profileInterests,
          matchingInterests: matchingInterests,
          matchScore: matchScore,
          image: photoUrl,
          sex: profile.sex
        };
      })
    );

    // Sort profiles by match score (highest first) and then limit to requested amount
    const sortedProfiles = processedProfiles
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    console.log(`✅ Fetched ${sortedProfiles.length} profiles for swiping, prioritized by interest matches`);
    return sortedProfiles;

  } catch (error) {
    console.error('❌ Error in getSwipeProfiles:', error);
    throw error;
  }
};


// Function to get user's photos with signed URLs
export const getUserPhotos = async (userId) => {
  try {
    const { data: files, error } = await supabase.storage
      .from('users')
      .list(`${userId}/`, {
        limit: 9,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing user photos:', error);
      return [];
    }

    if (!files || files.length === 0) {
      return [];
    }

    // Get signed URLs for each photo
    const photoPromises = files
      .filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i))
      .map(async (file, index) => {
        const signedUrl = await getSignedPhotoUrl(`${userId}/${file.name}`);
        return {
          id: `storage-${index}`,
          uri: signedUrl,
          isExisting: true,
          fileName: file.name
        };
      });

    const photos = await Promise.all(photoPromises);
    return photos.filter(photo => photo.uri !== null);
  } catch (error) {
    console.error('Error in getUserPhotos:', error);
    return [];
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
    console.log(`📋 All likes records:`, allLikesRecords);

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
      
      console.log(`🔍 Checking record ${record.id}, likes array:`, likesArray);
      console.log(`🔍 Current user ID ${currentUser.id} in likes array:`, likesArray.includes(currentUser.id));
      
      if (likesArray.includes(currentUser.id)) {
        usersWhoLikedMe.push(record.id);
        console.log(`✅ Added user ${record.id} to users who liked me`);
      }
    }

    console.log(`📊 Found ${usersWhoLikedMe.length} users who liked current user`);
    console.log(`👥 Users who liked me:`, usersWhoLikedMe);

    if (usersWhoLikedMe.length === 0) {
      console.log(`📭 No users found who liked current user`);
      return [];
    }

    // Get user profiles for all the users who liked the current user
    const { data: userProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id, name, bio, birthday, sex, interests')
      .in('id', usersWhoLikedMe);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    console.log(`👤 User profiles found:`, userProfiles?.length || 0);

    // Process profiles to add age, photo URLs, and other details
    const processedLikes = await Promise.all(
      userProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get first photo from storage
        let photoUrl = null;
        try {
          const { data: files } = await supabase.storage
            .from('users')
            .list(`${profile.id}/`, {
              limit: 1,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (files && files.length > 0) {
            const firstPhoto = files.find(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i));
            if (firstPhoto) {
              const { data: signedUrlData } = await supabase.storage
                .from('users')
                .createSignedUrl(`${profile.id}/${firstPhoto.name}`, 3600);
              photoUrl = signedUrlData?.signedUrl;
            }
          }
        } catch (photoError) {
          console.error('Error fetching photo for profile:', profile.id, photoError);
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profile.interests || [],
          image: photoUrl,
          sex: profile.sex
        };
      })
    );

    console.log(`✅ Successfully processed ${processedLikes.length} likes`);
    console.log(`📋 Final processed likes:`, processedLikes);
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
      .select('id, name, bio, birthday, sex, interests')
      .in('id', matchedUserIds);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    // Process profiles to add age, photo URLs, and other details
    const processedMatches = await Promise.all(
      userProfiles.map(async (profile) => {
        // Calculate age
        const age = profile.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get first photo from storage
        let photoUrl = null;
        try {
          const { data: files } = await supabase.storage
            .from('users')
            .list(`${profile.id}/`, {
              limit: 1,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' }
            });

          if (files && files.length > 0) {
            const firstPhoto = files.find(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i));
            if (firstPhoto) {
              const { data: signedUrlData } = await supabase.storage
                .from('users')
                .createSignedUrl(`${profile.id}/${firstPhoto.name}`, 3600);
              photoUrl = signedUrlData?.signedUrl;
            }
          }
        } catch (photoError) {
          console.error('Error fetching photo for match:', profile.id, photoError);
        }

        return {
          id: profile.id,
          name: profile.name || 'Anonymous',
          age: age,
          bio: profile.bio || 'No bio available',
          interests: profile.interests || [],
          photo: photoUrl,
          lastMessage: 'Start a conversation!',
          timestamp: 'Just matched!'
        };
      })
    );

    console.log(`✅ Successfully processed ${processedMatches.length} matches`);
    return processedMatches;

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
    console.log(`🚫 Unmatching users ${user1Id} and ${user2Id}`);

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
        console.log(`✅ Removed user ${user2Id} from user ${user1Id}'s matches`);
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
        console.log(`✅ Removed user ${user1Id} from user ${user2Id}'s matches`);
      }
    }

    console.log(`✅ Successfully unmatched users ${user1Id} and ${user2Id}`);
    return true;

  } catch (error) {
    console.error('❌ Error unmatching users:', error);
    throw error;
  }
};