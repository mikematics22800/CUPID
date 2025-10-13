import { View, Text, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useState, useEffect } from 'react';

// Generate age options from 18 to 100
const generateAgeOptions = () => {
  const ages = [];
  for (let i = 18; i <= 100; i++) {
    ages.push(i);
  }
  return ages;
};

const ageOptions = generateAgeOptions();

export default function AgeRangeModal({ visible, onClose, ageRange, onSave }) {
  const [tempAgeRange, setTempAgeRange] = useState({ min: 18, max: 50 });

  // Update temp values when modal opens or ageRange changes
  useEffect(() => {
    if (visible) {
      setTempAgeRange(ageRange);
    }
  }, [visible, ageRange]);

  const handleSave = () => {
    // Validate age range
    if (tempAgeRange.min > tempAgeRange.max) {
      Alert.alert('Invalid Age Range', 'Minimum age cannot be greater than maximum age');
      return;
    }
    onSave(tempAgeRange);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Age Range</Text>
          <View style={styles.pickersContainer}>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Min</Text>
              <Picker
                selectedValue={tempAgeRange.min}
                onValueChange={(itemValue) => setTempAgeRange(prev => ({ ...prev, min: itemValue }))}
                style={styles.picker}
              >
                {ageOptions.map(age => (
                  <Picker.Item key={`min-${age}`} label={age.toString()} value={age} />
                ))}
              </Picker>
            </View>
            <View style={styles.pickerWrapper}>
              <Text style={styles.pickerLabel}>Max</Text>
              <Picker
                selectedValue={tempAgeRange.max}
                onValueChange={(itemValue) => setTempAgeRange(prev => ({ ...prev, max: itemValue }))}
                style={styles.picker}
              >
                {ageOptions.map(age => (
                  <Picker.Item key={`max-${age}`} label={age.toString()} value={age} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleSave}>
              <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  pickersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  pickerWrapper: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    height: 150,
  },
  ageSeparator: {
    marginHorizontal: 10,
    fontSize: 24,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
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
    backgroundColor: 'hotpink',
  },
  modalButtonTextPrimary: {
    color: '#fff',
  },
});

