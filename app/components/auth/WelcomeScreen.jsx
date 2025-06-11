import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen({ onLoginPress, onRegisterPress }) {
  return (
    <View style={styles.welcome}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ourglass</Text>
        <Text style={styles.heroText}>
          Less transaction. More connection.
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
    fontSize: 50,
    color: 'hotpink',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  heroText: {
    fontSize: 25,
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
    borderWidth: 1,
    borderColor: 'white',
  },
  registerButton: {
    width: '100%',
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