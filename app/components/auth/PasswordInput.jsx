import { StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { TextInput } from 'react-native-paper';

export default function PasswordInput({
  password,
  setPassword,
  validationStatus,
  label = "Password",
  minLength = 8,
  optional = false
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.passwordInputContainer}>
      <TextInput
        mode="outlined"
        label={optional ? `${label} (Optional)` : label}
        style={styles.passwordInput}
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        right={
          <TextInput.Icon 
            icon={showPassword ? "eye-off" : "eye"} 
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  passwordInputContainer: {
    width: '100%',
  },
  passwordInput: {
    width: '100%',
  },
}); 