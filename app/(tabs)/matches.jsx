import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native';
import { 
  getMatchesForUser, 
  unmatchUsers, 
  supabase, 
  getChatRooms, 
  subscribeToChatRooms, 
  unsubscribeFromChannel,
  getOrCreateChatRoom,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  subscribeToMessages,
  deleteMessage
} from '../../lib/supabase';
import { generateChatSuggestions, getSuggestionCategories } from '../components/matches/chatSuggestions';
import { detectViolentThreats, isUserBanned, getUserStrikes } from '../components/matches/contentModeration';
import { useRouter } from 'expo-router';

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUnmatch, setProcessingUnmatch] = useState(null);
  const [chatSubscription, setChatSubscription] = useState(null);
  
  // Chat state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [messageSubscription, setMessageSubscription] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Chat suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionCategories, setSuggestionCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true);

  // Content moderation state
  const [moderatingMessage, setModeratingMessage] = useState(false);
  const [userStrikes, setUserStrikes] = useState(0);
  const [userBanned, setUserBanned] = useState(false);

  const flatListRef = useRef(null);

  // Get current user on component mount
  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
    loadMatches();
    loadChatRooms();
    setupChatSubscription();
    }

    return () => {
      if (chatSubscription) {
        unsubscribeFromChannel(chatSubscription);
      }
      if (messageSubscription) {
        unsubscribeFromChannel(messageSubscription);
      }
    };
  }, [currentUserId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

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

  const loadChatRooms = async () => {
    try {
      const roomsData = await getChatRooms();
      setChatRooms(roomsData);
      console.log(`✅ Successfully loaded ${roomsData.length} chat rooms`);
    } catch (error) {
      console.error('❌ Error loading chat rooms:', error);
    }
  };

  const setupChatSubscription = () => {
    // Unsubscribe from existing subscription if it exists
    if (chatSubscription) {
      unsubscribeFromChannel(chatSubscription);
    }
    
    const subscription = subscribeToChatRooms((newRoom, event) => {
      console.log(`🔔 Chat room ${event}:`, newRoom);
      loadChatRooms(); // Reload chat rooms when there are updates
    });
    setChatSubscription(subscription);
  };

  const handleUnmatch = async (userId, userName) => {
    try {
      setProcessingUnmatch(userId);
      
      // Get current user
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('User not authenticated');
      }
      
      await unmatchUsers(currentUser.id, userId);
      
      // Remove from local state
      setMatches(prevMatches => prevMatches.filter(match => match.id !== userId));
      
      Alert.alert('Unmatched', `You have unmatched with ${userName}`);
      
    } catch (error) {
      console.error('❌ Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch. Please try again.');
    } finally {
      setProcessingUnmatch(null);
    }
  };

  const confirmUnmatch = (userId, userName) => {
    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${userName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: () => handleUnmatch(userId, userName)
        }
      ]
    );
  };

  const openChat = async (match) => {
    try {
      setChatLoading(true);
      setSelectedMatch(match);
      
      // Get or create chat room
      const chatRoomId = await getOrCreateChatRoom(currentUserId, match.id);
      setRoomId(chatRoomId);

      // Load existing messages
      const messagesData = await getMessages(chatRoomId);
      setMessages(messagesData);

      // Mark messages as read
      await markMessagesAsRead(chatRoomId);

      // Unsubscribe from existing message subscription if it exists
      if (messageSubscription) {
        unsubscribeFromChannel(messageSubscription);
      }

      // Subscribe to real-time messages
      const subscription = subscribeToMessages(chatRoomId, (newMessage, event) => {
        if (event === 'update') {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id ? { ...msg, ...newMessage } : msg
            )
          );
        } else {
          if (newMessage.sender_id !== currentUserId) {
            setMessages(prev => [...prev, {
              ...newMessage,
              sender_name: 'Unknown User',
            }]);
            markMessagesAsRead(chatRoomId);
          } else {
            setMessages(prev => 
              prev.map(msg => 
                msg.isTemp && msg.sender_id === currentUserId
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

      setMessageSubscription(subscription);

    } catch (error) {
      console.error('❌ Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const closeChat = () => {
    setSelectedMatch(null);
    setMessages([]);
    setNewMessage('');
    setRoomId(null);
    setSuggestions([]);
    setSuggestionCategories([]);
    setShowSuggestions(false);
    if (messageSubscription) {
      unsubscribeFromChannel(messageSubscription);
      setMessageSubscription(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !roomId || sending || moderatingMessage) return;

    try {
      setModeratingMessage(true);
      const messageContent = newMessage.trim();
      
      // Check for violent threats BEFORE sending
      const threatCheck = await detectViolentThreats(messageContent, currentUserId, selectedMatch.id);
      
      if (threatCheck.isThreat) {
        console.log('🚨 Message blocked due to explicit violent content');
        
        // Update user strikes display
        const userStrikeInfo = await getUserStrikes(currentUserId);
        setUserStrikes(userStrikeInfo.strikes);
        
        if (threatCheck.isBanned) {
          setUserBanned(true);
          Alert.alert(
            'Account Banned',
            'Your account has been banned for using explicit violent language. You have reached 3 strikes.',
            [{ text: 'OK', onPress: () => router.replace('/auth') }]
          );
          return;
        } else {
          const keywordList = threatCheck.detectedKeywords?.join(', ') || 'explicit violent language';
          Alert.alert(
            'Explicit Violent Language Detected',
            `Your message was blocked for containing: "${keywordList}". You now have ${userStrikeInfo.strikes}/3 strikes. ${threatCheck.strikesRemaining} strikes remaining before ban.`,
            [{ text: 'OK' }]
          );
          setNewMessage('');
          setModeratingMessage(false);
          return;
        }
      }
      
      // If no threats detected, proceed with sending
      setSending(true);
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
      
      // Check if the error is due to user being banned
      if (error.message?.includes('banned') || error.message?.includes('strikes')) {
        const isBanned = await isUserBanned(currentUserId);
        if (isBanned) {
          setUserBanned(true);
          Alert.alert(
            'Account Banned',
            'Your account has been banned for using explicit violent language.',
            [{ text: 'OK', onPress: () => router.replace('/auth') }]
          );
          return;
        }
      }
      
      Alert.alert('Error', 'Failed to send message. Please try again.');
      // Remove the temporary message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
      // Restore the message input
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      setModeratingMessage(false);
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

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedMatch && currentUserId) {
      updateSuggestionCategories();
    }
  }, [messages, selectedMatch, currentUserId]);

  useEffect(() => {
    if (selectedMatch && messages.length === 0 && showSuggestions) {
      // Auto-generate opener suggestions for new conversations when suggestions are shown
      generateSuggestions('opener');
    }
  }, [selectedMatch, messages.length, showSuggestions]);

  // Check user ban status and load strikes
  useEffect(() => {
    const checkUserBanStatus = async () => {
      if (currentUserId) {
        try {
          console.log(`🔍 Checking ban status for user: ${currentUserId}`);
          const isBanned = await isUserBanned(currentUserId);
          
          if (isBanned) {
            console.log(`🚫 User ${currentUserId} is banned, logging out`);
            setUserBanned(true);
            Alert.alert(
              'Account Banned',
              'Your account has been banned for using explicit violent language.',
              [{ text: 'OK', onPress: () => router.replace('/auth') }]
            );
            return;
          } else {
            console.log(`✅ User ${currentUserId} is not banned`);
          }
          
          // Load current strike count
          const strikeInfo = await getUserStrikes(currentUserId);
          setUserStrikes(strikeInfo.strikes);
          console.log(`📊 User ${currentUserId} has ${strikeInfo.strikes} strikes`);
          
        } catch (error) {
          console.error('❌ Error checking user ban status:', error);
          // Don't log out user on error, just log the issue
        }
      }
    };
    
    checkUserBanStatus();
  }, [currentUserId]);

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

  const renderMatch = ({ item }) => {
    // Find if there's a chat room for this match
    const chatRoom = chatRooms.find(room => room.otherUser.id === item.id);
    const hasUnreadMessages = chatRoom?.lastMessage && !chatRoom.lastMessage.isFromMe && !chatRoom.lastMessage.isRead;

    return (
      <View style={styles.matchCard}>
        <View style={styles.matchContent}>
          {item.photo ? (
            <Image 
              source={{ uri: item.photo }} 
              style={styles.matchPhoto}
              resizeMode="cover"
              onError={() => {
                console.log('Failed to load image for match:', item.id);
                // Could add state to track failed images and show placeholder
              }}
            />
          ) : (
            <View style={styles.matchPhotoPlaceholder}>
              <Ionicons name="person" size={30} color="#ccc" />
            </View>
          )}
          <View style={styles.matchInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.matchName}>{item.name}, {item.age}</Text>
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
              onPress={() => openChat(item)}
            >
              <Ionicons 
                name={hasUnreadMessages ? "chatbubble" : "chatbubble-outline"} 
                size={20} 
                color={hasUnreadMessages ? "white" : "hotpink"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.unmatchButton, processingUnmatch === item.id && styles.processingButton]}
              onPress={() => confirmUnmatch(item.id, item.name)}
              disabled={processingUnmatch === item.id}
            >
              {processingUnmatch === item.id ? (
                <Ionicons name="ellipsis-horizontal" size={20} color="white" />
              ) : (
                <Ionicons name="close" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const generateSuggestions = async (category = 'general') => {
    if (!selectedMatch || !currentUserId || generatingSuggestions) return;

    try {
      setGeneratingSuggestions(true);
      setSelectedCategory(category);
      
      // Get recent messages for context
      const recentMessages = messages.slice(-10);
      
      const newSuggestions = await generateChatSuggestions(
        currentUserId,
        selectedMatch.id,
        recentMessages,
        category
      );
      
      setSuggestions(newSuggestions);
      
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setNewMessage(suggestion);
    setShowSuggestions(false);
  };

  const toggleSuggestions = async () => {
    if (showSuggestions) {
      // Hide suggestions
      setShowSuggestions(false);
    } else {
      // Show suggestions and generate them
      setShowSuggestions(true);
      if (suggestions.length === 0) {
        // Generate suggestions if none exist
        await generateSuggestions(selectedCategory);
      }
    }
  };

  const updateSuggestionCategories = async () => {
    if (!selectedMatch || !currentUserId) return;
    
    try {
      // Get current user's profile to check for shared interests
      const { data: currentUserProfile } = await supabase
        .from('users')
        .select('interests')
        .eq('id', currentUserId)
        .single();
      
      const messageCount = messages.length;
      const currentUserInterests = currentUserProfile?.interests || [];
      const matchInterests = selectedMatch.interests || [];
      
      const hasSharedInterests = currentUserInterests.some(interest => 
        matchInterests.includes(interest)
      );
      
      const categories = getSuggestionCategories(messageCount, hasSharedInterests);
      setSuggestionCategories(categories);
    } catch (error) {
      console.error('❌ Error updating suggestion categories:', error);
      // Fallback to basic categories
      const categories = getSuggestionCategories(messages.length, false);
      setSuggestionCategories(categories);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/animations/heart.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
          speed={1}
        />
      </View>
    );
  }

  // Show chat interface if a match is selected
  if (selectedMatch) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={closeChat} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.chatHeaderInfo}>
            {selectedMatch.photo ? (
              <Image 
                source={{ uri: selectedMatch.photo }} 
                style={styles.chatHeaderPhoto}
                resizeMode="cover"
                onError={() => console.log('Failed to load image for chat header:', selectedMatch.id)}
              />
            ) : (
              <View style={styles.chatHeaderPhotoPlaceholder}>
                <Ionicons name="person" size={20} color="#ccc" />
              </View>
            )}
            <Text style={styles.chatHeaderName}>{selectedMatch.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={toggleSuggestions}
          >
            <Ionicons 
              name={showSuggestions ? "bulb" : "bulb-outline"} 
              size={24} 
              color={showSuggestions ? "hotpink" : "#333"} 
            />
          </TouchableOpacity>
        </View>
        {/* Messages */}
        {chatLoading ? (
          <View style={styles.chatLoadingContainer}>
            <ActivityIndicator size="large" color="hotpink" />
            <Text style={styles.chatLoadingText}>Loading chat...</Text>
          </View>
        ) : (
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
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={moderatingMessage ? "Checking message..." : "Type a message..."}
            multiline
            maxLength={1000}
            editable={!sending && !moderatingMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending || moderatingMessage) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending || moderatingMessage}
          >
            {sending || moderatingMessage ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        {/* Strike Indicator */}
        {userStrikes > 0 && (
          <View style={styles.strikeIndicator}>
            <Ionicons name="warning" size={16} color="#FF6B35" />
            <Text style={styles.strikeText}>
              {userStrikes}/3 strikes - {3 - userStrikes} remaining before ban
            </Text>
          </View>
        )}

        {/* Chat Suggestions */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer}>
            {/* Suggestion Categories */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScrollView}
              contentContainerStyle={styles.categoryContainer}
            >
              {suggestionCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => generateSuggestions(category)}
                  disabled={generatingSuggestions}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Suggestions */}
            {generatingSuggestions ? (
              <View style={styles.suggestionsLoading}>
                <ActivityIndicator size="small" color="hotpink" />
                <Text style={styles.suggestionsLoadingText}>Generating suggestions...</Text>
              </View>
            ) : (
              <View style={styles.suggestionsList}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionButton}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // Show matches list
  return (
    <View style={styles.container}>
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
  unreadMessage: {
    color: '#333',
    fontWeight: '600',
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
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  chatHeaderPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  moreButton: {
    padding: 5,
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 15,
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
  suggestionsContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 10,
  },
  categoryScrollView: {
    maxHeight: 50,
  },
  categoryContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
  },
  categoryButtonActive: {
    borderColor: 'hotpink',
    backgroundColor: '#ffe6f0',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: 'hotpink',
  },
  suggestionsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  suggestionsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  suggestionsList: {
    paddingHorizontal: 15,
    paddingTop: 10,
    gap: 8,
  },
  suggestionButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  closeSuggestionsButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  strikeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  strikeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  safetyNoticeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
  chatHeaderPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
