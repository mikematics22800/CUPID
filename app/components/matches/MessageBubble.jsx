import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import TimestampDisplay from '../TimestampDisplay';

export default function MessageBubble({ 
  message, 
  isMyMessage, 
  onDeleteMessage,
  isDeleteMode = false
}) {

  return (
    <View style={[
      styles.messageContainer,
      isMyMessage ? styles.myMessage : styles.theirMessage
    ]}>
      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
      ]}>
        {isMyMessage && isDeleteMode && onDeleteMessage && ( 
          <TouchableOpacity 
            style={styles.deleteButton} 
            onPress={() => onDeleteMessage(message.id)}
          >
            <Ionicons name="trash" size={16} color="#FF4444" />
          </TouchableOpacity>
        )}
        <Text style={[
          styles.messageText,
          isMyMessage && isDeleteMode && styles.messageTextWithDelete
        ]}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <TimestampDisplay 
            timestamp={message.created_at}
            format="time"
            style={styles.messageTime}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    minWidth: 100,
    padding: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  myMessageBubble: {
    backgroundColor: '#FFB6C1', // Light pink color for user messages
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#FFB6C1', // Light pink color for other messages
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    color: 'white',
  },
  messageTextWithDelete: {
    paddingRight: 20, // Make room for delete button when in delete mode
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  messageStatus: {
    marginLeft: 'auto',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
}); 