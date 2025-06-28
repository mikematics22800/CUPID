import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-paper';
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

  // Format phone number for better display
  const formatPhoneNumber = (text) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handlePhoneChange = (text) => {
    // Remove formatting for storage, keep only digits
    const cleaned = text.replace(/\D/g, '');
    setPhone(cleaned);
  };

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
        styles.phoneInputContainer,
        !validationStatus.phone && phone.length > 0 && styles.invalidInput
      ]}>
        <TextInput
          mode="outlined"
          label="Phone Number (Required for verification)"
          style={styles.phoneInput}
          placeholder="(555) 123-4567"
          value={formatPhoneNumber(phone)}
          onChangeText={handlePhoneChange}
          keyboardType="numeric"
          maxLength={14} // (XXX) XXX-XXXX format
          outlineColor={!validationStatus.phone && phone.length > 0 ? 'red' : undefined}
          left={
            <TextInput.Icon 
              icon="phone" 
            />
          }
        />
        {phone.length > 0 && !validationStatus.phone && (
          <Text style={styles.errorText}>
            Please enter a valid 10-digit phone number
          </Text>
        )}
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
  phoneInputContainer: {
    width: '100%',
  },
  phoneInput: {
    width: '100%',
  },
  invalidInput: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
}); 