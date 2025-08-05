import { StyleSheet, View } from 'react-native';
import ResidenceInput from './ResidenceInput';

export default function PersonalInfoForm({
  residence,
  setResidence,
  validationStatus
}) {
  return (
    <View style={styles.container}>
      <ResidenceInput
        value={residence}
        onChangeText={setResidence}
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