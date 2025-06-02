import { auth } from '../firebase';
import { 
  signInWithPhoneNumber,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateEmail,
  updatePassword,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { exchangeCodeAsync } from 'expo-auth-session';

// Initialize WebBrowser for auth
WebBrowser.maybeCompleteAuthSession();

export const sendVerificationCode = async (phoneNumber) => {
  try {
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
    return confirmation;
  } catch (error) {
    console.error('Error sending verification code:', error);
    throw error;
  }
};

export const confirmCode = async (confirmation, code) => {
  try {
    const userCredential = await confirmation.confirm(code);
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
  return auth.currentUser;
};

export const isAuthenticated = () => {
  return !!auth.currentUser;
};

export const signInWithGoogle = async () => {
  try {
    const redirectUri = makeRedirectUri({
      scheme: 'ourglass'
    });

    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const scopes = ['profile', 'email'];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}`;

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type === 'success') {
      const { code } = result.params;
      
      const tokenResponse = await exchangeCodeAsync(
        {
          clientId,
          code,
          redirectUri,
        },
        {
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
        }
      );

      const credential = GoogleAuthProvider.credential(tokenResponse.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      return userCredential;
    }
    
    throw new Error('Google sign in was cancelled or failed');
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};  

export const signUpWithEmail = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
};

export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const updateUserEmail = async (email) => {
  try {
    await updateEmail(auth, email);
  } catch (error) {
    console.error('Error updating email:', error);
    throw error;
  }
};

export const updateUserPassword = async (password) => {
  try {
    await updatePassword(auth, password);
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

export const updateUserProfile = async (profile) => {
  try {
    await updateProfile(auth, profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};

export const deleteUserAccount = async () => {
  try {
    await deleteUser(auth);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};