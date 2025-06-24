import { StyleSheet, Text, TouchableOpacity, View, Image, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export default function WelcomeScreen({ onLoginPress, onRegisterPress }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    floatingAnimation.start();

    return () => floatingAnimation.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10], // Move up 20 pixels
  });

  return (
    <View style={styles.welcome}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>C.U.P.I.D.</Text>
        <Animated.Image 
          source={require('../../../assets/images/cupid.png')} 
          style={[styles.logo, { transform: [{ translateY }] }]} 
        />
        <Text style={styles.heroText}>
          Coupling Unit for Personal Interconnection and Dating
        </Text>
      </View>
      <View style={styles.auth}>
        <TouchableOpacity style={styles.loginButton} onPress={onLoginPress}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerButton} onPress={onRegisterPress}>
          <Text style={styles.registerButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    padding: 20,
    gap: 50,
  },
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    position: 'relative',
  },
  heroTitle: {
    fontSize: 50,
    color: 'hotpink',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'PixelifySans',
  },
  heroText: {
    fontSize: 20,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontFamily: 'PixelifySans',
  },
  auth: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButton: {
    width: '90%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  registerButton: {
    width: '90%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hotpink',
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
}); 