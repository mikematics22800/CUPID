import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getOrCreateChatRoom,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  subscribeToMessages,
  unsubscribeFromChannel,
  deleteMessage,
  supabase,
} from '../../../lib/supabase';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { matchId, matchName, matchPhoto } = params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const flatListRef = useRef(null);

  useEffect(() => {
    initializeChat();
    return () => {
      if (subscription) {
        unsubscribeFromChannel(subscription);
      }
    };
  }, [matchId]);

  const initializeChat = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      setCurrentUserId(user.id);

      // Get or create chat room
      const chatRoomId = await getOrCreateChatRoom(user.id, matchId);
      setRoomId(chatRoomId);

      // Load existing messages
      const messagesData = await getMessages(chatRoomId);
      setMessages(messagesData);

      // Mark messages as read
      await markMessagesAsRead(chatRoomId);

      // Subscribe to real-time messages
      const messageSubscription = subscribeToMessages(chatRoomId, (newMessage, event) => {
        if (event === 'update') {
          // Handle message updates (like read status)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id ? { ...msg, ...newMessage } : msg
            )
          );
        } else {
          // Handle new messages - only add if it's not from current user
          // (current user's messages are handled optimistically)
          if (newMessage.sender_id !== user.id) {
            setMessages(prev => [...prev, {
              ...newMessage,
              sender_name: 'Unknown User', // Will be updated when we fetch user data
            }]);
            // Mark as read
            markMessagesAsRead(chatRoomId);
          } else {
            // If it's from current user, update any temporary message with the real data
            setMessages(prev => 
              prev.map(msg => 
                msg.isTemp && msg.sender_id === user.id
                  ? {
                      ...newMessage,
                      sender_name: 'You',
                      isTemp: false,
                    }
                  : msg
              )
            );
          }
        }
      });

      setSubscription(messageSubscription);

    } catch (error) {
      console.error('❌ Error initializing chat:', error);
      Alert.alert('Error', 'Failed to load chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !roomId || sending) return;

    try {
      setSending(true);
      const messageContent = newMessage.trim();
      setNewMessage('');

      // Create a temporary message ID that we can track
      const tempMessageId = `temp-${Date.now()}`;
      
      // Optimistically add message to UI
      const tempMessage = {
        id: tempMessageId,
        content: messageContent,
        message_type: 'text',
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        is_read: false,
        sender_name: 'You', // Add sender name for consistency
        isTemp: true, // Flag to identify temporary messages
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // Send message to server
      const sentMessage = await sendMessage(roomId, messageContent, 'text');
      
      // Update the temporary message with the real message data
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessageId 
            ? {
                ...sentMessage,
                sender_name: 'You',
                isTemp: false,
              }
            : msg
        )
      );

    } catch (error) {
      console.error('❌ Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      // Restore the message input
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMessage(messageId);
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            } catch (error) {
              console.error('❌ Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message.');
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === currentUserId;
    const isTempMessage = item.isTemp || item.id.startsWith('temp-');

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
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.theirMessageTime
            ]}>
              {new Date(item.created_at).toLocaleTimeString([], { 
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
                    name={item.is_read ? "checkmark-done" : "checkmark"} 
                    size={16} 
                    color={item.is_read ? "#007AFF" : "rgba(255, 255, 255, 0.7)"} 
                  />
                )}
              </View>
            )}
          </View>
        </View>
        {isMyMessage && !isTempMessage && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteMessage(item.id)}
          >
            <Ionicons name="trash-outline" size="16" color="#999" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hotpink" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Image 
            source={{ uri: matchPhoto || 'https://picsum.photos/150/150' }} 
            style={styles.headerPhoto} 
          />
          <Text style={styles.headerName}>{matchName}</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      />

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="send" size={20} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  moreButton: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 15,
  },
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
    backgroundColor: 'hotpink',
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
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 4,
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  messageStatus: {
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: 'hotpink',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
}); 