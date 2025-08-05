import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export default function WelcomeScreen({ onLoginPress, onRegisterPress }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
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
        <Text style={styles.heroTitle}>CUPID</Text>
        <Animated.Image 
          source={require('../../../assets/images/cupid.png')} 
          style={[styles.logo, { transform: [{ translateY }] }]} 
        />
        <Text style={styles.heroText}>
          <Text style={{color: 'white'}}>C</Text>ognitive <Text style={{color: 'white'}}>U</Text>ser <Text style={{color: 'white'}}>P</Text>latform <Text style={{color: 'white'}}>I</Text>nnovating <Text style={{color: 'white'}}>D</Text>ating 🏹
        </Text>
      </View>
      <View style={styles.auth}>
        <TouchableOpacity style={styles.button} onPress={onLoginPress}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onRegisterPress}>
          <Text style={styles.buttonText}>Register</Text>
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
    padding: 25,
    gap: 25,
  },
  logo: {
    height: 250,
    resizeMode: 'contain',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    position: 'relative',
    gap: 15,
  },
  heroTitle: {
    fontSize: 100,
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  heroText: {
    fontSize: 25,
    color: 'pink',
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
}); 