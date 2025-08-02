import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { signInWithEmail, signInWithPhone } from '../../../lib/supabase';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PhoneInput from './PhoneInput';

export default function LoginForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    email: true,
    password: true,
    phone: true
  });

  const handleSignInWithEmail = async () => {
    setLoading(true);
    await signInWithEmail(email, password, setLoading);
  };

  const handleSignInWithPhone = async () => {
    setLoading(true);
    await signInWithPhone(phone, setLoading);
  };

  useEffect(() => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(email);
    
    // Password validation
    const isPasswordValid = password.length >= 6;
    
    // Phone validation
    const isPhoneValid = phone.length === 10;
    
    setValidationStatus({
      email: isEmailValid,
      password: isPasswordValid,
      phone: isPhoneValid
    });
    
    setIsEmailValid(isEmailValid && isPasswordValid);
  }, [email, password, phone]);

  return (
    <View style={styles.form}>
      <View style={styles.flexColGap10}>
        <EmailInput
          email={email}
          setEmail={setEmail}
          validationStatus={validationStatus}
        />
        <PasswordInput
          password={password}
          setPassword={setPassword}
          validationStatus={validationStatus}
          minLength={6}
        />
        <TouchableOpacity 
          style={[styles.button, !isEmailValid && styles.disabledButton]} 
          onPress={handleSignInWithEmail}
          disabled={!isEmailValid}
        >
          <Text style={styles.buttonText}>Login with Email</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.flexColGap10}>
        <PhoneInput
          phone={phone}
          setPhone={setPhone}
          validationStatus={validationStatus}
        />
        <TouchableOpacity 
          style={[styles.button, !validationStatus.phone && styles.disabledButton]} 
          onPress={handleSignInWithPhone}
          disabled={!validationStatus.phone}
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
  infoSection: {
    width: '100%',
    alignItems: 'center',
  },
  infoText: {
    color: 'gray',
    fontSize: 12,
  },
}); 