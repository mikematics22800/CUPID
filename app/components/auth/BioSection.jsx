import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

export default function BioSection({
  bio,
  setBio
}) {
  return (
    <View style={styles.bioSection}>
      <TextInput
        mode="outlined"
        label="About Me"
        style={styles.bioInput}
        placeholder="Share your interests, hobbies, what you're looking for, and anything else that makes you unique..."
        value={bio}
        onChangeText={setBio}
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bioSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  bioInput: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
}); 