import { StyleSheet, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { register } from '../../../lib/supabase';
import PersonalInfoSection from '../settings/PersonalInfoSection';
import RegisterButton from './RegisterButton';
import ContactSection from './ContactSection';

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

  const handleRegister = () => {
    register(firstName, lastName, phone, email, sex, birthday, password, onBack, setLoading, onRegistrationSuccess);
  };

  useEffect(() => {
    // Email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Phone validation - ensure it has at least 10 digits
    const cleanedPhone = phone.replace(/\D/g, '');
    const isPhoneValid = cleanedPhone.length >= 10;
    
    // Check if all required fields are filled and valid
    const isValid = 
      firstName?.trim().length > 0 &&
      lastName?.trim().length > 0 &&
      sex !== null &&
      email?.match(emailRegex) !== null &&
      isPhoneValid &&
      birthday instanceof Date &&
      password?.length >= 8; // Require at least 8 characters for password

    setIsFormValid(isValid);
  }, [firstName, lastName, sex, email, phone, birthday, password]);

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
      <PersonalInfoSection
        firstName={firstName}
        setFirstName={setFirstName}
        lastName={lastName}
        setLastName={setLastName}
        sex={sex}
        setSex={setSex} 
        birthday={birthday}
        setBirthday={setBirthday}
        validationStatus={validationStatus}
      />
      
      <ContactSection
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        phone={phone}
        setPhone={setPhone}
        validationStatus={validationStatus}
      />
      
      <RegisterButton
        isFormValid={isFormValid}
        loading={loading}
        onRegister={handleRegister}
        onBack={onBack}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 25,
    paddingVertical: 50,
  },
  formContent: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
}); 