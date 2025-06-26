import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getMatchesForUser } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      
      const matchesData = await getMatchesForUser();
      setMatches(matchesData);
      console.log(`✅ Successfully loaded ${matchesData.length} matches`);

    } catch (error) {
      console.error('❌ Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMatch = ({ item }) => (
    <TouchableOpacity style={styles.matchCard}>
      <Image 
        source={{ uri: item.photo || 'https://picsum.photos/150/150' }} 
        style={styles.matchPhoto} 
      />
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{item.name}, {item.age}</Text>
        <Text style={styles.matchBio} numberOfLines={2}>{item.bio}</Text>
        {item.interests && item.interests.length > 0 && (
          <View style={styles.interestsContainer}>
            {item.interests.slice(0, 2).map((interest, index) => (
              <Text key={index} style={styles.interestTag}>{interest}</Text>
            ))}
            {item.interests.length > 2 && (
              <Text style={styles.interestTag}>+{item.interests.length - 2} more</Text>
            )}
          </View>
        )}
        <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <View style={styles.matchActions}>
        <Text style={styles.timestamp}>{item.timestamp}</Text>
        <TouchableOpacity style={styles.messageButton}>
          <Ionicons name="chatbubble-outline" size={20} color="hotpink" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
        <TouchableOpacity onPress={loadMatches} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="hotpink" />
        </TouchableOpacity>
      </View>
      
      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubtext}>Keep swiping to find your perfect match!</Text>
          <TouchableOpacity style={styles.swipeButton} onPress={() => router.push('/(tabs)/swipe')}>
            <Text style={styles.swipeButtonText}>Start Swiping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
  },
  swipeButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  swipeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 4,
  },
  interestTag: {
    fontSize: 10,
    color: 'hotpink',
    backgroundColor: '#ffe6f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#999',
  },
  matchActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageButton: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
  },
});
