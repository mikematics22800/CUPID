import { View, StyleSheet, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { 
  getMatchesForUser, 
  unmatchUsersByMatchId,
  clearMessagesBetweenUsers,
  supabase, 
  getOrCreateChatRoom,
  sendMessage,
  getMessages,
  markMessagesAsRead,
  markMatchesAsViewed,
  deleteMessage,
  subscribeToMessages,
  subscribeToChatRooms,
  unsubscribeFromChannel
} from '../../lib/supabase';
import { detectViolentThreats, isUserBanned, getUserStrikes } from '../components/matches/contentModeration';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { 
  MatchesList, 
  ChatInterface, 
  LoadingScreen,
  MatchFilters
} from '../components/matches';

export default function MatchesScreen() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUnmatch, setProcessingUnmatch] = useState(null);
  
  // Chat state
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Content moderation state
  const [moderatingMessage, setModeratingMessage] = useState(false);
  const [userStrikes, setUserStrikes] = useState(0);
  const [userBanned, setUserBanned] = useState(false);

  // Real-time subscription state
  const [messageSubscription, setMessageSubscription] = useState(null);
  const [matchesSubscription, setMatchesSubscription] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    dateFilter: 'all',
    quizScoreFilter: 'all',
    distanceFilter: 'all'
  });
  const [filteredMatches, setFilteredMatches] = useState([]);

  const flatListRef = useRef(null);

  // Get current user on component mount
  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadMatches();
      setupMatchesSubscription();
    }
  }, [currentUserId]);

  // Apply filters when matches or filters change
  useEffect(() => {
    if (matches.length > 0) {
      applyFilters(matches, filters);
    }
  }, [matches, filters]);

  const setupMatchesSubscription = async () => {
    try {
      // Clean up any existing subscription
      if (matchesSubscription) {
        unsubscribeFromChannel(matchesSubscription);
        setMatchesSubscription(null);
      }

      // Set up new subscription for matches
      const subscription = subscribeToChatRooms((newMatch, eventType) => {
        console.log('🔔 Real-time match update:', newMatch, 'Event type:', eventType);
        
        if (eventType === 'insert') {
          // New match created - refresh the matches list
          loadMatches();
        } else if (eventType === 'update') {
          // Match updated - refresh the matches list
          loadMatches();
        }
      });
      
      setMatchesSubscription(subscription);
      console.log('✅ Real-time matches subscription established');
      
    } catch (error) {
      console.error('❌ Error setting up matches subscription:', error);
      // Retry after a delay
      setTimeout(() => {
        if (currentUserId) {
          console.log('🔄 Retrying matches subscription...');
          setupMatchesSubscription();
        }
      }, 5000);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      const markAsViewed = async () => {
        try {
          await markMatchesAsViewed();
        } catch (error) {
          console.error('❌ Error marking matches as viewed:', error);
        }
      };
      
      markAsViewed();
      
      // Refresh messages if chat is open when user returns to screen
      if (selectedMatch && roomId) {
        refreshMessages();
      }
    }, [selectedMatch, roomId])
  );

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
      applyFilters(matchesData, filters);
    } catch (error) {
      console.error('❌ Error loading matches:', error);
      Alert.alert('Error', 'Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (matchesData, currentFilters) => {
    let filtered = [...matchesData];

    // Apply date filter
    if (currentFilters.dateFilter && currentFilters.dateFilter !== 'all') {
      const now = new Date();
      let cutoffDate;

      switch (currentFilters.dateFilter) {
        case '7days':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3months':
          cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '6months':
          cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        case '1year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = null;
      }

      if (cutoffDate) {
        filtered = filtered.filter(match => {
          const matchDate = new Date(match.matchedAt);
          return matchDate >= cutoffDate;
        });
      }
    }

    // Apply quiz score filter
    if (currentFilters.quizScoreFilter && currentFilters.quizScoreFilter !== 'all') {
      filtered = filtered.filter(match => {
        const score = match.userScore;
        if (score === null || score === undefined) return false;

        switch (currentFilters.quizScoreFilter) {
          case '90+':
            return score >= 90;
          case '80+':
            return score >= 80;
          case '70+':
            return score >= 70;
          case '60+':
            return score >= 60;
          case '50+':
            return score >= 50;
          case 'below50':
            return score < 50;
          default:
            return true;
        }
      });
    }

    // Apply distance filter
    if (currentFilters.distanceFilter && currentFilters.distanceFilter !== 'all') {
      filtered = filtered.filter(match => {
        const distance = match.distance;
        if (distance === null || distance === undefined) return false;

        const maxDistance = parseInt(currentFilters.distanceFilter);
        
        switch (currentFilters.distanceFilter) {
          case '5':
            return distance <= 5;
          case '10':
            return distance <= 10;
          case '25':
            return distance <= 25;
          case '50':
            return distance <= 50;
          case '100':
            return distance <= 100;
          case '100+':
            return distance > 100;
          default:
            return true;
        }
      });
    }

    setFilteredMatches(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    applyFilters(matches, newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      dateFilter: 'all',
      quizScoreFilter: 'all',
      distanceFilter: 'all'
    };
    setFilters(clearedFilters);
    setFilteredMatches(matches);
  };



  const handleUnmatch = async (userId, userName) => {
    try {
      setProcessingUnmatch(userId);
      
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Find the match data to get the matchId (more efficient than searching by user IDs)
      const matchData = matches.find(match => match.id === userId);
      if (!matchData) {
        Alert.alert('Error', 'This match no longer exists.');
        return;
      }
      
      // Use the specific match ID to delete the match and clear messages
      await unmatchUsersByMatchId(matchData.matchId);
      
      // Update matches list
      setMatches(prevMatches => prevMatches.filter(match => match.id !== userId));
      
      // If the unmatched user is currently selected in chat, close the chat
      if (selectedMatch && selectedMatch.id === userId) {
        closeChat();
      }
      
      Alert.alert('Unmatched', `You have unmatched with ${userName}. All messages have been cleared.`);
      
    } catch (error) {
      console.error('❌ Error unmatching:', error);
      Alert.alert('Error', 'Failed to unmatch. Please try again.');
    } finally {
      setProcessingUnmatch(null);
    }
  };

  const confirmUnmatch = (userId, userName) => {
    // Check if user is currently chatting with this person
    const isCurrentlyChatting = selectedMatch && selectedMatch.id === userId;
    
    const message = isCurrentlyChatting 
      ? `You are currently chatting with ${userName}. Unmatching will close this conversation and remove all messages. Are you sure you want to unmatch? This action cannot be undone.`
      : `Are you sure you want to unmatch with ${userName}? This action cannot be undone.`;

    Alert.alert(
      'Unmatch',
      message,
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
      
      const chatRoomId = await getOrCreateChatRoom(currentUserId, match.id);
      setRoomId(chatRoomId);

      const messagesData = await getMessages(chatRoomId);
      console.log('📥 Loaded messages:', messagesData.length);
      setMessages(messagesData);

      await markMessagesAsRead(chatRoomId);

      // Set up real-time subscription for new messages
      await setupMessageSubscription(chatRoomId);

    } catch (error) {
      console.error('❌ Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const setupMessageSubscription = async (roomId) => {
    try {
      // Clean up any existing subscription
      if (messageSubscription) {
        unsubscribeFromChannel(messageSubscription);
        setMessageSubscription(null);
      }

      // Set up new subscription
      const subscription = await subscribeToMessages(roomId, (newMessage, eventType = 'insert') => {
        console.log('🔔 Real-time message received:', newMessage, 'Event type:', eventType);
        
        if (eventType === 'insert') {
          // Add new message to the list
          const formattedMessage = {
            id: newMessage.id,
            content: newMessage.content,
            is_read: newMessage.read,
            created_at: newMessage.created_at,
            sender_id: newMessage.sender_id,
            sender_name: newMessage.sender_id === currentUserId ? 'You' : selectedMatch?.name || 'Unknown User'
          };
          
          setMessages(prev => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(msg => msg.id === formattedMessage.id);
            if (exists) return prev;
            
            return [...prev, formattedMessage];
          });
          
          // Mark messages as read if the new message is from the other user
          if (newMessage.sender_id !== currentUserId) {
            markMessagesAsRead(roomId);
          }
        } else if (eventType === 'update') {
          // Update existing message (e.g., when marked as read)
          setMessages(prev => 
            prev.map(msg => 
              msg.id === newMessage.id 
                ? {
                    ...msg,
                    is_read: newMessage.read,
                    content: newMessage.content
                  }
                : msg
            )
          );
        } else if (eventType === 'delete') {
          // Remove deleted message from the list
          setMessages(prev => prev.filter(msg => msg.id !== newMessage.id));
        }
      });
      
      setMessageSubscription(subscription);
      console.log('✅ Real-time subscription established for room:', roomId);
      
    } catch (error) {
      console.error('❌ Error setting up message subscription:', error);
      // Retry after a delay
      setTimeout(() => {
        if (selectedMatch && roomId) {
          console.log('🔄 Retrying message subscription...');
          setupMessageSubscription(roomId);
        }
      }, 5000);
    }
  };

  const closeChat = () => {
    // Clean up subscription
    if (messageSubscription) {
      unsubscribeFromChannel(messageSubscription);
      setMessageSubscription(null);
    }
    
    setSelectedMatch(null);
    setMessages([]);
    setNewMessage('');
    setRoomId(null);
  };

  const refreshMessages = async () => {
    if (!roomId) return;
    
    try {
      const messagesData = await getMessages(roomId);
      setMessages(messagesData);
      await markMessagesAsRead(roomId);
    } catch (error) {
      console.error('❌ Error refreshing messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !roomId || sending || moderatingMessage) return;

    // Create a temporary message ID that we can track
    const tempMessageId = `temp-${Date.now()}`;
    const messageContent = newMessage.trim();

    try {
      setModeratingMessage(true);
      
      // Check for violent threats BEFORE sending
      const threatCheck = await detectViolentThreats(messageContent, currentUserId, selectedMatch.id);
      
      if (threatCheck.isThreat) {
        // Message blocked due to explicit violent content
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
      
      // Optimistically add message to UI
      const tempMessage = {
        id: tempMessageId,
        content: messageContent,
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        is_read: false,
        sender_name: 'You',
        isTemp: true,
      };
      
      setMessages(prev => [...prev, tempMessage]);

      // Send message to server
      const sentMessage = await sendMessage(roomId, messageContent);
      
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

      // Real-time updates will handle new messages automatically
      // No need for manual refresh

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
    try {
      console.log('🗑️ Attempting to delete message with ID:', messageId);
      
      // Show confirmation dialog
      Alert.alert(
        'Delete Message',
        'Are you sure you want to delete this message? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🗑️ User confirmed deletion, calling deleteMessage...');
                
                // Call the deleteMessage function from supabase
                const result = await deleteMessage(messageId);
                console.log('🗑️ deleteMessage result:', result);
                
                // Remove the message from the local state
                setMessages(prev => {
                  const filtered = prev.filter(msg => msg.id !== messageId);
                  console.log('🗑️ Messages after filtering:', filtered.length, 'remaining');
                  return filtered;
                });
                
                console.log('✅ Message deleted successfully');
              } catch (error) {
                console.error('❌ Error deleting message:', error);
                Alert.alert(
                  'Error',
                  error.message || 'Failed to delete message. Please try again.'
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error in handleDeleteMessage:', error);
      Alert.alert('Error', 'Failed to delete message. Please try again.');
    }
  };



  // Auto-refresh messages every 60 seconds when chat is open (backup for missed real-time updates)
  useEffect(() => {
    if (!selectedMatch || !roomId) return;

    const interval = setInterval(() => {
      refreshMessages();
    }, 60000); // 60 seconds (increased from 30 since we have real-time updates)

    return () => clearInterval(interval);
  }, [selectedMatch, roomId]);

  // Check user ban status and load strikes
  useEffect(() => {
    const checkUserBanStatus = async () => {
      if (currentUserId) {
        try {
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
          
          const strikeInfo = await getUserStrikes(currentUserId);
          setUserStrikes(strikeInfo.strikes);
          
        } catch (error) {
          console.error('❌ Error checking user ban status:', error);
        }
      }
    };
    
    checkUserBanStatus();
  }, [currentUserId]);

  // Cleanup subscription on component unmount
  useEffect(() => {
    return () => {
      if (messageSubscription) {
        unsubscribeFromChannel(messageSubscription);
      }
      if (matchesSubscription) {
        unsubscribeFromChannel(matchesSubscription);
      }
    };
  }, [messageSubscription, matchesSubscription]);






  if (loading) {
    return <LoadingScreen />;
  }

  // Show chat interface if a match is selected
  if (selectedMatch) {
    return (
      <ChatInterface
        selectedMatch={selectedMatch}
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        sending={sending}
        moderatingMessage={moderatingMessage}
        chatLoading={chatLoading}
        userStrikes={userStrikes}
        currentUserId={currentUserId}
        flatListRef={flatListRef}
        onCloseChat={closeChat}
        onSendMessage={handleSendMessage}
        onDeleteMessage={handleDeleteMessage}
        onRefreshMessages={refreshMessages}
      />
    );
  }

  // Show matches list
  return (
    <View style={styles.container}>
      <MatchFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
      />
      <MatchesList
        matches={filteredMatches}
        processingUnmatch={processingUnmatch}
        onOpenChat={openChat}
        onUnmatch={confirmUnmatch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hotpink',
  },
});
