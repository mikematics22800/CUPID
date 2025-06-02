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
  const [firstName, setFirstName] = useState('Michael');
  const [lastName, setLastName] = useState('Medina');
  const [phoneNumber, setPhoneNumber] = useState('5617159065');
  const [email, setEmail] = useState('mikematics22800@gmail.com');
  const [password, setPassword] = useState('D7452m61457!');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [sex, setSex] = useState('Male');
  const [sexuality, setSexuality] = useState('Heterosexual');
  
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
      
      if (!phoneNumber.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }

      const id = await sendVerificationCode(phoneNumber);
      setVerificationId(id);
      setIsVerifying(true);
      Alert.alert('Success', 'Verification code sent!');
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
      Alert.alert('Error', 'Invalid email or password');
    }
  };

  const handleEmailRegister = async () => {
    try {
      const userCredential = await signUpWithEmail(email, password);
      if (!userCredential?.user?.uid) {
        throw new Error('Failed to create user account');
      }

      await createUserProfile(userCredential.user.uid, {
        name: firstName + ' ' + lastName,
        birthday: birthday.toISOString(),
        sex: sex,
        sexuality: sexuality,
        email: email,
        phoneNumber: phoneNumber,
      });

      Alert.alert('Success', 'Account created successfully!');
      await signIn();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to create account');
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
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber} 
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
          phoneNumber={phoneNumber}
          setPhoneNumber={setPhoneNumber}
          sex={sex}
          setSex={setSex}
          sexuality={sexuality}
          setSexuality={setSexuality}
          birthday={birthday}
          setBirthday={setBirthday}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          onBack={() => {
            setLoginForm(false);
            setRegisterForm(false);
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