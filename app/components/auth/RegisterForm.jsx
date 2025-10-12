import { StyleSheet, ScrollView, Text, View, Modal, TouchableOpacity } from 'react-native';
import { TextInput, Button, Menu, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, useEffect } from 'react';
import { register } from '../../../lib/supabase';
import EmailInput from './EmailInput';
import PasswordInput from './PasswordInput';
import PhoneInput from './PhoneInput';

export default function RegisterForm({ onBack, onRegistrationSuccess }) {
  const [isFormValid, setIsFormValid] = useState(false);
  const [firstName, setFirstName] = useState('Michael');
  const [lastName, setLastName] = useState('Medina');
  const [phone, setPhone] = useState('5617159065');
  const [email, setEmail] = useState('mikematics22800@gmail.com');
  const [password, setPassword] = useState('D7452m61457!');
  const [sex, setSex] = useState('Male');
  const [birthday, setBirthday] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 18)));
  const [loading, setLoading] = useState(false);
  const [sexMenuVisible, setSexMenuVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const handleRegister = () => {
    register(firstName, lastName, phone, email, sex, birthday, password, setLoading, onRegistrationSuccess);
  };

  const handleSexChange = (selectedSex) => {
    setSex(selectedSex);
    setSexMenuVisible(false);
  };

  const handleBirthdayChange = (event, selectedDate) => {
    if (selectedDate) {
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 18);
      
      if (selectedDate > minDate) {
        // If selected date is less than 18 years ago, don't update
        return;
      }
      setBirthday(selectedDate);
    }
    setDatePickerVisible(false);
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString();
  };

  useEffect(() => {
    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Phone validation - ensure it has at least 10 digits (required)
    const cleanedPhone = phone.replace(/\D/g, '');
    const isPhoneValid = cleanedPhone.length >= 10;
    
    // Email validation (required)
    const isEmailValid = email?.match(emailRegex) !== null;
    
    // Password validation (required, at least 8 characters)
    const isPasswordValid = password?.length >= 8;
    
    // All fields are required
    const baseValid = 
      firstName?.trim().length > 0 &&
      lastName?.trim().length > 0 &&
      sex !== null &&
      birthday instanceof Date &&
      isPhoneValid &&
      isEmailValid &&
      isPasswordValid;

    setIsFormValid(baseValid);
  }, [firstName, lastName, sex, phone, email, password, birthday]);

  // Validation helper functions
  const getFieldValidationStatus = () => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const cleanedPhone = phone.replace(/\D/g, '');
    
    return {
      firstName: firstName?.trim().length > 0,
      lastName: lastName?.trim().length > 0,
      sex: sex !== null,
      email: email?.match(emailRegex) !== null,
      phone: cleanedPhone.length >= 10,
      birthday: birthday instanceof Date,
      password: password?.length >= 8
    };
  };

  const validationStatus = getFieldValidationStatus();

  return (
    <ScrollView 
      style={styles.form} 
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formsContainer}>
        {/* Personal Info Section */}
        <View style={styles.flexColGap10}>
        <View style={styles.dualInputs}>
          <TextInput
            mode="outlined"
            label="First Name"
            style={styles.nameInput}
            value={firstName}
            onChangeText={setFirstName}
            keyboardType="default"
            maxLength={20}
          />
          <TextInput
            mode="outlined"
            label="Last Name"
            style={styles.nameInput}
            value={lastName}
            onChangeText={setLastName}
            keyboardType="default"
            maxLength={20}
          />
        </View>
        <View style={styles.dualInputs}>
          <View style={styles.dateSelect}>
            <TextInput
              mode="outlined"
              label="Birthday"
              style={styles.dateInput}
              value={formatDate(birthday)}
              onPressIn={() => setDatePickerVisible(true)}
              editable={false}
              right={<TextInput.Icon icon="calendar" />}
            />
          </View>
          <View style={styles.sexSelect}>
            <Menu
              visible={sexMenuVisible}
              onDismiss={() => setSexMenuVisible(false)}
              anchor={
                <TextInput
                  mode="outlined"
                  label="Biological Sex"
                  style={styles.sexInput}
                  value={sex || ''}
                  onPressIn={() => setSexMenuVisible(true)}
                  editable={false}
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              }
            >
              <Menu.Item onPress={() => handleSexChange('Male')} title="Male" />
              <Divider />
              <Menu.Item onPress={() => handleSexChange('Female')} title="Female" />
            </Menu>
          </View>
        </View>
        <Modal
          visible={datePickerVisible}
          transparent={true}
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Birthday</Text>
              <DateTimePicker 
                value={birthday || new Date()} 
                onChange={handleBirthdayChange}
                maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
                mode="date"
                display="spinner"
              />
              <Button 
                mode="contained" 
                onPress={() => setDatePickerVisible(false)}
                style={styles.modalButton}
              >
                Done
              </Button>
            </View>
          </View>
        </Modal>
        </View>
        <View style={styles.flexColGap10}>
          <PhoneInput
            phone={phone}
            setPhone={setPhone}
            validationStatus={validationStatus}
          />
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
        </View>
      </View> 
      
      {/* Register Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button]} 
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Register'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.button, styles.backButton]} 
          onPress={onBack}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    height: '100%',
  },
  formContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 25,
    paddingVertical: 50,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  formsContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  flexColGap10: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
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
  dateSelect: {
    flex: 1,
  },
  dateInput: {
    width: '100%',
  },
  sexSelect: {
    flex: 1,
  },
  sexInput: {
    width: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalButton: {
    marginTop: 20,
    width: '100%',
  },
  buttonContainer: {
    width: '100%',
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
  backButton: {
    marginBottom: 50,
  },
}); 