import { StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native-paper';

export default function EmailInput({
  email,
  setEmail,
  validationStatus,
  label = "Email"
}) {
  return (
    <View style={styles.emailInputContainer}>
      <TextInput
        mode="outlined"
        label={label}
        style={styles.emailInput}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        left={
          <TextInput.Icon 
            icon="email" 
          />
        }
        numberOfLines={1}
        ellipsizeMode="tail"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emailInputContainer: {
    width: '100%',
  },
  emailInput: {
    width: '100%',
  },
}); 