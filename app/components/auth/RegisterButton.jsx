import { StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';

export default function RegisterButton({
  isFormValid,
  loading,
  onRegister,
  onBack
}) {
  return (
    <ScrollView 
      style={styles.buttonContainer}
      contentContainerStyle={styles.contentContainer}
    >
      <TouchableOpacity 
        style={[styles.button, !isFormValid && styles.disabledButton]} 
        onPress={onRegister}
        disabled={!isFormValid || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Registering...' : 'Register'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={{...styles.button, marginBottom: 50}} onPress={onBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    justifyContent: 'center',
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
    fontSize: 18,
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
    opacity: 0.7,
  },
}); 