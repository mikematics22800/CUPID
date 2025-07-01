import { StyleSheet, Text, View } from 'react-native';
import { TextInput } from 'react-native-paper';

export default function PhoneInput({
  phone,
  setPhone,
  validationStatus,
  label = "Phone Number"
}) {
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
    <View style={styles.phoneInputContainer}>
      <TextInput
        mode="outlined"
        label={label}
        style={styles.phoneInput}
        value={formatPhoneNumber(phone || '')}
        onChangeText={handlePhoneChange}
        keyboardType="numeric"
        maxLength={14} // (XXX) XXX-XXXX format
        left={
          <TextInput.Icon 
            icon="phone" 
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  phoneInputContainer: {
    width: '100%',
  },
  phoneInput: {
    width: '100%',
  },
}); 