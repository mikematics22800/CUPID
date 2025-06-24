import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from 'react-native';
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
            sexuality: userData.sexuality,
            email: userData.email,
            phone: userData.phone,
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
        Alert.alert('Login Error', error.message);
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
          const userData = JSON.parse(registrationData);
          
          // Create the profile
          await createUserProfile(user.id, userData);
          
          // Clear the registration data
          await AsyncStorage.removeItem('registrationData');
          
          Alert.alert('Success', 'Profile created successfully!');
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
          style={styles.emailInput} 
          placeholder="Email" 
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.passwordInputContainer}>
          <TextInput 
            placeholder="Password" 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
            style={styles.passwordInput}
            value={password}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color="black" 
              style={styles.passwordIcon}
            />
          </TouchableOpacity>
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
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    color: 'black',
  },
  passwordInputContainer: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: 'black',
  },
  passwordIcon: {
    padding: 5,
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