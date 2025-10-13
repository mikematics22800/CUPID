import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, SafeAreaView, ScrollView } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { updateUserEmail, sendPhoneUpdateCode, verifyAndUpdatePhone } from '../../../lib/supabase';
import { EmailInput, PhoneInput } from '../auth/index';

export default function AccountSection({
  visible,
  onClose,
  email,
  phone,
  setPhone,
  onPhoneUpdate,
  onLogout,
  onDeleteAccount,
  onDisableAccount,
}) {
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);

  // Initialize form when modal opens
  useState(() => {
    if (visible) {
      setNewEmail(email || '');
      setNewPhone(phone || '');
    }
  });

  const handleEmailUpdate = async () => {
    if (!newEmail || !newEmail.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    if (newEmail === email) {
      Alert.alert('No Change', 'This is already your current email address.');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      // Update email using the new function - sends verification emails to both old and new
      // The email won't be updated in the database until user clicks verification links in BOTH emails
      const result = await updateUserEmail(newEmail);
      
      if (result.success) {
        // Note: Email is not updated in database yet - user must verify both emails first
        // Close modal and reset
        resetModal();
      }
    } catch (error) {
      console.error('Error updating email:', error);
      // Error alert is handled in updateUserEmail function
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handlePhoneUpdate = async () => {
    const cleanedPhone = newPhone.replace(/\D/g, '');
    if (!cleanedPhone || cleanedPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
      return;
    }

    if (cleanedPhone === phone) {
      Alert.alert('No Change', 'This is already your current phone number.');
      return;
    }

    setIsUpdatingPhone(true);
    try {
      // Send verification code to new phone using the new function
      const result = await sendPhoneUpdateCode(newPhone);
      
      if (result.success) {
        setShowPhoneVerification(true);
      }
    } catch (error) {
      console.error('Error sending phone verification:', error);
      // Error alert is handled in sendPhoneUpdateCode function
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  // Email verification is now handled by clicking the link in the email
  // No need for a code verification function for email

  const verifyPhoneCode = async () => {
    if (!phoneVerificationCode || phoneVerificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingPhone(true);
    try {
      // Verify and update phone using the new function
      const result = await verifyAndUpdatePhone(newPhone, phoneVerificationCode);
      
      if (result && result.success) {
        // Update the phone in the profile
        if (onPhoneUpdate) {
          await onPhoneUpdate(result.phone);
        } else if (setPhone) {
          setPhone(result.phone);
        }
        
        setShowPhoneVerification(false);
        setNewPhone('');
        setPhoneVerificationCode('');
        resetModal();
      }
    } catch (error) {
      console.error('Error verifying phone:', error);
      // Error alert is handled in verifyAndUpdatePhone function
      // Reset verification state on error
      setPhoneVerificationCode('');
    } finally {
      setIsVerifyingPhone(false);
    }
  };

  const formatPhoneDisplay = (phoneNumber) => {
    if (!phoneNumber) return '';
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
            resetModal();
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            if (onDeleteAccount) {
              onDeleteAccount();
            }
            resetModal();
          }
        }
      ]
    );
  };

  const handleDisableAccount = () => {
    Alert.alert(
      'Confirm Disable',
      'Disabling your account will hide your profile from other users, pausing your matches and conversations.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disable Account',
          style: 'destructive',
          onPress: () => {
            if (onDisableAccount) {
              onDisableAccount();
            }
            resetModal();
          }
        }
      ]
    );
  };

  const resetModal = () => {
    setShowPhoneVerification(false);
    setNewEmail('');
    setNewPhone('');
    setPhoneVerificationCode('');
    setIsUpdatingEmail(false);
    setIsUpdatingPhone(false);
    setIsVerifyingPhone(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={resetModal}
    >
      <SafeAreaView style={styles.container}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={resetModal}
          >
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Account</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!showPhoneVerification ? (
            <View style={styles.mainContainer}>
                <View style={styles.inputsContainer}>
                  <View style={styles.inputSection}>
                    <EmailInput
                      email={newEmail}
                      setEmail={setNewEmail}
                      label="Email"
                    />
                    <TouchableOpacity 
                      style={[styles.updateButton, isUpdatingEmail && styles.disabledButton]} 
                      onPress={handleEmailUpdate}
                      disabled={isUpdatingEmail}
                    >
                      <Text style={styles.updateButtonText}>
                        {isUpdatingEmail ? 'Sending...' : 'Update Email'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputSection}>
                    <PhoneInput
                      phone={newPhone}
                      setPhone={setNewPhone}
                      label="Phone"
                    />
                    <TouchableOpacity 
                      style={[styles.updateButton, isUpdatingPhone && styles.disabledButton]} 
                      onPress={handlePhoneUpdate}
                      disabled={isUpdatingPhone}
                    >
                      <Text style={styles.updateButtonText}>
                        {isUpdatingPhone ? 'Sending...' : 'Update Phone'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.actionContainer}>
                <TouchableOpacity 
                  style={[styles.actionItem, styles.logoutAction]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={24} color="white" />
                  <Text style={styles.actionItemText}>Log Out</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionItem, styles.disableAction]}
                  onPress={handleDisableAccount}
                >
                  <Ionicons name="pause-circle-outline" size={24} color="white" />
                  <Text style={styles.actionItemText}>Disable Account</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionItem, styles.deleteAction]}
                  onPress={handleDeleteAccount}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                  <Text style={styles.actionItemText}>Delete Account</Text>
                </TouchableOpacity>
                </View>
            </View>
          ) : (
            <View style={styles.verificationSection}>
              <Text style={styles.sectionTitle}>Phone Verification</Text>
              <Text style={styles.sectionDescription}>
                Enter the 6-digit verification code sent to {formatPhoneDisplay(newPhone)}
              </Text>
              
              <TextInput
                mode="outlined"
                label="Verification Code"
                style={styles.verificationInput}
                value={phoneVerificationCode}
                onChangeText={setPhoneVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                outlineColor="#ddd"
                activeOutlineColor="hotpink"
              />
              
              <View style={styles.verificationButtons}>
                <TouchableOpacity 
                  style={[styles.verifyButton, isVerifyingPhone && styles.disabledButton]} 
                  onPress={verifyPhoneCode}
                  disabled={isVerifyingPhone}
                >
                  <Text style={styles.verifyButtonText}>
                    {isVerifyingPhone ? 'Verifying...' : 'Verify Code'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={() => setShowPhoneVerification(false)}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 20,
    gap: 10,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  inputsContainer: {
    gap: 25,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  verificationSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  verificationInput: {
    backgroundColor: 'white',
    marginBottom: 20,
  },
  verificationButtons: {
    gap: 12,
  },
  verifyButton: {
    backgroundColor: 'hotpink',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: 'hotpink',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  updateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutAction: {
    backgroundColor: '#007AFF',
  },
  disableAction: {
    backgroundColor: '#FF9500',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
  },
  actionItemText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
    color: 'white',
  },
  actionContainer: {
    gap: 10,
  }
}); 