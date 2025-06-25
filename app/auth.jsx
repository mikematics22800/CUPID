import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WelcomeScreen from './components/auth/WelcomeScreen';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import FloatingHearts from './components/auth/FloatingHearts';

export default function LoginScreen() {
  const [loginForm, setLoginForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(false);

  return (
    <View style={styles.auth}>
      <FloatingHearts />
      {!loginForm && !registerForm && (
        <WelcomeScreen
          onLoginPress={() => setLoginForm(true)}
          onRegisterPress={() => setRegisterForm(true)}
        />
      )}
      {loginForm && (
        <LoginForm
          onBack={() => {
            setLoginForm(false);
            setRegisterForm(false);
          }}
        />
      )}
      {registerForm && (
        <RegisterForm
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
  auth: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'hotpink',
  },
});