import { Video } from 'expo-av';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { confirmCode, sendVerificationCode, signInWithGoogle, signInWithEmail, signUpWithEmail } from '../api/auth';
import { createUserProfile, getUserProfile } from '../api/firestore';
import { useAuth } from '../context/auth';
import { auth } from '../firebase';
import Welcome from './components/auth/Welcome';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import VerificationForm from './components/auth/VerificationForm';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [loginForm, setLoginForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [sex, setSex] = useState('');
  const [sexuality, setSexuality] = useState('');
  
  // Calculate date 18 years ago
  const today = new Date();
  const adultbirthday = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const [birthday, setBirthday] = useState(adultbirthday);

  const handleSendCode = async () => {
    try {
      // Validate all required fields for registration
      if (registerForm) {
        if (!firstName.trim()) {
          Alert.alert('Error', 'Please enter your first name');
          return;
        }
        if (!lastName.trim()) {
          Alert.alert('Error', 'Please enter your last name');
          return;
        }
        if (!birthday) {
          Alert.alert('Error', 'Please select your date of birth');
          return;
        }
        if (!sex) {
          Alert.alert('Error', 'Please select your sex');
          return;
        }
      }
      
      if (!number.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }

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
      const user = auth.currentUser;
      
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        
        if (!userProfile) {
          await createUserProfile(user.uid, {
            phoneNumber: number,
            name: firstName + ' ' + lastName,
            birthday: birthday.toISOString(),
            sex: sex,
            sexuality: sexuality,
          });
        }
        
        await signIn();
        Alert.alert('Success', 'Phone number verified!');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      const user = auth.currentUser;
      
      if (user) {
        const userProfile = await getUserProfile(user.uid);
        
        if (!userProfile) {
          await createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            birthday: null, // Google sign-in doesn't provide DOB
          });
        }
        
        await signIn();
        Alert.alert('Success', 'Google login successful!');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEmailRegister = async () => {
    try {
      await signUpWithEmail(email, password);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.index}>
      <Video
        source={require('.././assets/media/sequence.mp4')}
        style={styles.bgVideo}
        shouldPlay
        isLooping
      />
      <View style={styles.darkOverlay}/>
      {!loginForm && !registerForm && (
        <Welcome
          onLoginPress={() => setLoginForm(true)}
          onRegisterPress={() => setRegisterForm(true)}
          onGoogleLogin={handleGoogleLogin}
        />
      )}
      {loginForm && !isVerifying && (
        <LoginForm
          onEmailLogin={handleEmailLogin}
          number={number}
          setNumber={setNumber}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onSendCode={handleSendCode}
          onBack={() => {
            setLoginForm(false);
            setRegisterForm(false);
          }}
        />
      )}
      {registerForm && !isVerifying && (
        <RegisterForm
          onEmailRegister={handleEmailRegister}
          firstName={firstName}
          setFirstName={setFirstName}
          lastName={lastName}
          setLastName={setLastName}
          number={number}
          setNumber={setNumber}
          sex={sex}
          setSex={setSex}
          sexuality={sexuality}
          setSexuality={setSexuality}
          birthday={birthday}
          setBirthday={setBirthday}
          onBack={() => {
            setLoginForm(false);
            setRegisterForm(false);
          }}
        />
      )}
      {isVerifying && (
        <VerificationForm
          verificationCode={verificationCode}
          setVerificationCode={setVerificationCode}
          onVerifyCode={handleVerifyCode}
          onBack={() => {
            setIsVerifying(false);
            setVerificationId(null);
          }}
        />
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
  darkOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bgVideo: {
    position: 'absolute',
    height: '100%',
    aspectRatio: 16 / 9,
  },
});