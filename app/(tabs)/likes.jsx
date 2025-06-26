import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUsersWhoLikedMe, handleUserLike, discardLike } from '../../lib/supabase';

export default function LikesScreen() {
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  const fetchLikes = async () => {
    try {
      setLoading(true);
      console.log('🔄 Starting to fetch likes...');
      
      const likesData = await getUsersWhoLikedMe();
      console.log('📊 Likes data received:', likesData);
      console.log('📊 Number of likes:', likesData.length);
      
      setLikes(likesData);
      console.log(`✅ Successfully loaded ${likesData.length} likes`);

    } catch (error) {
      console.error('❌ Error in fetchLikes:', error);
      Alert.alert('Error', 'Failed to load likes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLikes();
  };

  const handleLikeBack = async (userId) => {
    try {
      setProcessingAction(userId);
      
      const result = await handleUserLike(userId);
      
      if (result.success) {
        if (result.isMatch) {
          // Remove from likes list immediately since they're now a match
          setLikes(prevLikes => prevLikes.filter(like => like.id !== userId));
          
          Alert.alert(
            '🎉 It\'s a Match!',
            'You and this person have liked each other! They\'ll now appear in your matches.',
            [
              {
                text: 'View Matches',
                onPress: () => {
                  // Navigate to matches tab
                  // You could add navigation here if needed
                }
              },
              {
                text: 'Continue',
                style: 'cancel'
              }
            ]
          );
        } else {
          // Remove from likes list since they're no longer just a "like"
          setLikes(prevLikes => prevLikes.filter(like => like.id !== userId));
          Alert.alert('Success', 'You liked them back!');
        }
      }
    } catch (error) {
      console.error('❌ Error liking back:', error);
      Alert.alert('Error', 'Failed to like back. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDiscard = async (userId) => {
    try {
      setProcessingAction(userId);
      
      const result = await discardLike(userId);
      
      if (result.success) {
        // Remove from likes list
        setLikes(prevLikes => prevLikes.filter(like => like.id !== userId));
        
        if (!result.alreadyDiscarded) {
          Alert.alert('Discarded', 'You passed on this like.');
        }
      }
    } catch (error) {
      console.error('❌ Error discarding like:', error);
      Alert.alert('Error', 'Failed to discard like. Please try again.');
    } finally {
      setProcessingAction(null);
    }
  };

  const renderLikeItem = ({ item }) => (
    <View style={styles.likeItem}>
      <View style={styles.userInfo}>
        <View style={styles.photoContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.userPhoto} />
          ) : (
            <View style={styles.placeholderPhoto}>
              <Ionicons name="person" size={40} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {item.name}, {item.age}
          </Text>
          <Text style={styles.userBio} numberOfLines={2}>
            {item.bio}
          </Text>
          {item.interests && item.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              {item.interests.slice(0, 3).map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
              {item.interests.length > 3 && (
                <Text style={styles.moreInterests}>+{item.interests.length - 3} more</Text>
              )}
            </View>
          )}
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.discardButton]}
          onPress={() => handleDiscard(item.id)}
          disabled={processingAction === item.id}
        >
          {processingAction === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="close" size={20} color="white" />
              <Text style={styles.actionButtonText}>Pass</Text>
            </>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.likeBackButton]}
          onPress={() => handleLikeBack(item.id)}
          disabled={processingAction === item.id}
        >
          {processingAction === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="heart" size={20} color="white" />
              <Text style={styles.actionButtonText}>Like Back</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="heart-outline" size={80} color="#ccc" />
      <Text style={styles.emptyTitle}>No likes yet</Text>
      <Text style={styles.emptySubtitle}>
        When someone likes your profile, they'll appear here
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hotpink" />
        <Text style={styles.loadingText}>Loading likes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Likes</Text>
        <Text style={styles.headerSubtitle}>
          {likes.length} {likes.length === 1 ? 'person' : 'people'} liked you
        </Text>
      </View>
      
      <FlatList
        data={likes}
        renderItem={renderLikeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    padding: 15,
  },
  likeItem: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoContainer: {
    marginRight: 15,
  },
  userPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  interestTag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  interestText: {
    fontSize: 12,
    color: '#666',
  },
  moreInterests: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  likeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  likedText: {
    marginLeft: 5,
    fontSize: 14,
    color: 'hotpink',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    gap: 8,
  },
  discardButton: {
    backgroundColor: '#ff6b6b',
  },
  likeBackButton: {
    backgroundColor: 'hotpink',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
}); 