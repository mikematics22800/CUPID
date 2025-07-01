import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';

export default function AgeRangeModal({ 
  visible, 
  tempAgeRange, 
  setTempAgeRange, 
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
}); 