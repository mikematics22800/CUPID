import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { verifyRegistration, supabase } from '../../../lib/supabase';

export default function DualVerificationForm({ email, phone, onVerificationSuccess, onBack }) {
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerification = async () => {
    if (!emailCode.trim() || !phoneCode.trim()) {
      Alert.alert('Error', 'Please enter both verification codes.');
      return;
    }

    if (emailCode.length < 6 || phoneCode.length < 6) {
      Alert.alert('Error', 'Please enter complete verification codes.');
      return;
    }

    setLoading(true);
    
    try {
      await verifyRegistration(
        { email, token: emailCode },
        { phone, token: phoneCode },
        onVerificationSuccess,
        setLoading
      );
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendEmailCode = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to resend email verification code.');
      } else {
        Alert.alert('Success', 'Email verification code sent!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend email verification code.');
    }
  };

  const resendPhoneCode = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
      });
      
      if (error) {
        Alert.alert('Error', 'Failed to resend phone verification code.');
      } else {
        Alert.alert('Success', 'Phone verification code sent!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend phone verification code.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Account</Text>
        <Text style={styles.subtitle}>
          Please enter the verification codes sent to your email and phone
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>📧 Email Verification</Text>
          <Text style={styles.emailText}>{email}</Text>
          <TextInput
            mode="outlined"
            label="Email Verification Code"
            style={styles.codeInput}
            placeholder="Enter 6-digit code"
            value={emailCode}
            onChangeText={setEmailCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.resendButton} onPress={resendEmailCode}>
            <Text style={styles.resendText}>Resend Email Code</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>📱 Phone Verification</Text>
          <Text style={styles.phoneText}>{phone}</Text>
          <TextInput
            mode="outlined"
            label="Phone Verification Code"
            style={styles.codeInput}
            placeholder="Enter 6-digit code"
            value={phoneCode}
            onChangeText={setPhoneCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.resendButton} onPress={resendPhoneCode}>
            <Text style={styles.resendText}>Resend Phone Code</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.verifyButton, loading && styles.disabledButton]} 
          onPress={handleVerification}
          disabled={loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify Both Codes'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'hotpink',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    flex: 1,
    gap: 20,
  },
  codeSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  emailText: {
    fontSize: 14,
    color: 'gray',
    fontStyle: 'italic',
  },
  phoneText: {
    fontSize: 14,
    color: 'gray',
    fontStyle: 'italic',
  },
  codeInput: {
    width: '100%',
  },
  resendButton: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
  },
  resendText: {
    color: 'hotpink',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  verifyButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  backButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hotpink',
  },
  backButtonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 