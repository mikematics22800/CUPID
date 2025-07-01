import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function SexPreferenceModal({ 
  visible, 
  tempPreferredSex, 
  setTempPreferredSex, 
  onClose, 
  onSave 
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
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
            <TouchableOpacity style={styles.modalButton} onPress={onClose}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={onSave}>
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
  pickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  picker: {
    width: '100%',
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
}); 