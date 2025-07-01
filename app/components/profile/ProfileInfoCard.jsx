import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileInfoCard({ profile }) {
  if (!profile) return null;

  return (
    <View style={styles.profileCard}>
      <View style={styles.profileRow}>
        <Ionicons name="person" size={20} color="hotpink" style={styles.profileIcon} />
        <Text style={styles.profileValue}>{profile.name || '-'}</Text>
      </View>
      <View style={styles.profileRow}>
        <Ionicons name="male-female" size={20} color="hotpink" style={styles.profileIcon} />
        <Text style={styles.profileValue}>{profile.sex || '-'}</Text>
      </View>
      <View style={styles.profileRow}>
        <Ionicons name="calendar-outline" size={20} color="hotpink" style={styles.profileIcon} />
        <Text style={styles.profileValue}>
          {profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '-'}
        </Text>
      </View>
      <View style={styles.profileRow}>
        <Ionicons name="mail" size={20} color="hotpink" style={styles.profileIcon} />
        <Text style={styles.profileValue}>{profile.email || '-'}</Text>
      </View>
      <View style={styles.profileRow}>
        <Ionicons name="call" size={20} color="hotpink" style={styles.profileIcon} />
        <Text style={styles.profileValue}>{profile.phone || '-'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    display: 'flex',
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  profileIcon: {
    marginRight: 5,
  },
  profileValue: {
    color: '#222',
    fontSize: 15,
  },
}); 