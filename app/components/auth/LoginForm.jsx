import { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { TextInput } from 'react-native-paper';
import { signInWithEmail } from '../../../lib/supabase';

export default function LoginForm({ onBack }) {
  const [email, setEmail] = useState('michaeljmedina22800@gmail.com');
  const [password, setPassword] = useState('D7452m61457!');
  const [loading, setLoading] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignInWithEmail = async () => {
    setLoading(true);
    await signInWithEmail(email, password, setLoading);
  };

  useEffect(() => {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email) && password.length >= 6);
  }, [email, password]);

  return (
    <View style={styles.form}>
      <View style={styles.flexColGap10}>
        <TextInput
          mode="outlined"
          label="Email"
          style={styles.emailInput} 
          placeholder="Enter your email address" 
          onChangeText={setEmail}
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.passwordInputContainer}>
          <TextInput 
            mode="outlined"
            label="Password"
            placeholder="Enter your password" 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
            style={styles.passwordInput}
            value={password}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
        </View>
        <TouchableOpacity 
          style={[styles.button, !isEmailValid && styles.disabledButton]} 
          onPress={handleSignInWithEmail}
          disabled={!isEmailValid}
        >
          <Text style={styles.buttonText}>Login with Email</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.flexColGap10}>
        <TextInput
          mode="outlined"
          label="Phone Number"
          style={styles.emailInput} 
          placeholder="Enter your phone number" 
          onChangeText={setEmail}
          value={email}
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <View style={styles.passwordInputContainer}>
          <TextInput 
            mode="outlined"
            label="Password"
            placeholder="Enter your password" 
            onChangeText={setPassword} 
            secureTextEntry={!showPassword} 
            style={styles.passwordInput}
            value={password}
            right={
              <TextInput.Icon 
                icon={showPassword ? "eye-off" : "eye"} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
        </View>
        <TouchableOpacity 
          style={[styles.button, !isEmailValid && styles.disabledButton]} 
          onPress={handleSignInWithEmail}
          disabled={!isEmailValid}
        >
          <Text style={styles.buttonText}>Login with Phone</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 25,
    padding: 25,
  },
  flexColGap10: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 20,
  },
  emailInput: {
    width: '100%',
  },
  passwordInputContainer: {
    width: '100%',
  },
  passwordInput: {
    width: '100%',
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
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
    opacity: 0.7,
  },
  infoSection: {
    width: '100%',
    alignItems: 'center',
  },
  infoText: {
    color: 'gray',
    fontSize: 12,
  },
}); 