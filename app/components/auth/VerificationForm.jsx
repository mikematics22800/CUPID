import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function VerificationForm({ verificationCode, setVerificationCode, onVerifyCode, onBack }) {
  return (
    <View style={styles.flexColGap10}>
      <TextInput
        style={styles.codeInput}
        placeholder="Enter verification code"
        value={verificationCode}
        onChangeText={setVerificationCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity style={styles.loginButton} onPress={onVerifyCode}>
        <Text style={styles.loginButtonText}>Verify Code</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.registerButton} onPress={onBack}>
        <Text style={styles.registerButtonText}>Back</Text>
      </TouchableOpacity>
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
  codeInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 18,
    color: 'black',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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