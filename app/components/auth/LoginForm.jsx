import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import PhoneInput from "react-native-phone-number-input";
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

export default function LoginForm({ onBack }) {
  const [email, setEmail] = useState('mikematics22800@gmail.com');
  const [password, setPassword] = useState('D7452m61457!');
  const [phoneNumber, setPhoneNumber] = useState('5617159065');
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function createUserProfile(userId, userData) {
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

  async function signInWithEmail() {
    try {
      setLoading(true);
      
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
      setLoading(false);
    }
  }

  async function signInWithPhone() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    })
  }

  useEffect(() => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email) && password.length >= 6);
  }, [email, password]);

  useEffect(() => {
    // Phone validation
    setIsPhoneValid(phoneNumber.length >= 10);
  }, [phoneNumber]);

  return (
    <View style={styles.form}>
      <View style={styles.flexColGap10}>
        <TextInput
          mode="outlined"
          label="Email"
          style={styles.emailInput} 
          placeholder="Enter your email address" 
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.passwordInputContainer}>
          <TextInput 
            mode="outlined"
            label="Password"
            placeholder="Enter your password" 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
            style={styles.passwordInput}
            value={password}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
        </View>
        <TouchableOpacity 
          style={[styles.button, !isEmailValid && styles.disabledButton]} 
          onPress={signInWithEmail}
          disabled={!isEmailValid}
        >
          <Text style={styles.buttonText}>Login with Email</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.flexColGap10}>
        <View style={styles.phoneInput}>
          <PhoneInput
            defaultValue={phoneNumber}
            defaultCode="US"
            layout="first"
            onChangeText={(text) => {
              setPhoneNumber(text);
            }}
            withDarkTheme
            withShadow
            autoFocus
          />
        </View>
        <TouchableOpacity 
          style={[styles.button, !isPhoneValid && styles.disabledButton]} 
          onPress={signInWithPhone}
          disabled={!isPhoneValid}
        >
          <Text style={styles.buttonText}>Login with Phone</Text>
        </TouchableOpacity>
      </View>
        <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 25,
    padding: 25,
  },
  flexColGap10: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  emailInput: {
    width: '100%',
  },
  passwordInputContainer: {
    width: '100%',
  },
  passwordInput: {
    width: '100%',
  },
  phoneInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
    opacity: 0.7,
  },
}); 