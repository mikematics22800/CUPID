import app from '../firebase';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from 'firebase/auth';

auth = getAuth(app);

// Setup reCAPTCHA verifier
export const setupRecaptcha = (containerId) => {
  if (typeof window === 'undefined') return;
  
  window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'normal',
    'callback': (response) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    }
  });
};

export const register = async (phoneNumber) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!window.recaptchaVerifier) {
      throw new Error('reCAPTCHA not initialized. Call setupRecaptcha first.');
    }
    
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    
    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

export const verifyOTP = async (otp) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!window.confirmationResult) {
      throw new Error('No phone number verification in progress');
    }
    
    const result = await window.confirmationResult.confirm(otp);
    return result;
  } catch (error) {
    throw error;
  }
};

export const login = async (phoneNumber) => {
  if (typeof window === 'undefined') return;
  
  try {
    if (!window.recaptchaVerifier) {
      throw new Error('reCAPTCHA not initialized. Call setupRecaptcha first.');
    }
    
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    
    return confirmationResult;
  } catch (error) {
    throw error;
  }
};

export const logout = async () => {
  if (typeof window === 'undefined') return;
  
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export const getCurrentUser = () => {
  if (typeof window === 'undefined') return null;
  return auth?.currentUser;
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!auth?.currentUser;
};
