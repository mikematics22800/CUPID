import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PhoneInput from "react-native-phone-number-input";
import { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import RNPickerSelect from 'react-native-picker-select';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function RegisterForm({ 
  firstName,
  setFirstName,
  lastName,
  setLastName,
  number,
  setNumber,
  setSex,
  sex,
  sexuality,
  setSexuality,
  email,
  setEmail,
  password,
  setPassword,
  birthday,
  setBirthday,
  onBack,
  onEmailRegister,
}) {
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Check if all required fields are filled and valid
    const isValid = 
      firstName?.trim().length > 0 &&
      lastName?.trim().length > 0 &&
      sex !== null &&
      sexuality !== null &&
      email?.match(emailRegex) !== null &&
      number?.length >= 10 &&
      birthday instanceof Date;

    setIsFormValid(isValid);
  }, [firstName, lastName, sex, sexuality, email, number, birthday]);

  const handleSexChange = (sex) => {
    setSex(sex);
  };

  const handleSexualityChange = (sexuality) => {
    setSexuality(sexuality);
  };

  const [showPassword, setShowPassword] = useState(false);

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
  };

  return (
      <View style={styles.form}>
        <View style={styles.flexColGap10}>
          <View style={styles.dualInputs}>
            <TextInput
              style={styles.nameInput}
              placeholder="First Name"
              value={firstName}x
              onChangeText={setFirstName}
              keyboardType="default"
              maxLength={20}
            />
            <TextInput
              style={styles.nameInput}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              keyboardType="default"
              maxLength={20}
            />
          </View>
          <View style={styles.dualInputs}>
            <View style={styles.picker}>
              <RNPickerSelect
                onValueChange={(value) => handleSexChange(value)}
                items={[
                  { label: 'Male', value: 'Male' },
                  { label: 'Female', value: 'Female' },
                ]}
                placeholder={{ label: 'Biological Sex', value: null }}
                style={{
                  inputIOS: styles.pickerInput,
                  inputAndroid: styles.pickerInput,
                  placeholder: styles.pickerPlaceholder,
                }}
                value={sex}
                useNativeAndroidPickerStyle={false}
                touchableWrapperProps={{
                  activeOpacity: 0.7,
                }}
                Icon={() => {
                  return <Ionicons name="chevron-down" size={24} color="black" />;
                }}
              />
            </View>
            <View style={styles.picker}>
              <RNPickerSelect
                onValueChange={(value) => handleSexualityChange(value)}
                items={[
                  { label: 'Heterosexual', value: 'Heterosexual' },
                  { label: 'Homosexual', value: 'Homosexual' },
                  { label: 'Bisexual', value: 'Bisexual' },
                ]}
                placeholder={{ label: 'Sexuality', value: null }}
                style={{
                  inputIOS: styles.pickerInput,
                  inputAndroid: styles.pickerInput,
                  placeholder: styles.pickerPlaceholder,
                }}
                value={sexuality}
                useNativeAndroidPickerStyle={false}
                touchableWrapperProps={{
                  activeOpacity: 0.7,
                }}
                Icon={() => {
                  return <Ionicons name="chevron-down" size={24} color="black" />;
                }}
              />
            </View>
          </View>
          <View style={styles.dateSelect}>
            <Text style={styles.dateSelectText}>Birthday 🎂</Text>
            <DateTimePicker 
              value={birthday} 
              onChange={handleBirthdayChange}
              maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
              mode="date"
            />
          </View>
          <View style={styles.emailInputContainer}>
            <TextInput
              style={styles.emailInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="black" />
            </TouchableOpacity>
          </View>
          <View style={styles.phoneInput}>
            <PhoneInput
              defaultValue={number}
              defaultCode="US"
              layout="first"
              onChangeText={(text) => {
                setNumber(text);
              }}
              withDarkTheme
              withShadow
              autoFocus
            />
          </View>
          <TouchableOpacity 
            style={[styles.registerButton, !isFormValid && styles.disabledButton]} 
            onPress={onEmailRegister}
            disabled={!isFormValid}
          >
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 100,
    padding: 20,
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
  },
  nameInput: {
    width: '48%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    color: 'black',
  },
  emailInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 16,
    color: 'black',
  },
  dateSelect: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10
  },
  picker: {
    width: '48%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectText: {
    color: 'black',
    fontSize: 16,
  },
  phoneInput: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 18,
    color: 'black',
  },
  registerButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'hotpink',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  backButton: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'hotpink',
  },
  registerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  backButtonText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 18,
  },
  calendar: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    position: 'absolute',
    zIndex: 1,
    width: '90%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ffb6c1',
    opacity: 0.7,
  },
  passwordInputContainer: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 10
,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: 'black',
  },
}); 