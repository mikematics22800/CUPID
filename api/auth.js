import {
  PhoneAuthProvider,
  signInWithCredential,
  signOut
} from 'firebase/auth';
import { auth } from '../firebase';

export const sendVerificationCode = async (phoneNumber) => {
  try {
    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(phoneNumber);
    return verificationId;
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw error;
  }
};

export const confirmCode = async (verificationId, code) => {
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential;
  } catch (error) {
    console.error('Error confirming code:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = () => {
  return auth?.currentUser;
};

export const isAuthenticated = () => {
  return !!auth?.currentUser;
};
