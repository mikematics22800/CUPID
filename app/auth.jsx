import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WelcomeScreen from './components/auth/WelcomeScreen';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import DualVerificationForm from './components/auth/DualVerificationForm';
import FloatingHearts from './components/auth/FloatingHearts';

export default function LoginScreen() {
  const [loginForm, setLoginForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(false);
  const [verificationForm, setVerificationForm] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  const handleRegistrationSuccess = (email, phone) => {
    setVerificationData({ email, phone });
    setVerificationForm(true);
    setRegisterForm(false);
  };

  const handleVerificationSuccess = () => {
    setVerificationForm(false);
    setVerificationData(null);
    // User can now login
    setLoginForm(true);
  };

  const handleBack = () => {
    setLoginForm(false);
    setRegisterForm(false);
    setVerificationForm(false);
    setVerificationData(null);
  };

  return (
    <View style={styles.auth}>
      <FloatingHearts />
      {!loginForm && !registerForm && !verificationForm && (
        <WelcomeScreen
          onLoginPress={() => setLoginForm(true)}
          onRegisterPress={() => setRegisterForm(true)}
        />
      )}
      {loginForm && (
        <LoginForm
          onBack={handleBack}
        />
      )}
      {registerForm && (
        <RegisterForm
          onBack={handleBack}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}
      {verificationForm && verificationData && (
        <DualVerificationForm
          email={verificationData.email}
          phone={verificationData.phone}
          onVerificationSuccess={handleVerificationSuccess}
          onBack={handleBack}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  auth: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
  },
});