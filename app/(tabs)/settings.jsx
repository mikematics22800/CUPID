import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, deleteUserAccount } from '../../lib/supabase';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  
  // Filter settings
  const [ageRange, setAgeRange] = useState({ min: 18, max: 50 });
  const [preferredSex, setPreferredSex] = useState('all');
  const [maxDistance, setMaxDistance] = useState(50);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [showSexModal, setShowSexModal] = useState(false);
  const [showDistanceModal, setShowDistanceModal] = useState(false);
  const [tempAgeRange, setTempAgeRange] = useState({ min: 18, max: 50 });
  const [tempPreferredSex, setTempPreferredSex] = useState('all');
  const [tempMaxDistance, setTempMaxDistance] = useState(50);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data including:\n\n• Your profile and photos\n• All your matches and conversations\n• Your likes and preferences\n\nThis action is irreversible.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your final warning. Deleting your account will:\n\n• Permanently remove all your data\n• End all your matches and conversations\n• Cannot be undone\n\nAre you absolutely sure you want to proceed?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteUserAccount();
                      Alert.alert(
                        'Account Deleted',
                        'Your account data has been successfully removed from CUPID. You have been signed out. For complete account deletion from our systems, please contact support.',
                        [
                          {
                            text: 'OK',
                            onPress: () => {
                              // Navigate to auth screen
                              router.replace('/auth');
                            }
                          }
                        ]
                      );
                    } catch (error) {
                      console.error('Account deletion error:', error);
                      Alert.alert(
                        'Deletion Error',
                        'There was an error deleting your account. Please try again or contact support.',
                        [
                          {
                            text: 'OK'
                          }
                        ]
                      );
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleAgeRangePress = () => {
    setTempAgeRange(ageRange);
    setShowAgeModal(true);
  };

  const handleSexPreferencePress = () => {
    setTempPreferredSex(preferredSex);
    setShowSexModal(true);
  };

  const handleDistancePress = () => {
    setTempMaxDistance(maxDistance);
    setShowDistanceModal(true);
  };

  const saveAgeRange = () => {
    // Validate age range
    if (tempAgeRange.min > tempAgeRange.max) {
      Alert.alert('Invalid Age Range', 'Minimum age cannot be greater than maximum age');
      return;
    }
    if (tempAgeRange.min < 18 || tempAgeRange.max > 100) {
      Alert.alert('Invalid Age Range', 'Age must be between 18 and 100');
      return;
    }
    setAgeRange(tempAgeRange);
    setShowAgeModal(false);
  };

  const saveSexPreference = () => {
    setPreferredSex(tempPreferredSex);
    setShowSexModal(false);
  };

  const saveDistance = () => {
    setMaxDistance(tempMaxDistance);
    setShowDistanceModal(false);
  };

  const getSexDisplayText = (sex) => {
    switch (sex) {
      case 'male': return 'Men';
      case 'female': return 'Women';
      case 'all': return 'All';
      default: return 'All';
    }
  };

  const getDistanceDisplayText = (distance) => {
    if (distance === 1) return '1 mile';
    if (distance === 100) return '100+ miles';
    return `${distance} miles`;
  };

  const SettingItem = ({ icon, title, value, onPress, showSwitch = false, displayValue = null, destructive = false }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color={destructive ? "#ff3b30" : "#007AFF"} style={styles.settingIcon} />
        <Text style={[styles.settingText, destructive && styles.destructiveText]}>{title}</Text>
      </View>
      {showSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#007AFF' : '#f4f3f4'}
        />
      ) : (
        <View style={styles.settingRight}>
          {displayValue && <Text style={styles.settingValue}>{displayValue}</Text>}
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingItem
          icon="person-outline"
          title="Edit Profile"
          onPress={() => router.push('/profile')}
        />
        <SettingItem
          icon="mail-outline"
          title="Email Settings"
          onPress={() => {}}
        />
        <SettingItem
          icon="lock-closed-outline"
          title="Privacy"
          onPress={() => {}}
        />
              <SettingItem
          icon="trash-outline"
          title="Delete Account"
          onPress={handleDeleteAccount}
          destructive
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Filtering</Text>
        <SettingItem
          icon="people-outline"
          title="Age Range"
          displayValue={`${ageRange.min}-${ageRange.max}`}
          onPress={handleAgeRangePress}
        />
        <SettingItem
          icon="heart-outline"
          title="Show Me"
          displayValue={getSexDisplayText(preferredSex)}
          onPress={handleSexPreferencePress}
        />
        <SettingItem
          icon="location-outline"
          title="Maximum Distance"
          displayValue={getDistanceDisplayText(maxDistance)}
          onPress={handleDistancePress}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <SettingItem
          icon="notifications-outline"
          title="Push Notifications"
          value={notifications}
          onPress={() => setNotifications(!notifications)}
          showSwitch
        />
        <SettingItem
          icon="mail-outline"
          title="Email Notifications"
          value={emailNotifications}
          onPress={() => setEmailNotifications(!emailNotifications)}
          showSwitch
        />
        <SettingItem
          icon="location-outline"
          title="Show Distance"
          value={showDistance}
          onPress={() => setShowDistance(!showDistance)}
          showSwitch
        />
        <SettingItem
          icon="wifi-outline"
          title="Show Online Status"
          value={showOnlineStatus}
          onPress={() => setShowOnlineStatus(!showOnlineStatus)}
          showSwitch
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem
          icon="help-circle-outline"
          title="Help Center"
          onPress={() => {}}
        />
        <SettingItem
          icon="document-text-outline"
          title="Terms of Service"
          onPress={() => {}}
        />
        <SettingItem
          icon="shield-outline"
          title="Privacy Policy"
          onPress={() => {}}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Version 1.0.0</Text>

      {/* Age Range Modal */}
      <Modal
        visible={showAgeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAgeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Age Range</Text>
            <View style={styles.ageInputContainer}>
              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Min Age</Text>
                <TextInput
                  style={styles.ageTextInput}
                  value={tempAgeRange.min.toString()}
                  onChangeText={(text) => setTempAgeRange(prev => ({ ...prev, min: parseInt(text) || 18 }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <Text style={styles.ageSeparator}>-</Text>
              <View style={styles.ageInput}>
                <Text style={styles.ageLabel}>Max Age</Text>
                <TextInput
                  style={styles.ageTextInput}
                  value={tempAgeRange.max.toString()}
                  onChangeText={(text) => setTempAgeRange(prev => ({ ...prev, max: parseInt(text) || 50 }))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowAgeModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveAgeRange}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sex Preference Modal */}
      <Modal
        visible={showSexModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSexModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Show Me</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tempPreferredSex}
                onValueChange={(itemValue) => setTempPreferredSex(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Men" value="male" />
                <Picker.Item label="Women" value="female" />
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowSexModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveSexPreference}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Distance Modal */}
      <Modal
        visible={showDistanceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Maximum Distance</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={tempMaxDistance}
                onValueChange={(itemValue) => setTempMaxDistance(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="1 mile" value={1} />
                <Picker.Item label="5 miles" value={5} />
                <Picker.Item label="10 miles" value={10} />
                <Picker.Item label="25 miles" value={25} />
                <Picker.Item label="50 miles" value={50} />
                <Picker.Item label="100+ miles" value={100} />
              </Picker>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowDistanceModal(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={saveDistance}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: 20,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    marginRight: 12,
    color: '#333',
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  ageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ageInput: {
    flex: 1,
    marginRight: 10,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  ageTextInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
    backgroundColor: '#f9f9f9',
  },
  ageSeparator: {
    marginHorizontal: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  modalButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
  },
  destructiveText: {
    color: '#ff3b30',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
});
