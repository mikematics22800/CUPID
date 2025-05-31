import { Video } from 'expo-av';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PhoneInput from "react-native-phone-number-input";
import { confirmCode, sendVerificationCode } from '../../api/auth';

export default function LoginScreen() {
  const [loginForm, setLoginForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(false);
  const [number, setNumber] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendCode = async () => {
    try {
      const id = await sendVerificationCode(number);
      setVerificationId(id);
      setIsVerifying(true);
      Alert.alert('Success', 'Verification code sent!');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVerifyCode = async () => {
    try {
      await confirmCode(verificationId, verificationCode);
      Alert.alert('Success', 'Phone number verified!');
      // Handle successful verification (e.g., navigate to main app)
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.index}>
      <Video
        source={require('../../assets/media/sequence.mp4')}
        style={styles.bgVideo}
        shouldPlay
        isLooping
        useNativeControls
      />
      {!loginForm && !registerForm && (
        <View style={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Ourglass</Text>
            <Text style={styles.heroText}>
              For wandering hearts desiring more connection and less transaction.
            </Text>
          </View>
          <View style={styles.auth}>
            <TouchableOpacity style={styles.loginButton} onPress={() => setLoginForm(true)}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerButton} onPress={() => setRegisterForm(true)}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.googleButton} onPress={() => {}}>
              <Text style={styles.googleButtonText}>Login with 
                <Text style={{color: '#4285F4'}}> G</Text>
                <Text style={{color: '#DB4437'}}>o</Text>
                <Text style={{color: '#F4B400'}}>o</Text>
                <Text style={{color: '#0F9D58'}}>g</Text>
                <Text style={{color: '#4285F4'}}>l</Text>
                <Text style={{color: '#DB4437'}}>e</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {(loginForm || registerForm) && !isVerifying && (
        <View style={styles.inputs}>
          <PhoneInput
            defaultValue={number}
            defaultCode="US"
            layout="first"
            onChangeText={(text) => {
              setNumber(text);
            }}
            withDarkTheme
            withShadow
            autoFocus
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleSendCode}>
            <Text style={styles.loginButtonText}>Send Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton} onPress={() => {
            setLoginForm(false);
            setRegisterForm(false);
          }}>
            <Text style={styles.registerButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      {isVerifying && (
        <View style={styles.inputs}>
          <TextInput
            style={styles.codeInput}
            placeholder="Enter verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.loginButton} onPress={handleVerifyCode}>
            <Text style={styles.loginButtonText}>Verify Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.registerButton} onPress={() => {
            setIsVerifying(false);
            setVerificationId(null);
          }}>
            <Text style={styles.registerButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  index: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgVideo: {
    position: 'absolute',
    height: '100%',
    aspectRatio: 16 / 9,
  },
  content: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 25,
    gap: 200,
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    gap: 10,
    position: 'relative',
  },
  heroTitle: {
    fontSize: 40,
    color: 'hotpink',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  heroText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  auth: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'black',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  registerButtonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 18,
  },
  googleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  inputs: {
    width: '100%',
    height: '100%', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 20,
    gap: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  codeInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    color: 'black',
  },
});