import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: user?.photoURL || 'https://via.placeholder.com/150' }}
            style={styles.profileImage}
          />
          <TouchableOpacity style={styles.editImageButton}>
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user?.displayName || 'User Name'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#333" />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="lock-closed-outline" size={24} color="#333" />
          <Text style={styles.menuText}>Privacy & Security</Text>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  signOutButton: {
    margin: 20,
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 