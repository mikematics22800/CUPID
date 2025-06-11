import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function UnsureScreen() {
  // This would typically come from your backend/database
  const unsureProfiles = [
    { id: '1', name: 'Emma', age: 28, photo: 'https://via.placeholder.com/150', bio: 'Love hiking and photography' },
    { id: '2', name: 'James', age: 31, photo: 'https://via.placeholder.com/150', bio: 'Coffee enthusiast and traveler' },
    // Add more profiles as needed
  ];

  const renderProfile = ({ item }) => (
    <View style={styles.profileCard}>
      <Image source={{ uri: item.photo }} style={styles.profilePhoto} />
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{item.name}, {item.age}</Text>
        <Text style={styles.profileBio} numberOfLines={2}>{item.bio}</Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={[styles.actionButton, styles.likeButton]}>
          <Ionicons name="heart" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.skipButton]}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Maybe Later</Text>
      </View>
      <FlatList
        data={unsureProfiles}
        renderItem={renderProfile}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  profilePhoto: {
    width: '100%',
    height: 300,
  },
  profileInfo: {
    padding: 15,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  profileBio: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButton: {
    backgroundColor: '#4CAF50',
  },
  skipButton: {
    backgroundColor: '#FF3B30',
  },
}); 