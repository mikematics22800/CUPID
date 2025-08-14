import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

export default function TimePicker({
  visible,
  onClose,
  onTimeSelected,
  initialTime = new Date(),
  title = "Select Time"
}) {
  const [selectedHour, setSelectedHour] = useState(initialTime.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialTime.getMinutes());
  const [selectedPeriod, setSelectedPeriod] = useState(initialTime.getHours() >= 12 ? 'PM' : 'AM');

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const handleConfirm = () => {
    let hour = selectedHour;
    if (selectedPeriod === 'PM' && selectedHour !== 12) {
      hour += 12;
    } else if (selectedPeriod === 'AM' && selectedHour === 12) {
      hour = 0;
    }

    const selectedTime = new Date();
    selectedTime.setHours(hour, selectedMinute, 0, 0);
    
    onTimeSelected(selectedTime);
    onClose();
  };

  const formatTime = (hour, minute, period) => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinute} ${period}`;
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
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerContainer}>
            <View style={styles.timeDisplay}>
              <Text style={styles.timeDisplayText}>
                {formatTime(selectedHour, selectedMinute, selectedPeriod)}
              </Text>
            </View>

            <View style={styles.pickersRow}>
              {/* Hour Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <Picker
                  selectedValue={selectedHour}
                  onValueChange={(itemValue) => setSelectedHour(itemValue)}
                  style={styles.picker}
                >
                  {hours.map((hour) => (
                    <Picker.Item 
                      key={hour} 
                      label={hour.toString().padStart(2, '0')} 
                      value={hour} 
                    />
                  ))}
                </Picker>
              </View>

              {/* Minute Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <Picker
                  selectedValue={selectedMinute}
                  onValueChange={(itemValue) => setSelectedMinute(itemValue)}
                  style={styles.picker}
                >
                  {minutes.map((minute) => (
                    <Picker.Item 
                      key={minute} 
                      label={minute.toString().padStart(2, '0')} 
                      value={minute} 
                    />
                  ))}
                </Picker>
              </View>

              {/* Period Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Period</Text>
                <Picker
                  selectedValue={selectedPeriod}
                  onValueChange={(itemValue) => setSelectedPeriod(itemValue)}
                  style={styles.picker}
                >
                  {periods.map((period) => (
                    <Picker.Item 
                      key={period} 
                      label={period} 
                      value={period} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'hotpink',
  },
  pickerContainer: {
    padding: 20,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  timeDisplayText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  pickerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  picker: {
    width: 80,
    height: 120,
  },
});
