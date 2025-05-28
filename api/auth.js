import { getApp, initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from 'firebase/auth';

// Initialize Firebase only on client side
let auth;
if (typeof window !== 'undefined') {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  };

  // Initialize Firebase only if it hasn't been initialized
  let app;
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    // If Firebase is already initialized, get the existing app
    app = getApp();
  }

  auth = getAuth(app);
}

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
