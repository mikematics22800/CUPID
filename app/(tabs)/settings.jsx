import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showDistance, setShowDistance] = useState(true);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const SettingItem = ({ icon, title, value, onPress, showSwitch = false }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={24} color="#007AFF" style={styles.settingIcon} />
        <Text style={styles.settingText}>{title}</Text>
      </View>
      {showSwitch ? (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={value ? '#007AFF' : '#f4f3f4'}
        />
      ) : (
        <Ionicons name="chevron-forward" size={24} color="#999" />
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
          onPress={() => {}}
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
});
