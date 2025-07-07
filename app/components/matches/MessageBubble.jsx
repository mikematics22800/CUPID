import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessageBubble({ 
  message, 
  isMyMessage, 
  onDeleteMessage 
}) {
  const isTempMessage = message.isTemp || message.id.startsWith('temp-');

  return (
    <View style={[
      styles.messageContainer,
      isMyMessage ? styles.myMessage : styles.theirMessage
    ]}>
      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myBubble : styles.theirBubble
      ]}>
        <Text style={[
          styles.messageText,
          isMyMessage ? styles.myMessageText : styles.theirMessageText
        ]}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
          {isMyMessage && (
            <View style={styles.messageStatus}>
              {isTempMessage ? (
                <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.7)" />
              ) : (
                <Ionicons 
                  name={message.is_read ? "checkmark-done" : "checkmark"} 
                  size={16} 
                  color={message.is_read ? "#007AFF" : "rgba(255, 255, 255, 0.7)"} 
                />
              )}
            </View>
          )}
        </View>
      </View>
      {isMyMessage && !isTempMessage && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDeleteMessage(message.id)}
        >
          <Ionicons name="trash-outline" size="16" color="white" />
        </TouchableOpacity>
      )}
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
    padding: 12,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: 'pink',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: 'hotpink',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: 'hotpink',
    marginRight: 4,
  },
  myMessageTime: {
    color: 'white',
  },
  theirMessageTime: {
    color: 'hotpink',
  },
  messageStatus: {
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
}); 