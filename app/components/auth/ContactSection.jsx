import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import PhoneInput from "react-native-phone-number-input";
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';

export default function ContactSection({
  email,
  setEmail,
  password,
  setPassword,
  phone,
  setPhone,
  validationStatus
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.flexColGap10}>
      <View style={styles.emailInputContainer}>
        <TextInput
          mode="outlined"
          label="Email"
          style={[
            styles.emailInput,
            !validationStatus.email && email.length > 0 && styles.invalidInput
          ]}
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor={!validationStatus.email && email.length > 0 ? 'red' : undefined}
        />
      </View>
      <View style={[
        styles.passwordInputContainer,
        !validationStatus.password && password.length > 0 && styles.invalidInput
      ]}>
        <TextInput
          mode="outlined"
          label="Password"
          style={styles.passwordInput}
          placeholder="Enter your password (min 8 characters)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          outlineColor={!validationStatus.password && password.length > 0 ? 'red' : undefined}
          right={
            <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
      </View>
      <View style={[
        styles.phoneInput,
        !validationStatus.phone && phone.length > 0 && styles.invalidInput
      ]}>
        <PhoneInput
          defaultValue={phone}
          defaultCode="US"
          layout="first"
          onChangeText={(text) => {
            setPhone(text);
          }}
          withDarkTheme
          withShadow
          autoFocus
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flexColGap10: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  emailInput: {
    width: '100%',
  },
  emailInputContainer: {
    width: '100%',
  },
  passwordInputContainer: {
    width: '100%',
  },
  passwordInput: {
    width: '100%',
  },
  phoneInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 18,
    color: 'black',
  },
  invalidInput: {
    borderColor: 'red',
    borderWidth: 1,
  },
}); 