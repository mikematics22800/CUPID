import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SettingItem({ 
  icon, 
  title, 
  value, 
  onPress, 
  showSwitch = false, 
  displayValue = null, 
  destructive = false 
}) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons 
          name={icon} 
          size={24} 
          color={destructive ? "#ff3b30" : "#007AFF"} 
          style={styles.settingIcon} 
        />
        <Text style={[styles.settingText, destructive && styles.destructiveText]}>
          {title}
        </Text>
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
}

const styles = StyleSheet.create({
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
  destructiveText: {
    color: '#ff3b30',
  },
}); 