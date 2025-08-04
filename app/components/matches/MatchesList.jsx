import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import MatchCard from './MatchCard';

export default function MatchesList({ 
  matches, 
  processingUnmatch,
  onOpenChat, 
  onUnmatch 
}) {
  const renderMatch = ({ item }) => {
    // In new schema, messages are stored within matches
    // No need for separate chat rooms
    return (
      <MatchCard
        match={item}
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
    <View style={styles.container}>
      <FlatList
        data={matches}
        renderItem={renderMatch}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  countText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    fontWeight: '500',
  },
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
}); 