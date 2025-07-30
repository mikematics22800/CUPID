import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';

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
        isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
      ]}>
        {isMyMessage && !isTempMessage && onDeleteMessage && (
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => onDeleteMessage(message.id)}
          >
            <MaterialIcons name="cancel" size={18} color="#FF4444" />
          </TouchableOpacity>
        )}
        <Text style={styles.messageText}>
          {message.content}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
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
                  color="white" 
                />
              )}
            </View>
          )}
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
    paddingRight: 20, // Make room for close button
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
  closeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 9,
  },
}); 