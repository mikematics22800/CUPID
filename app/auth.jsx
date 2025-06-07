import { Video } from 'expo-av';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import Welcome from './components/auth/Welcome';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';

export default function LoginScreen() {
  const [loginForm, setLoginForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(false);

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