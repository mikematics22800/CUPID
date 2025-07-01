import { StyleSheet, View } from 'react-native';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PhoneInput from './PhoneInput';

export default function ContactSection({
  email,
  setEmail,
  password,
  setPassword,
  phone,
  setPhone,
  validationStatus
}) {
  return (
    <View style={styles.flexColGap10}>
      <EmailInput
        email={email}
        setEmail={setEmail}
        validationStatus={validationStatus}
      />
      <PasswordInput
        password={password}
        setPassword={setPassword}
        validationStatus={validationStatus}
      />
      <PhoneInput
        phone={phone}
        setPhone={setPhone}
        validationStatus={validationStatus}
      />
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
}); 