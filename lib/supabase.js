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

// Create user profile with new schema structure
export const createUserProfile = async (userId, userData) => {
  try {
    console.log('🔧 createUserProfile called with:', { userId, userData });
    
    // Create user record in user table (immutable data)
    const userRecordData = {
      id: userId,
      name: userData.firstName + ' ' + userData.lastName,
      sex: userData.sex === 'Male', // Convert to boolean: true for male, false for female
      birthdate: new Date(userData.birthday),
    };
    
    console.log('🔧 Inserting user record:', userRecordData);
    
    const { data: userRecord, error: userError } = await supabase
      .from('user')
      .insert([userRecordData])
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user record:', userError);
      throw userError;
    }
    
    console.log('✅ User record created:', userRecord);

    // Create user status record in user_status table
    const userStatusRecordData = {
      id: userId,
      banned: false,
    };
    
    console.log('🔧 Inserting user status record:', userStatusRecordData);
    
    const { data: userStatusData, error: userStatusError } = await supabase
      .from('user_status')
      .insert([userStatusRecordData])
      .select()
      .single();

    if (userStatusError) {
      console.error('❌ Error creating user status record:', userStatusError);
      throw userStatusError;
    }
    
    console.log('✅ User status record created:', userStatusData);

    // Create profile record in user_profile table (updatable data)
    const profileRecordData = {
      id: userId,
      bio: userData.bio || '',
      interests: userData.interests || [],
      images: userData.images || [],
      residence: userData.residence || null,
      geolocation: userData.geolocation || [],
      disabled: false,
    };
    
    console.log('🔧 Inserting profile record:', profileRecordData);
    
    const { data: profileData, error: profileError } = await supabase
      .from('user_profile')
      .insert([profileRecordData])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile record:', profileError);
      throw profileError;
    }
    
    console.log('✅ Profile record created:', profileData);

    const result = { user: userRecord, userStatus: userStatusData, profile: profileData };
    console.log('✅ All user records created successfully:', result);
    return result;
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

    // Check verification status
    const hasEmailConfirmed = !!user.email_confirmed_at;
    
    if (!hasEmailConfirmed) {
      Alert.alert(
        'Email Not Verified',
        'Please verify your email before logging in. Check your inbox for the verification link.',
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
      return;
    }

    // Check if user records exist in all required tables
    const { data: existingUser, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('id', user.id)
      .single();

    const { data: existingUserStatus, error: userStatusError } = await supabase
      .from('user_status')
      .select('*')
      .eq('id', user.id)
      .single();

    // If any of the required records don't exist, create them
    if (userError?.code === 'PGRST116' || profileError?.code === 'PGRST116' || userStatusError?.code === 'PGRST116') {
      console.log('📝 Creating missing user records...');
      
      const registrationData = await AsyncStorage.getItem('registrationData');
      
      if (registrationData) {
        try {
          const userData = JSON.parse(registrationData);
          await createUserProfile(user.id, userData);
          await AsyncStorage.removeItem('registrationData');
          Alert.alert('Success', 'Profile created successfully! Welcome to CUPID!');
        } catch (profileCreationError) {
          console.error('Error creating profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      } else {
        try {
          const basicUserData = {
            firstName: user.user_metadata?.firstName || 'User',
            lastName: user.user_metadata?.lastName || '',
            sex: user.user_metadata?.sex || 'Male',
            birthday: user.user_metadata?.birthday || new Date().toISOString(),
            bio: user.user_metadata?.bio || '',
          };
          
          if (user.email) {
            basicUserData.email = user.email;
          }
          
          if (user.user_metadata?.phone) {
            basicUserData.phone = user.user_metadata.phone;
          }
          
          await createUserProfile(user.id, basicUserData);
          
        } catch (profileCreationError) {
          console.error('Error creating basic profile:', profileCreationError);
          Alert.alert('Warning', 'Profile creation failed. You can complete your profile later in settings.');
        }
      }
    } else if (userError || profileError || userStatusError) {
      console.error('Error checking user records:', { userError, profileError, userStatusError });
    }

    // Update geolocation on login if location sharing is enabled
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profile')
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
            .from('user_profile')
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
    }
    
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
    let formattedPhone = phoneNumber;
    const cleaned = phoneNumber.replace(/\D/g, '');
    
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
      Alert.alert("We texted you a verification code.");
      console.log('✅ OTP sent to phone number:', formattedPhone);
    }
  } catch (error) {
    console.error('Unexpected phone login error:', error);
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
  }
}

export async function verifyPhoneLogin(phoneNumber, verificationCode) {
  try {
    let formattedPhone = phoneNumber;
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      formattedPhone = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formattedPhone = `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      formattedPhone = cleaned;
    } else {
      formattedPhone = `+${cleaned}`;
    }
    
    console.log(`🔐 Verifying phone OTP for: ${formattedPhone}`);
    
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: verificationCode,
      type: 'sms'
    });
    
    if (error) {
      console.error('Phone OTP verification error:', error);
      
      let errorMessage = 'Verification failed. Please try again.';
      
      if (error.message?.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else {
        errorMessage = error.message || 'Verification failed. Please try again.';
      }
      
      Alert.alert('Verification Error', errorMessage);
      return { success: false, error };
    }
    
    if (data?.user) {
      console.log('✅ Phone login successful:', data.user.id);
      return { success: true, user: data.user };
    }
    
    return { success: false };
  } catch (error) {
    console.error('Unexpected verification error:', error);
    Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    return { success: false, error };
  }
}

export const uploadPhotosToStorage = async (photos, userId) => {
  const uploadedUrls = [];
  
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
  
  const userFolder = `${userId}`;
  
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const fileName = `${userFolder}/photo_${i + 1}_${Date.now()}.jpg`;
    
    try {
      console.log(`Uploading photo ${i + 1}/${photos.length} to ${fileName}`);
      
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
        
        if (error.message?.includes('row-level security policy') || error.statusCode === 403) {
          throw new Error('Authentication required for photo upload. Please check your storage policies and try again.');
        }
        
        throw error;
      }

      console.log(`Successfully uploaded photo ${i + 1} to ${fileName}`);

      const { data: urlData } = supabase.storage
        .from('users')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    } catch (error) {
      console.error(`Error in photo upload ${i + 1}:`, error);
      
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
  
  console.log(`📝 Uploaded ${uploadedUrls.length} photos to storage. Database update will be handled by profile save function.`);
  console.log(`Successfully uploaded all ${photos.length} photos for user ${userId}`);
  return uploadedUrls;
};

export async function register(firstName, lastName, phone, email, sex, birthday, password, setLoading, onRegistrationSuccess) {
  try {
    setLoading(true);
    
    let formattedPhone = null;
    if (phone && phone.trim().length > 0) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) {
        formattedPhone = `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        formattedPhone = `+${cleaned}`;
      } else if (cleaned.startsWith('+')) {
        formattedPhone = cleaned;
      } else if (cleaned.length > 0) {
        formattedPhone = `+${cleaned}`;
      }
    }
    
    console.log(`📝 Starting registration with phone number`);
    console.log(`📝 Phone: ${formattedPhone || 'not provided'}`);
    console.log(`📝 Email will be added after verification: ${email || 'not provided'}`);
    
    let geolocation = null;
    console.log('📍 Location sharing disabled by default - user can enable later in settings');
    
    if (!formattedPhone) {
      Alert.alert('Registration Error', 'Phone number is required for registration.');
      return;
    }
    
    if (!email || email.trim().length === 0) {
      Alert.alert('Registration Error', 'Email is required for registration.');
      return;
    }
    
    if (!password || password.trim().length < 8) {
      Alert.alert('Registration Error', 'Password is required and must be at least 8 characters.');
      return;
    }
    
    console.log('📱 Registering with phone number');
    
    const result = await supabase.auth.signUp({
      phone: formattedPhone,
      password: `TEMP_${Date.now()}_${Math.random()}`,
      options: {
        data: {
          firstName: firstName,
          lastName: lastName,
          sex: sex,
          birthday: birthday.toISOString(),
        }
      }
    });
    const user = result.data.user;
    const signUpError = result.error;

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (signUpError.message?.includes('phone')) {
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

    const userData = {
      firstName,
      lastName,
      sex,
      birthday: birthday.toISOString(),
      geolocation: geolocation,
      userId: user.id,
      phone: formattedPhone,
      email: email,
      password: password,
    };
    
    await AsyncStorage.setItem('registrationData', JSON.stringify(userData));

    console.log('✅ Auth user created successfully:', user.id);
    console.log(`⏳ Database records will be created after phone verification`);
    console.log(`⏳ Email/password will be added to auth user after phone verification`);

    if (onRegistrationSuccess) {
      onRegistrationSuccess(userData);
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
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

export async function resendEmailVerification(email) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    
    if (error) {
      console.error('❌ Error resending verification email:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Verification email resent successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error resending verification email:', error);
    return { success: false, error: error.message };
  }
}

export async function verifyRegistration(verificationCode, registrationData, onSuccess, setLoading) {
  try {
    setLoading(true);
    
    console.log(`🔐 Starting phone verification process`);
    
    const result = await supabase.auth.verifyOtp({
      phone: registrationData.phone,
      token: verificationCode,
      type: 'sms'
    });
    let user = result.data.user;
    const verifyError = result.error;
    
    if (verifyError) {
      console.error('Phone verification error:', verifyError);
      Alert.alert('Verification Error', 'Phone verification failed. Please check your SMS code and try again.');
      setLoading(false);
      return;
    }
    
    console.log('✅ Phone verified successfully');
    
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      console.error('❌ Error getting user after phone verification:', userError);
      Alert.alert('Verification Error', 'Unable to verify user status. Please try again.');
      setLoading(false);
      return;
    }
    
    user = currentUser;
    console.log('📱 User phone confirmation status:', user.phone_confirmed_at);
    
    if (!user.phone_confirmed_at) {
      console.error('❌ Phone not confirmed yet (this should not happen)');
      Alert.alert('Verification Error', 'Phone verification failed. Please try again.');
      setLoading(false);
      return;
    }
    
    console.log('✅ Phone verification completed successfully');
    
    try {
      if (!registrationData.email || !registrationData.password) {
        console.error('❌ Missing email or password in registration data');
        Alert.alert('Registration Error', 'Missing email or password. Please register again.');
        setLoading(false);
        return;
      }
      
      const updateData = {
        email: registrationData.email,
        password: registrationData.password
      };
      
      console.log('📧 Adding email to user account:', registrationData.email);
      console.log('🔐 Adding password to user account');
      
      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updateData);
      
      if (updateError) {
        console.error('❌ Error updating user with email/password:', updateError);
        Alert.alert(
          'Update Error',
          'Phone verified but failed to add email/password. Please try again or contact support.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }
      
      console.log('✅ User updated with email/password successfully');
      if (updatedUser.user) {
        user = updatedUser.user;
      }
    } catch (updateError) {
      console.error('❌ Error updating user:', updateError);
      Alert.alert(
        'Update Error',
        'Phone verified but failed to add email/password. Please try again or contact support.',
        [{ text: 'OK' }]
      );
      setLoading(false);
      return;
    }
    
    try {
      console.log('📝 Creating user database records after verification...');
      console.log('📝 User ID:', user.id);
      console.log('📝 User Data:', JSON.stringify(registrationData, null, 2));
      
      const profileData = { ...registrationData };
      delete profileData.password;
      
      const profileResult = await createUserProfile(user.id, profileData);
      console.log('✅ User database records created successfully');
      console.log('✅ Profile Result:', JSON.stringify(profileResult, null, 2));

      await AsyncStorage.removeItem('registrationData');
      console.log('✅ Registration data cleared from AsyncStorage');
      
      console.log('✅ User is now logged in and profile created. Redirecting to app...');
      onSuccess();
    } catch (profileError) {
      console.error('❌ Error creating user database records:', profileError);
      console.error('❌ Profile Error Details:', JSON.stringify(profileError, null, 2));
      
      console.log('⚠️ Profile creation failed, but user is verified. Redirecting...');
      Alert.alert(
        'Verification Complete',
        'Your phone number is verified, but there was an issue creating your profile. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
            }
          }
        ]
      );
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    Alert.alert('Verification Error', 'An unexpected error occurred during verification. Please try again.');
  } finally {
    setLoading(false);
  }
}

// Create a match between two users
export const createMatch = async (user1Id, user2Id) => {
  try {
    console.log(`💕 Creating match between users ${user1Id} and ${user2Id}`);
    
    // Check if match already exists
    const { data: existingMatch, error: matchError } = await supabase
      .from('match')
      .select('*')
      .or(`and(liked_first_id.eq.${user1Id},liked_back_id.eq.${user2Id}),and(liked_first_id.eq.${user2Id},liked_back_id.eq.${user1Id})`)
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
          liked_first_id: user1Id,
          liked_back_id: user2Id,
        }
      ])
      .select()
      .single();
    if (createError) {
      console.error('❌ Error creating match:', createError);
      throw createError;
    }
    console.log(`✅ Created new match between users ${user1Id} and ${user2Id}`);
    
    // Create match status record
    const { error: matchStatusError } = await supabase
      .from('match_status')
      .insert({
        id: newMatch.id,
        active: true
      });

    if (matchStatusError) {
      console.error('❌ Error creating match status:', matchStatusError);
      throw matchStatusError;
    }
    
    console.log(`✅ Created match status for match ${newMatch.id}`);
    
    // Create chat record
    const { error: chatError } = await supabase
      .from('chat')
      .insert({
        id: newMatch.id
      });

    if (chatError) {
      console.error('❌ Error creating chat:', chatError);
      throw chatError;
    }
    
    console.log(`✅ Created chat for match ${newMatch.id}`);
    
    // Note: date, date_params, and date_status are NOT created here
    // They are created later when the first invite is accepted
    
    return newMatch.id;
  } catch (error) {
    console.error('❌ Error creating match:', error);
    throw error;
  }
};

// Handle user likes - updated for new schema
export const handleUserLike = async (likedUserId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }
    console.log(`💕 User ${currentUser.id} is liking user ${likedUserId}`);
    
    // Check if like already exists and is active
    const { data: existingLike, error: likeCheckError } = await supabase
      .from('like')
      .select(`
        id,
        like_status!inner(active)
      `)
      .eq('from_id', currentUser.id)
      .eq('to_id', likedUserId)
      .eq('like_status.active', true)
      .single();
    
    if (likeCheckError && likeCheckError.code !== 'PGRST116') {
      console.error('❌ Error checking existing like:', likeCheckError);
      throw likeCheckError;
    }

    if (existingLike) {
      console.log('✅ Like already exists and is active');
      return { 
        success: true, 
        alreadyLiked: true, 
        isMatch: false 
      };
    }

    // Create new like record
    const { data: newLike, error: createLikeError } = await supabase
      .from('like')
      .insert({
        from_id: currentUser.id,
        to_id: likedUserId
      })
      .select()
      .single();

    if (createLikeError) {
      console.error('❌ Error creating like:', createLikeError);
      throw createLikeError;
    }
    
    // Create like status record
    const { error: likeStatusError } = await supabase
      .from('like_status')
      .insert({
        id: newLike.id,
        active: true
      });

    if (likeStatusError) {
      console.error('❌ Error creating like status:', likeStatusError);
      throw likeStatusError;
    }
    
    console.log('✅ Like created successfully:', newLike.id);
    
    // Check if liked user has already liked current user (check for match)
    const { data: mutualLike, error: mutualLikeError } = await supabase
      .from('like')
      .select(`
        id,
        like_status!inner(active)
      `)
      .eq('from_id', likedUserId)
      .eq('to_id', currentUser.id)
      .eq('like_status.active', true)
      .single();
    
    if (mutualLikeError && mutualLikeError.code !== 'PGRST116') {
      console.error('❌ Error checking mutual like:', mutualLikeError);
      return { 
        success: true, 
        alreadyLiked: false, 
        isMatch: false 
      };
    }

    if (mutualLike) {
      console.log('🎉 It\'s a match! Deactivating likes and creating match');
      
      // Deactivate both likes before creating match
      const { error: deactivateCurrentLikeError } = await supabase
        .from('like_status')
        .update({ active: false })
        .eq('id', newLike.id);
      
      if (deactivateCurrentLikeError) {
        console.error('❌ Error deactivating current like:', deactivateCurrentLikeError);
        throw deactivateCurrentLikeError;
      }
      
      const { error: deactivateOtherLikeError } = await supabase
        .from('like_status')
        .update({ active: false })
        .eq('id', mutualLike.id);
      
      if (deactivateOtherLikeError) {
        console.error('❌ Error deactivating other like:', deactivateOtherLikeError);
        throw deactivateOtherLikeError;
      }
      
      console.log('✅ Both likes deactivated');
      
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

// Discard a like (update like_status.active to false)
export const discardLike = async (likerUserId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }
    
    console.log(`❌ User ${currentUser.id} is discarding like from user ${likerUserId}`);
    
    // Find the like from likerUserId to currentUser
    const { data: like, error: likeError } = await supabase
      .from('like')
      .select(`
        id,
        like_status!inner(id, active)
      `)
      .eq('from_id', likerUserId)
      .eq('to_id', currentUser.id)
      .eq('like_status.active', true)
      .single();
    
    if (likeError) {
      console.error('❌ Error finding like to discard:', likeError);
      throw likeError;
    }
    
    // Update like_status to inactive
    const { error: updateError } = await supabase
      .from('like_status')
      .update({ active: false })
      .eq('id', like.id);
    
    if (updateError) {
      console.error('❌ Error deactivating like:', updateError);
      throw updateError;
    }
    
    console.log(`✅ Successfully discarded like from user ${likerUserId}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error in discardLike:', error);
    throw error;
  }
};

// Get user profiles for swiping
export const getSwipeProfiles = async (limit = 10) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get users the current user has already liked (both active and inactive likes)
    const { data: likedUsers, error: likedError } = await supabase
      .from('like')
      .select(`
        to_id,
        like_status!inner(active)
      `)
      .eq('from_id', currentUser.id);

    if (likedError) {
      console.error('❌ Error fetching liked users:', likedError);
      throw likedError;
    }

    // Get users the current user has matched with (both active and inactive matches)
    const { data: matchedUsers, error: matchedError } = await supabase
      .from('match')
      .select(`
        liked_first_id, 
        liked_back_id,
        match_status!inner(active)
      `)
      .or(`liked_first_id.eq.${currentUser.id},liked_back_id.eq.${currentUser.id}`);

    if (matchedError) {
      console.error('❌ Error fetching matched users:', matchedError);
      throw matchedError;
    }

    // Get active likes (to exclude users we currently like)
    const activeLikedUserIds = likedUsers
      ?.filter(like => like.like_status.active)
      .map(like => like.to_id) || [];
    
    // Get all liked users (including inactive, to exclude users we've liked before even if discarded)
    const allLikedUserIds = likedUsers?.map(like => like.to_id) || [];
    
    // Get active and inactive matched users
    const matchedUserIds = matchedUsers?.map(match => 
      match.liked_first_id === currentUser.id ? match.liked_back_id : match.liked_first_id
    ) || [];

    console.log(`📊 Users currently liked (active): ${activeLikedUserIds.length}`);
    console.log(`📊 Total users ever liked: ${allLikedUserIds.length}`);
    console.log(`📊 Users matched (all statuses): ${matchedUserIds.length}`);

    // Get all users except current user and those already liked/matched (including inactive)
    const excludeIds = [currentUser.id, ...allLikedUserIds, ...matchedUserIds];
    
    const { data: profiles, error } = await supabase
      .from('user')
      .select(`
        id,
        name,
        sex,
        birthdate,
        created_at
      `)
      .not('id', 'in', `(${excludeIds.map(id => `'${id}'`).join(',')})`)
      .limit(limit * 2);

    if (error) {
      console.error('❌ Error fetching swipe profiles:', error);
      throw error;
    }

    // Get profile data for all users
    const profileIds = profiles.map(profile => profile.id);
    const { data: profileDataArray, error: profileDataError } = await supabase
      .from('user_profile')
      .select('id, bio, interests, images, residence, geolocation')
      .in('id', profileIds);

    if (profileDataError) {
      console.error('❌ Error fetching profile data:', profileDataError);
      throw profileDataError;
    }

    // Create a map of profile data by user ID
    const profileMap = {};
    profileDataArray?.forEach(profile => {
      profileMap[profile.id] = profile;
    });

    // Process profiles
    const processedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const profileInfo = profileMap[profile.id] || {};
        
        // Calculate age
        const age = profile.birthdate ? 
          Math.floor((new Date() - new Date(profile.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get photos from database images array or fallback to storage
        let photoUrls = [];
        if (profileInfo.images && Array.isArray(profileInfo.images) && profileInfo.images.length > 0) {
          photoUrls = profileInfo.images;
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
          bio: profileInfo.bio || 'No bio available',
          interests: profileInfo.interests || [],
          image: photoUrls.length > 0 ? photoUrls[0] : null,
          images: photoUrls,
          sex: profile.sex ? 'Male' : 'Female', // Convert boolean back to string
          residence: profileInfo.residence || null,
          geolocation: profileInfo.geolocation || null,
        };
      })
    );

    // Limit to requested amount
    const limitedProfiles = processedProfiles.slice(0, limit);
    
    console.log(`✅ Fetched ${limitedProfiles.length} profiles for swiping`);

    return limitedProfiles;

  } catch (error) {
    console.error('❌ Error in getSwipeProfiles:', error);
    throw error;
  }
};

// Get users who liked the current user
export const getUsersWhoLikedMe = async () => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    // Get all users who have liked the current user (only active likes)
    const { data: likers, error: likersError } = await supabase
      .from('like')
      .select(`
        from_id,
        like_status!inner(active)
      `)
      .eq('to_id', currentUser.id)
      .eq('like_status.active', true);

    if (likersError) {
      console.error('❌ Error fetching users who liked me:', likersError);
      throw likersError;
    }

    console.log(`📊 Found ${likers?.length || 0} users who liked current user`);

    if (!likers || likers.length === 0) {
      return [];
    }

    // Get user profiles for all likers
    const likerUserIds = likers.map(like => like.from_id);
    const { data: likerUsers, error: usersError } = await supabase
      .from('user')
      .select(`
        id,
        name,
        sex,
        birthdate,
        created_at
      `)
      .in('id', likerUserIds);

    if (usersError) {
      console.error('❌ Error fetching liker users:', usersError);
      throw usersError;
    }

    // Get profile data for all liker users
    const { data: likerProfileData, error: profileError } = await supabase
      .from('user_profile')
      .select('id, bio, interests, images, residence')
      .in('id', likerUserIds);

    if (profileError) {
      console.error('❌ Error fetching liker profile data:', profileError);
      throw profileError;
    }

    // Create a map of profile data by user ID
    const likerProfileMap = {};
    likerProfileData?.forEach(profile => {
      likerProfileMap[profile.id] = profile;
    });

    // Process likes to get the liker's profile
    const processedLikes = await Promise.all(
      likerUsers.map(async (likerUser) => {
        const profileData = likerProfileMap[likerUser.id] || {};

        // Calculate age
        const age = likerUser.birthdate ? 
          Math.floor((new Date() - new Date(likerUser.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get photos from database images array or fallback to storage
        let photoUrls = [];
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrls = profileData.images;
        } else {
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
          image: photoUrls.length > 0 ? photoUrls[0] : null,
          images: photoUrls,
          sex: likerUser.sex ? 'Male' : 'Female', // Convert boolean back to string
          residence: profileData.residence || null,
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

// Get matches for the current user
export const getMatches = async () => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`🔍 Finding matches for user: ${currentUser.id}`);

    // Get current user's matches from match table (only active matches)
    const { data: matches, error: matchesError } = await supabase
      .from('match')
      .select(`
        id, 
        liked_first_id, 
        liked_back_id, 
        created_at,
        match_status!inner(active)
      `)
      .or(`liked_first_id.eq.${currentUser.id},liked_back_id.eq.${currentUser.id}`)
      .eq('match_status.active', true);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    console.log(`📊 Found ${matches?.length || 0} matches`);

    if (!matches || matches.length === 0) {
      return [];
    }

    // Get the other user's ID for each match
    const matchedUserIds = matches.map(match => 
      match.liked_first_id === currentUser.id ? match.liked_back_id : match.liked_first_id
    );

    // Get user profiles for all matched users
    const { data: matchedUsers, error: usersError } = await supabase
      .from('user')
      .select(`
        id,
        name,
        sex,
        birthdate,
        created_at
      `)
      .in('id', matchedUserIds);

    if (usersError) {
      console.error('❌ Error fetching matched users:', usersError);
      throw usersError;
    }

    // Get profile data for all matched users
    const { data: matchedProfileData, error: matchedProfileError } = await supabase
      .from('user_profile')
      .select('id, bio, interests, images, residence, geolocation')
      .in('id', matchedUserIds);

    if (matchedProfileError) {
      console.error('❌ Error fetching matched profile data:', matchedProfileError);
      throw matchedProfileError;
    }

    // Create a map of profile data by user ID
    const matchedProfileMap = {};
    matchedProfileData?.forEach(profile => {
      matchedProfileMap[profile.id] = profile;
    });

    // Create a map of match data by user ID
    const matchMap = {};
    matches.forEach(match => {
      const otherUserId = match.liked_first_id === currentUser.id ? match.liked_back_id : match.liked_first_id;
      matchMap[otherUserId] = match;
    });

    // Process matches
    const processedMatches = await Promise.all(
      matchedUsers.map(async (matchedUser) => {
        const profileData = matchedProfileMap[matchedUser.id] || {};
        const matchData = matchMap[matchedUser.id];

        // Calculate age
        const age = matchedUser.birthdate ? 
          Math.floor((new Date() - new Date(matchedUser.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

        // Get first photo from database images array or fallback to storage
        let photoUrl = null;
        if (profileData.images && Array.isArray(profileData.images) && profileData.images.length > 0) {
          photoUrl = profileData.images[0];
        } else {
          try {
            photoUrl = await getSignedPhotoUrl(matchedUser.id);
          } catch (photoError) {
            console.error('Error fetching photo for match:', matchedUser.id, photoError);
          }
        }

        return {
          id: matchedUser.id,
          matchId: matchData.id,
          name: matchedUser.name || 'Anonymous',
          age: age,
          bio: profileData.bio || 'No bio available',
          interests: profileData.interests || [],
          photo: photoUrl,
          residence: profileData.residence || null,
          geolocation: profileData.geolocation || null,
          lastMessage: 'Start a conversation!',
          timestamp: 'Just matched!',
          matchedAt: matchData.created_at
        };
      })
    );

    console.log(`✅ Successfully processed ${processedMatches.length} matches`);
    return processedMatches;

  } catch (error) {
    console.error('❌ Error in getMatches:', error);
    throw error;
  }
};

// Unmatch users
export const unmatchUsers = async (matchId) => {
  try {
    console.log(`❌ Unmatching using match ID: ${matchId}`);
    
    // Get current user
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('User not authenticated. Please log in again.');
    }

    // Deactivate the match status (this will make messages inaccessible)
    const { error: updateError } = await supabase
      .from('match_status')
      .update({ active: false })
      .eq('id', matchId);

    if (updateError) {
      console.error('❌ Error deactivating match:', updateError);
      throw updateError;
    }

    console.log(`✅ Successfully unmatched users for match ID: ${matchId} (messages are now inaccessible)`);
    return true;

  } catch (error) {
    console.error('❌ Error in unmatchUsers:', error);
    throw error;
  }
};

// Note: Reactivate match function removed since matches are now deleted rather than deactivated

// Get signed URL for a photo
export const getSignedPhotoUrl = async (userId) => {
  try {
    console.log(`📸 Getting signed URL for user: ${userId}`);
    
    const { data: files, error: listError } = await supabase.storage
      .from('users')
      .list(`${userId}/`, {
        limit: 9,
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

    const imageFiles = files.filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i));
    if (imageFiles.length === 0) {
      console.log(`📭 No image files found for user: ${userId}`);
      return null;
    }

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

// Get user profile data
export const getUserProfileData = async (userId) => {
  try {
    console.log(`👤 Getting profile data for user ${userId}`);
    
    // Get user data from user table
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('id, name, sex, birthdate, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Error getting user data:', userError);
      throw userError;
    }

    // Get profile data from profile table
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('id, bio, interests, images, residence, geolocation')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error getting user profile data:', profileError);
      throw profileError;
    }

    console.log(`✅ Retrieved profile data for ${user.name}`);
    return {
      id: user.id,
      name: user.name,
      bio: profile.bio || '',
      interests: profile.interests || [],
      birthday: user.birthdate,
      sex: user.sex ? 'Male' : 'Female', // Convert boolean back to string
      images: profile.images || [],
      residence: profile.residence || null,
      geolocation: profile.geolocation || null,
    };
  } catch (error) {
    console.error('❌ Error in getUserProfileData:', error);
    throw error;
  }
};

// Get user images from database
export const getUserImages = async (userId) => {
  try {
    console.log(`📸 Getting images for user ${userId}`);
    
    const { data: profile, error } = await supabase
      .from('user_profile')
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

// Delete user account
export const deleteUserAccount = async () => {
  try {
    console.log('🗑️ Starting account deletion process');
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const userId = currentUser.id;
    console.log(`🗑️ Deleting account for user: ${userId}`);

    // Delete user's photos from storage
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

    // Delete user records from all tables
    try {
      // Delete from profile table
      const { error: profileError } = await supabase
        .from('user_profile')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('❌ Error deleting user profile:', profileError);
      } else {
        console.log('✅ User profile deleted');
      }

      // Delete from user_status table
      const { error: userStatusError } = await supabase
        .from('user_status')
        .delete()
        .eq('id', userId);

      if (userStatusError) {
        console.error('❌ Error deleting user status:', userStatusError);
      } else {
        console.log('✅ User status deleted');
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

    // Sign out the user
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Error signing out user:', signOutError);
      } else {
        console.log('✅ User signed out successfully');
      }
      
      console.log('ℹ️ User data has been removed. For complete account deletion, please contact support.');
      
    } catch (authDeleteError) {
      console.error('❌ Error in auth cleanup:', authDeleteError);
      await supabase.auth.signOut();
    }

    console.log('✅ Account deletion completed successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in deleteUserAccount:', error);
    throw error;
  }
};

// Disable user account
export const disableUserAccount = async () => {
  try {
    console.log('⏸️ Starting account disable process');
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const userId = currentUser.id;
    console.log(`⏸️ Disabling account for user: ${userId}`);

    // Update profile to set disabled = true
    const { error: updateError } = await supabase
      .from('user_profile')
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

// Get current location and geocode to residence
export const getCurrentLocationAndresidence = async () => {
  try {
    console.log(`📍 Getting current location and geocoding to residence`);
    
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ Location permission denied');
      return null;
    }

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

// Calculate distance between two coordinates using Haversine formula
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

// Analytics functions
export const getAnalyticsData = async (days = 7) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📊 Getting analytics data for user: ${currentUser.id} for ${days} days`);
    
    // Get current user's likes given (only active)
    const { data: likesGiven, error: likesGivenError } = await supabase
      .from('like')
      .select(`
        created_at,
        like_status!inner(active)
      `)
      .eq('from_id', currentUser.id)
      .eq('like_status.active', true);

    if (likesGivenError) {
      console.error('❌ Error fetching likes given:', likesGivenError);
      throw likesGivenError;
    }

    // Get current user's likes received (only active)
    const { data: likesReceived, error: likesReceivedError } = await supabase
      .from('like')
      .select(`
        created_at,
        like_status!inner(active)
      `)
      .eq('to_id', currentUser.id)
      .eq('like_status.active', true);

    if (likesReceivedError) {
      console.error('❌ Error fetching likes received:', likesReceivedError);
      throw likesReceivedError;
    }

    // Get current user's matches (only active)
    const { data: matches, error: matchesError } = await supabase
      .from('match')
      .select(`
        created_at,
        match_status!inner(active)
      `)
      .or(`liked_first_id.eq.${currentUser.id},liked_back_id.eq.${currentUser.id}`)
      .eq('match_status.active', true);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    // Generate date range for the specified number of days
    const generateDateRange = (numDays) => {
      const dates = [];
      const today = new Date();
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    };

    const dateRange = generateDateRange(days);

    // Process data by day
    const likesGivenData = new Array(days).fill(0);
    const likesReceivedData = new Array(days).fill(0);
    const matchesData = new Array(days).fill(0);

    // Count likes given by day
    likesGiven?.forEach(like => {
      const likeDate = new Date(like.created_at).toISOString().split('T')[0];
      const dayIndex = dateRange.indexOf(likeDate);
      if (dayIndex !== -1) {
        likesGivenData[dayIndex]++;
      }
    });

    // Count likes received by day
    likesReceived?.forEach(like => {
      const likeDate = new Date(like.created_at).toISOString().split('T')[0];
      const dayIndex = dateRange.indexOf(likeDate);
      if (dayIndex !== -1) {
        likesReceivedData[dayIndex]++;
      }
    });

    // Count matches by day
    matches?.forEach(match => {
      const matchDate = new Date(match.created_at).toISOString().split('T')[0];
      const dayIndex = dateRange.indexOf(matchDate);
      if (dayIndex !== -1) {
        matchesData[dayIndex]++;
      }
    });

    const createLabels = (numDays) => {
      if (numDays <= 7) {
        return dateRange.map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      } else if (numDays <= 30) {
        return dateRange.filter((_, index) => index % 3 === 0).map(date => {
          const d = new Date(date);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        });
      } else {
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
        data: likesGivenData
      },
      likesReceived: {
        labels: labels,
        data: likesReceivedData
      },
      matches: {
        labels: labels,
        data: matchesData
      },
      totalLikes: likesGiven?.length || 0,
      totalMatches: matches?.length || 0
    };

    console.log(`✅ Analytics data retrieved successfully`);
    return analyticsData;

  } catch (error) {
    console.error('❌ Error in getAnalyticsData:', error);
    throw error;
  }
};

export const getAnalyticsSummary = async () => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📊 Getting analytics summary for user: ${currentUser.id}`);
    
    // Get current user's likes given (only active)
    const { data: likesGiven, error: likesGivenError } = await supabase
      .from('like')
      .select(`
        created_at,
        like_status!inner(active)
      `)
      .eq('from_id', currentUser.id)
      .eq('like_status.active', true);

    if (likesGivenError) {
      console.error('❌ Error fetching likes given:', likesGivenError);
      throw likesGivenError;
    }

    // Get current user's likes received (only active)
    const { data: likesReceived, error: likesReceivedError } = await supabase
      .from('like')
      .select(`
        created_at,
        like_status!inner(active)
      `)
      .eq('to_id', currentUser.id)
      .eq('like_status.active', true);

    if (likesReceivedError) {
      console.error('❌ Error fetching likes received:', likesReceivedError);
      throw likesReceivedError;
    }

    // Get current user's matches (only active)
    const { data: matches, error: matchesError } = await supabase
      .from('match')
      .select(`
        created_at,
        match_status!inner(active)
      `)
      .or(`liked_first_id.eq.${currentUser.id},liked_back_id.eq.${currentUser.id}`)
      .eq('match_status.active', true);

    if (matchesError) {
      console.error('❌ Error fetching matches:', matchesError);
      throw matchesError;
    }

    const totalLikesGiven = likesGiven?.length || 0;
    const totalLikesReceived = likesReceived?.length || 0;
    const totalMatches = matches?.length || 0;
    const matchRate = totalLikesGiven > 0 ? Math.round((totalMatches / totalLikesGiven) * 100) : 0;
    const averageLikesPerDay = Math.round(totalLikesGiven / 7);

    const summaryData = {
      totalLikesReceived,
      likesGiven: totalLikesGiven,
      totalMatches,
      matchRate,
      profileViews: 0, // Would need to track this separately
      averageLikesPerDay
    };

    console.log(`✅ Analytics summary retrieved successfully`);
    return summaryData;

  } catch (error) {
    console.error('❌ Error in getAnalyticsSummary:', error);
    throw error;
  }
};

// Update user email
export const updateUserEmail = async (newEmail) => {
  try {
    console.log(`📧 Updating user email to: ${newEmail}`);
    
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    const { data, error } = await supabase.auth.updateUser({
      email: newEmail
    });

    if (error) {
      console.error('❌ Error updating email:', error);
      throw error;
    }

    console.log('✅ Email update initiated - verification emails sent');
    
    Alert.alert(
      'Verification Required', 
      `Verification links have been sent your current and new email. The change won't take effect until both are verified.`,
      [{ text: 'OK' }]
    );

    return { success: true, data };

  } catch (error) {
    console.error('❌ Error in updateUserEmail:', error);
    
    let errorMessage = 'Failed to update email. Please try again.';
    if (error.message?.includes('already registered')) {
      errorMessage = 'This email is already registered. Please use a different email.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Email Update Error', errorMessage);
    throw error;
  }
};

// Send phone verification code for phone update
export const sendPhoneUpdateCode = async (newPhone) => {
  try {
    let formattedPhone = newPhone;
    const cleaned = newPhone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      formattedPhone = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formattedPhone = `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      formattedPhone = `+${cleaned}`;
    }
    
    console.log(`📱 Sending verification code to new phone: ${formattedPhone}`);
    
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    if (error) {
      console.error('❌ Error sending phone verification:', error);
      throw error;
    }

    console.log('✅ Phone verification code sent to:', formattedPhone);
    Alert.alert(
      'Verification Code Sent', 
      `A verification code has been sent to ${formattedPhone}. Please enter it to verify your new phone number.`,
      [{ text: 'OK' }]
    );

    return { success: true, formattedPhone };

  } catch (error) {
    console.error('❌ Error in sendPhoneUpdateCode:', error);
    
    let errorMessage = 'Failed to send verification code. Please try again.';
    if (error.message?.includes('Twilio') || error.message?.includes('20003')) {
      errorMessage = 'SMS service is currently unavailable. Please try again later.';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Too many attempts. Please wait a few minutes before trying again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Phone Update Error', errorMessage);
    throw error;
  }
};

// Message functions for the chat_message table with match_id
export const sendMessage = async (toUserId, messageText) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`💬 Sending message to user ${toUserId}: ${messageText}`);

    // First, find the active match between current user and toUserId
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select(`
        id,
        match_status!inner(active)
      `)
      .or(`and(liked_first_id.eq.${currentUser.id},liked_back_id.eq.${toUserId}),and(liked_first_id.eq.${toUserId},liked_back_id.eq.${currentUser.id})`)
      .eq('match_status.active', true)
      .single();

    if (matchError) {
      console.error('❌ Error finding active match:', matchError);
      throw new Error('No active match found between users');
    }

    const { data: newMessage, error: createError } = await supabase
      .from('chat_message')
      .insert({
        from_id: currentUser.id,
        to_id: toUserId,
        text: messageText,
        match_id: match.id
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating message:', createError);
      throw createError;
    }

    console.log('✅ Message sent successfully:', newMessage.id);
    return newMessage;

  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    throw error;
  }
};

export const getMessages = async (otherUserId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`💬 Getting messages with user ${otherUserId}`);

    // First, find the active match between current user and otherUserId
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select(`
        id,
        match_status!inner(active)
      `)
      .or(`and(liked_first_id.eq.${currentUser.id},liked_back_id.eq.${otherUserId}),and(liked_first_id.eq.${otherUserId},liked_back_id.eq.${currentUser.id})`)
      .eq('match_status.active', true)
      .single();

    if (matchError) {
      console.error('❌ Error finding active match:', matchError);
      throw new Error('No active match found between users');
    }

    const { data: messages, error: messagesError } = await supabase
      .from('chat_message')
      .select('*')
      .eq('match_id', match.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError);
      throw messagesError;
    }

    console.log(`✅ Retrieved ${messages?.length || 0} messages`);
    return messages || [];

  } catch (error) {
    console.error('❌ Error in getMessages:', error);
    throw error;
  }
};

export const getRecentMessages = async () => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`💬 Getting recent messages for user ${currentUser.id}`);

    // Get the most recent message from each active match conversation
    const { data: messages, error: messagesError } = await supabase
      .from('chat_message')
      .select(`
        *,
        chat!inner(
          id,
          match!inner(
            id,
            liked_first_id,
            liked_back_id,
            match_status!inner(active)
          )
        )
      `)
      .or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`)
      .eq('chat.match.match_status.active', true)
      .order('created_at', { ascending: false });

    if (messagesError) {
      console.error('❌ Error fetching recent messages:', messagesError);
      throw messagesError;
    }

    // Group messages by conversation and get the most recent one from each
    const conversationMap = new Map();
    
    messages?.forEach(message => {
      const otherUserId = message.from_id === currentUser.id ? message.to_id : message.from_id;
      
      if (!conversationMap.has(otherUserId) || 
          new Date(message.created_at) > new Date(conversationMap.get(otherUserId).created_at)) {
        conversationMap.set(otherUserId, message);
      }
    });

    const recentMessages = Array.from(conversationMap.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    console.log(`✅ Retrieved ${recentMessages.length} recent conversations`);
    return recentMessages;

  } catch (error) {
    console.error('❌ Error in getRecentMessages:', error);
    throw error;
  }
};

// Note: Calendar and chat functions removed since those tables are not in the schema

// Invite functions for the invite table
export const createInvite = async (toUserId, duration, location, venue) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📅 Creating invite to user ${toUserId}`);

    // Check if an invite already exists between these users
    const { data: existingInvite, error: checkError } = await supabase
      .from('invite')
      .select(`
        id,
        invite_status!inner(active)
      `)
      .eq('from_id', currentUser.id)
      .eq('to_id', toUserId)
      .eq('invite_status.active', false)
      .single();

    if (existingInvite && !checkError) {
      console.log(`✅ Found existing invite ${existingInvite.id}, reactivating it`);
      
      // Update invite_params with new values
      const { error: updateParamsError } = await supabase
        .from('invite_params')
        .update({
          duration: duration || [],
          location: location || [],
          venue: venue || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingInvite.id);

      if (updateParamsError) {
        console.error('❌ Error updating invite_params:', updateParamsError);
        throw updateParamsError;
      }

      // Reactivate invite_status
      const { error: reactivateError } = await supabase
        .from('invite_status')
        .update({ active: true })
        .eq('id', existingInvite.id);

      if (reactivateError) {
        console.error('❌ Error reactivating invite:', reactivateError);
        throw reactivateError;
      }

      console.log('✅ Invite reactivated successfully:', existingInvite.id);
      return existingInvite;
    }

    // Create new invite if none exists
    const { data: newInvite, error: createError } = await supabase
      .from('invite')
      .insert({
        from_id: currentUser.id,
        to_id: toUserId
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating invite:', createError);
      throw createError;
    }

    console.log(`✅ Created invite ${newInvite.id}`);

    // Create invite_params record
    const { error: inviteParamsError } = await supabase
      .from('invite_params')
      .insert({
        id: newInvite.id,
        duration: duration || [],
        location: location || [],
        venue: venue || ''
      });

    if (inviteParamsError) {
      console.error('❌ Error creating invite_params:', inviteParamsError);
      throw inviteParamsError;
    }

    console.log(`✅ Created invite_params for invite ${newInvite.id}`);

    // Create invite_status record
    const { error: inviteStatusError } = await supabase
      .from('invite_status')
      .insert({
        id: newInvite.id,
        active: true
      });

    if (inviteStatusError) {
      console.error('❌ Error creating invite_status:', inviteStatusError);
      throw inviteStatusError;
    }

    console.log('✅ Invite created successfully:', newInvite.id);
    return newInvite;

  } catch (error) {
    console.error('❌ Error in createInvite:', error);
    throw error;
  }
};

export const getInvites = async () => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`📅 Getting invites for user ${currentUser.id}`);

    // Get invites sent to current user (only active)
    const { data: receivedInvites, error: receivedError } = await supabase
      .from('invite')
      .select(`
        id,
        created_at,
        from_id,
        invite_status!inner(active),
        invite_params(duration, location, venue)
      `)
      .eq('to_id', currentUser.id)
      .eq('invite_status.active', true)
      .order('created_at', { ascending: false });

    if (receivedError) {
      console.error('❌ Error fetching received invites:', receivedError);
      throw receivedError;
    }

    // Get invites sent by current user (only active)
    const { data: sentInvites, error: sentError } = await supabase
      .from('invite')
      .select(`
        id,
        created_at,
        to_id,
        invite_status!inner(active),
        invite_params(duration, location, venue)
      `)
      .eq('from_id', currentUser.id)
      .eq('invite_status.active', true)
      .order('created_at', { ascending: false });

    if (sentError) {
      console.error('❌ Error fetching sent invites:', sentError);
      throw sentError;
    }

    console.log(`✅ Retrieved ${receivedInvites?.length || 0} received and ${sentInvites?.length || 0} sent invites`);
    
    return {
      received: receivedInvites || [],
      sent: sentInvites || []
    };

  } catch (error) {
    console.error('❌ Error in getInvites:', error);
    throw error;
  }
};

// Deactivate invite (used for both sender cancelling and receiver rejecting)
export const deactivateInvite = async (inviteId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`❌ Deactivating invite ${inviteId}`);

    // Deactivate the invite status
    const { error: updateError } = await supabase
      .from('invite_status')
      .update({ active: false })
      .eq('id', inviteId);

    if (updateError) {
      console.error('❌ Error deactivating invite:', updateError);
      throw updateError;
    }

    console.log('✅ Invite deactivated successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in deactivateInvite:', error);
    throw error;
  }
};

// Alias functions for semantic clarity in UI code
export const deleteInvite = deactivateInvite; // When sender cancels
export const discardInvite = deactivateInvite; // When receiver rejects

// Accept invite (creates/updates date, date_params, and date_status)
export const acceptInvite = async (inviteId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`✅ Accepting invite ${inviteId}`);

    // Get the invite details
    const { data: invite, error: inviteError } = await supabase
      .from('invite')
      .select('*, invite_params(*)')
      .eq('id', inviteId)
      .eq('to_id', currentUser.id)
      .single();

    if (inviteError || !invite) {
      console.error('❌ Error fetching invite:', inviteError);
      throw new Error('Invite not found');
    }

    // Find the match between users
    const { data: match, error: matchError } = await supabase
      .from('match')
      .select('id')
      .or(`and(liked_first_id.eq.${currentUser.id},liked_back_id.eq.${invite.from_id}),and(liked_first_id.eq.${invite.from_id},liked_back_id.eq.${currentUser.id})`)
      .single();

    if (matchError || !match) {
      console.error('❌ Error finding match:', matchError);
      throw new Error('Match not found');
    }

    // Date, date_params, and date_status may or may not exist yet
    // date.id = match.id (same value due to foreign key)
    const dateId = match.id;

    // Check if date record exists
    const { data: existingDate, error: dateCheckError } = await supabase
      .from('date')
      .select('id')
      .eq('id', dateId)
      .single();

    // Create date record if it doesn't exist
    if (dateCheckError && dateCheckError.code === 'PGRST116') {
      console.log('📅 Creating date record for match');
      const { error: dateCreateError } = await supabase
        .from('date')
        .insert({
          id: dateId
        });

      if (dateCreateError) {
        console.error('❌ Error creating date:', dateCreateError);
        throw dateCreateError;
      }
      console.log('✅ Date record created');
    } else if (dateCheckError) {
      console.error('❌ Error checking date:', dateCheckError);
      throw dateCheckError;
    } else {
      console.log('✅ Date record already exists');
    }

    // Check if date_params exists
    const { data: existingDateParams, error: paramsCheckError } = await supabase
      .from('date_params')
      .select('id')
      .eq('id', dateId)
      .single();

    const inviteParams = invite.invite_params?.[0];

    // Update or create date_params
    if (existingDateParams && !paramsCheckError) {
      console.log('📝 Updating existing date_params');
      const { error: updateParamsError } = await supabase
        .from('date_params')
        .update({
          duration: inviteParams?.duration || [],
          location: inviteParams?.location || [],
          venue: inviteParams?.venue || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', dateId);

      if (updateParamsError) {
        console.error('❌ Error updating date_params:', updateParamsError);
        throw updateParamsError;
      }
    } else {
      console.log('📝 Creating date_params');
      const { error: createParamsError } = await supabase
        .from('date_params')
        .insert({
          id: dateId,
          duration: inviteParams?.duration || [],
          location: inviteParams?.location || [],
          venue: inviteParams?.venue || ''
        });

      if (createParamsError) {
        console.error('❌ Error creating date_params:', createParamsError);
        throw createParamsError;
      }
    }

    console.log('✅ Date params updated/created');

    // Check if date_status exists
    const { data: existingDateStatus, error: statusCheckError } = await supabase
      .from('date_status')
      .select('id')
      .eq('id', dateId)
      .single();

    // Create or update date_status to active
    if (existingDateStatus && !statusCheckError) {
      console.log('📝 Activating existing date_status');
      const { error: updateStatusError } = await supabase
        .from('date_status')
        .update({ active: true })
        .eq('id', dateId);

      if (updateStatusError) {
        console.error('❌ Error activating date_status:', updateStatusError);
        throw updateStatusError;
      }
    } else {
      console.log('📝 Creating date_status');
      const { error: createStatusError } = await supabase
        .from('date_status')
        .insert({
          id: dateId,
          active: true
        });

      if (createStatusError) {
        console.error('❌ Error creating date_status:', createStatusError);
        throw createStatusError;
      }
    }

    console.log('✅ Date status activated');

    // Deactivate the invite status
    const { error: inviteStatusError } = await supabase
      .from('invite_status')
      .update({ active: false })
      .eq('id', inviteId);

    if (inviteStatusError) {
      console.error('❌ Error deactivating invite:', inviteStatusError);
      throw inviteStatusError;
    }

    console.log('✅ Invite deactivated after acceptance');
    console.log('✅ Invite accepted successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in acceptInvite:', error);
    throw error;
  }
};

// Cancel date (sets date_status.active to false)
export const cancelDate = async (matchId) => {
  try {
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      console.error('❌ Authentication error:', authError);
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log(`❌ Canceling date for match ${matchId}`);

    // Get date record
    const { data: date, error: dateError } = await supabase
      .from('date')
      .select('id')
      .eq('id', matchId)
      .single();

    if (dateError) {
      console.error('❌ Error finding date:', dateError);
      throw new Error('Date not found');
    }

    // Deactivate date_status
    const { error: updateError } = await supabase
      .from('date_status')
      .update({ active: false })
      .eq('id', date.id);

    if (updateError) {
      console.error('❌ Error canceling date:', updateError);
      throw updateError;
    }

    console.log('✅ Date canceled successfully');
    return true;

  } catch (error) {
    console.error('❌ Error in cancelDate:', error);
    throw error;
  }
};

// Check and deactivate expired dates (should be called periodically or on date views)
export const checkAndDeactivateExpiredDates = async () => {
  try {
    console.log('🕐 Checking for expired dates');

    // Get all active dates
    const { data: activeDates, error: datesError } = await supabase
      .from('date_status')
      .select('id, active')
      .eq('active', true);

    if (datesError) {
      console.error('❌ Error fetching active dates:', datesError);
      throw datesError;
    }

    if (!activeDates || activeDates.length === 0) {
      console.log('✅ No active dates to check');
      return [];
    }

    const now = new Date();
    const expiredDateIds = [];

    // Check each active date
    for (const date of activeDates) {
      // Get date_params for this date
      const { data: dateParams, error: paramsError } = await supabase
        .from('date_params')
        .select('duration')
        .eq('id', date.id)
        .single();

      if (!paramsError && dateParams && dateParams.duration && dateParams.duration.length > 0) {
        // Get the last timestamp from duration array (the ending time)
        const durationEnd = new Date(dateParams.duration[dateParams.duration.length - 1]);
        
        if (now > durationEnd) {
          console.log(`⏰ Date ${date.id} has expired (ended at ${durationEnd.toISOString()})`);
          expiredDateIds.push(date.id);
        }
      }
    }

    // Deactivate all expired dates
    if (expiredDateIds.length > 0) {
      console.log(`🗑️ Deactivating ${expiredDateIds.length} expired date(s)`);
      const { error: deactivateError } = await supabase
        .from('date_status')
        .update({ active: false })
        .in('id', expiredDateIds);

      if (deactivateError) {
        console.error('❌ Error deactivating expired dates:', deactivateError);
        throw deactivateError;
      }

      console.log(`✅ Deactivated ${expiredDateIds.length} expired date(s)`);
      return expiredDateIds;
    }

    console.log('✅ No expired dates found');
    return [];

  } catch (error) {
    console.error('❌ Error in checkAndDeactivateExpiredDates:', error);
    throw error;
  }
};

// Verify phone update code and update phone number
export const verifyAndUpdatePhone = async (newPhone, verificationCode) => {
  try {
    let formattedPhone = newPhone;
    const cleaned = newPhone.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      formattedPhone = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formattedPhone = `+${cleaned}`;
    } else if (!cleaned.startsWith('+')) {
      formattedPhone = `+${cleaned}`;
    }
    
    console.log(`🔐 Verifying phone update code for: ${formattedPhone}`);
    
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: verificationCode,
      type: 'sms'
    });
    
    if (verifyError) {
      console.error('❌ Phone verification error:', verifyError);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      if (verifyError.message?.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (verifyError.message) {
        errorMessage = verifyError.message;
      }
      
      Alert.alert('Verification Error', errorMessage);
      throw verifyError;
    }

    console.log('✅ Phone verification successful');
    
    Alert.alert(
      'Phone Updated', 
      'Your phone number has been updated successfully!',
      [{ text: 'OK' }]
    );

    return { success: true, phone: cleaned };

  } catch (error) {
    console.error('❌ Error in verifyAndUpdatePhone:', error);
    return { success: false, error };
  }
};