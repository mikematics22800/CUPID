import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MatchCard({ 
  match, 
  chatRoom, 
  onOpenChat, 
  onUnmatch, 
  processingUnmatch 
}) {
  const hasUnreadMessages = chatRoom?.lastMessage && !chatRoom.lastMessage.isFromMe && !chatRoom.lastMessage.isRead;

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchContent}>
        {match.photo ? (
          <Image 
            source={{ uri: match.photo }} 
            style={styles.matchPhoto}
            resizeMode="cover"
            onError={() => {
              console.log('Failed to load image for match:', match.id);
            }}
          />
        ) : (
          <View style={styles.matchPhotoPlaceholder}>
            <Ionicons name="person" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.matchInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.matchName}>{match.name}, {match.age}</Text>
            {hasUnreadMessages && <View style={styles.unreadBadge} />}
          </View>
        </View>
      </View>
      <View style={styles.matchActions}>
        <Text style={styles.timestamp}>
          {chatRoom?.lastMessage ? 
            new Date(chatRoom.lastMessage.createdAt).toLocaleString([], { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit', 
              minute: '2-digit' 
            }) : 
            'Just matched!'
          }
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.messageButton, hasUnreadMessages && styles.unreadButton]}
            onPress={() => onOpenChat(match)}
          >
            <Ionicons 
              name={hasUnreadMessages ? "chatbubble" : "chatbubble-outline"} 
              size={20} 
              color={hasUnreadMessages ? "white" : "hotpink"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.unmatchButton, processingUnmatch === match.id && styles.processingButton]}
            onPress={() => onUnmatch(match.id, match.name)}
            disabled={processingUnmatch === match.id}
          >
            {processingUnmatch === match.id ? (
              <Ionicons name="ellipsis-horizontal" size={20} color="white" />
            ) : (
              <Ionicons name="close" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  matchPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'hotpink',
    marginLeft: 8,
  },
  matchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
  },
  unreadButton: {
    backgroundColor: 'hotpink',
  },
  unmatchButton: {
    padding: 8,
    backgroundColor: '#ff6b6b',
    borderRadius: 20,
  },
  processingButton: {
    backgroundColor: '#ccc',
  },
}); 