import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { signInWithEmail, signInWithPhone, verifyPhoneLogin } from '../../../lib/supabase';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PhoneInput from './PhoneInput';

export default function LoginForm({ onBack }) {
  const [email, setEmail] = useState('mikematics22800@gmail.com');
  const [phone, setPhone] = useState('5617159065');
  const [password, setPassword] = useState('D7452m61457!');
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [validationStatus, setValidationStatus] = useState({
    email: true,
    password: true,
    phone: true
  });
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleSignInWithEmail = async () => {
    setLoading(true);
    await signInWithEmail(email, password, setLoading);
  };

  const handleSignInWithPhone = async () => {
    setLoading(true);
    await signInWithPhone(phone);
    setLoading(false);
    setShowPhoneVerification(true);
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setVerifyLoading(true);
    const result = await verifyPhoneLogin(phone, verificationCode);
    setVerifyLoading(false);

    if (result.success) {
      // Login successful - the user will be redirected automatically by the auth state listener
      setShowPhoneVerification(false);
      setVerificationCode('');
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    await signInWithPhone(phone);
    setLoading(false);
    Alert.alert('Code Resent', 'A new verification code has been sent to your phone.');
  };

  const handleBackFromVerification = () => {
    setShowPhoneVerification(false);
    setVerificationCode('');
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

  // Show verification form if phone OTP was sent
  if (showPhoneVerification) {
    return (
      <View style={styles.form}>
        <Text style={styles.title}>Verify Your Phone</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to your phone number
        </Text>
        
        <View style={styles.flexColGap10}>
          <TextInput
            mode="outlined"
            label="Verification Code"
            style={styles.input}
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleVerifyPhone}
            disabled={verifyLoading}
          >
            <Text style={styles.buttonText}>
              {verifyLoading ? 'Verifying...' : 'Verify Code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleResendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleBackFromVerification}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          style={[styles.button]} 
          onPress={handleSignInWithEmail}
          disabled={loading}
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
          style={[styles.button]} 
          onPress={handleSignInWithPhone}
          disabled={loading}
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
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  buttonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
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