import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useState } from 'react';
import { verifyRegistration, signInWithPhone } from '../../../lib/supabase';

export default function VerificationForm({ verificationData, onVerificationSuccess, onBack }) {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleVerifyCode = async () => {
    // Phone verification requires the SMS code
    if (!verificationCode || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code from your SMS.');
      return;
    }

    setLoading(true);
    try {
      await verifyRegistration(
        verificationCode,
        verificationData,
        onVerificationSuccess,
        setLoading
      );
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Verification Error', 'Failed to verify. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    try {
      await signInWithPhone(verificationData.phone);
      Alert.alert('Code Resent', 'A new verification code has been sent to your phone.');
    } catch (error) {
      console.error('Resend SMS error:', error);
      Alert.alert('Error', 'Failed to resend verification code.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Phone Number</Text>
      <Text style={styles.subtitle}>
        We've sent a verification code to your phone via SMS. After verification, your email and password will be added to your account.
      </Text>
      
      <View style={styles.inputsContainer}>
        <TextInput
          mode="outlined"
          label="Phone Verification Code"
          style={styles.input}
          value={verificationCode}
          onChangeText={setVerificationCode}
          keyboardType="number-pad"
          maxLength={6}
        />
        <View style={styles.buttonsContainer}>
          <TouchableOpacity 
            style={[styles.button]} 
            onPress={handleVerifyCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={handleResendCode}
            disabled={resendLoading}
          >
            <Text style={styles.buttonText}>
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={onBack}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
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
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputsContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  input: {
    width: '100%',
    backgroundColor: 'white',
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
    fontSize: 18,
  },
  buttonsContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 20,
  },
}); 