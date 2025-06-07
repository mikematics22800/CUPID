import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import PhoneInput from "react-native-phone-number-input";
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../../lib/supabase';

export default function LoginForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })
    if (error) Alert.alert(error.message)
    setLoading(false)
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
          style={[styles.loginButton, !isEmailValid && styles.disabledButton]} 
          onPress={onEmailLogin}
          disabled={!isEmailValid}
        >
          <Text style={styles.loginButtonText}>Login with Email</Text>
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
          style={[styles.loginButton, !isPhoneValid && styles.disabledButton]} 
          onPress={onSendCode}
          disabled={!isPhoneValid}
        >
          <Text style={styles.loginButtonText}>Login with Phone</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.registerButton} onPress={onBack}>
        <Text style={styles.registerButtonText}>Back</Text>
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
    gap: 20,
    padding: 20,
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
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hotpink',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  registerButtonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
    opacity: 0.7,
  },
}); 