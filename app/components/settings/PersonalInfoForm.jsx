import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';
import { EmailInput, PhoneInput } from '../auth/index';
import ResidenceInput from './ResidenceInput';

export default function PersonalInfoForm({
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phone,
  setPhone,
  residence,
  setResidence,
  validationStatus
}) {
  return (
    <View style={styles.container}>
      <View style={styles.dualInputs}>
        <TextInput
          mode="outlined"
          label="First Name"
          style={styles.nameInput}
          value={firstName || ''}
          onChangeText={setFirstName}
          keyboardType="default"
          maxLength={20}
        />
        <TextInput
          mode="outlined"
          label="Last Name"
          style={styles.nameInput}
          value={lastName || ''}
          onChangeText={setLastName}
          keyboardType="default"
          maxLength={20}
        />
      </View>
      
      <EmailInput
        email={email}
        setEmail={setEmail}
        validationStatus={validationStatus}
      />
      
      <PhoneInput
        phone={phone}
        setPhone={setPhone}
        validationStatus={validationStatus}
      />
      
      <ResidenceInput
        residence={residence}
        setResidence={setResidence}
        validationStatus={validationStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dualInputs: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  nameInput: {
    flex: 1,
  },
}); 