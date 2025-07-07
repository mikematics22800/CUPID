import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import MatchCard from './MatchCard';

export default function MatchesList({ 
  matches, 
  chatRooms, 
  processingUnmatch,
  onOpenChat, 
  onUnmatch 
}) {
  const renderMatch = ({ item }) => {
    // Find if there's a chat room for this match
    const chatRoom = chatRooms.find(room => room.otherUser.id === item.id);
    
    return (
      <MatchCard
        match={item}
        chatRoom={chatRoom}
        onOpenChat={onOpenChat}
        onUnmatch={onUnmatch}
        processingUnmatch={processingUnmatch}
      />
    );
  };

  if (matches.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="heart-outline" size={80} color="white" />
        <Text style={styles.emptyText}>No matches yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={matches}
      renderItem={renderMatch}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  listContainer: {
    padding: 20,
  },
}); 