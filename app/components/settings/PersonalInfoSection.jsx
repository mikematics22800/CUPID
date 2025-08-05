import { StyleSheet, Text, View, Modal } from 'react-native';
import { TextInput, Button, Menu, Divider } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';

export default function PersonalInfoSection({
  sex,
  setSex,
  birthday,
  setBirthday,
  validationStatus
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sexMenuVisible, setSexMenuVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

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

  return (
    <View style={styles.flexColGap10}>
      <View style={styles.dualInputs}>
        <TextInput
          mode="outlined"
          label="First Name"
          style={[
            styles.nameInput, 
            !validationStatus.firstName && firstName.length > 0 && styles.invalidInput
          ]}
          placeholder="Enter your first name"
          value={firstName}
          onChangeText={setFirstName}
          keyboardType="default"
          maxLength={20}
          outlineColor={!validationStatus.firstName && firstName.length > 0 ? 'red' : undefined}
        />
        <TextInput
          mode="outlined"
          label="Last Name"
          style={[
            styles.nameInput, 
            !validationStatus.lastName && lastName.length > 0 && styles.invalidInput
          ]}
          placeholder="Enter your last name"
          value={lastName}
          onChangeText={setLastName}
          keyboardType="default"
          maxLength={20}
          outlineColor={!validationStatus.lastName && lastName.length > 0 ? 'red' : undefined}
        />
      </View>
      <View style={styles.dualInputs}>
        <View style={[
          styles.dateSelect,
          !validationStatus.birthday && birthday && styles.invalidInput
        ]}>
          <TextInput
            mode="outlined"
            label="Birthday"
            style={styles.dateInput}
            placeholder="Select your birthday"
            value={formatDate(birthday)}
            onPressIn={() => setDatePickerVisible(true)}
            editable={false}
            right={<TextInput.Icon icon="calendar" />}
            outlineColor={!validationStatus.birthday && birthday ? 'red' : undefined}
          />
        </View>
        <View style={[
          styles.sexSelect,
          !validationStatus.sex && sex && styles.invalidInput
        ]}>
          <Menu
            visible={sexMenuVisible}
            onDismiss={() => setSexMenuVisible(false)}
            anchor={
              <TextInput
                mode="outlined"
                label="Biological Sex"
                style={styles.sexInput}
                placeholder="Select your biological sex"
                value={sex || ''}
                onPressIn={() => setSexMenuVisible(true)}
                editable={false}
                right={<TextInput.Icon icon="chevron-down" />}
                outlineColor={!validationStatus.sex && sex ? 'red' : undefined}
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
  );
}

const styles = StyleSheet.create({
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
  invalidInput: {
    borderColor: 'red',
    borderWidth: 1,
  },
}); 