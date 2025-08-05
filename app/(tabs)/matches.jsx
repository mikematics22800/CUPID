import { View, StyleSheet, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { 
  getMatches, 
  unmatchUsers,
  supabase, 
  sendMessage,
  getMessages,
  deleteMessage,
  subscribeToMessages,
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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const matchesData = await getMatches();
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
      
      // Find the match data to get the matchId
      const matchData = matches.find(match => match.id === userId);
      if (!matchData) {
        Alert.alert('Error', 'This match no longer exists.');
        return;
      }
      
      // Validate that we have a valid matchId
      if (!matchData.matchId) {
        Alert.alert('Error', 'Invalid match data. Please try again.');
        return;
      }
      
      console.log(`🔍 Found match data:`, matchData);
      console.log(`🔍 Using matchId: ${matchData.matchId}`);
      console.log(`🔍 matchId type: ${typeof matchData.matchId}`);
      console.log(`🔍 matchId length: ${matchData.matchId?.length}`);
      
      // Use the specific match ID to delete the match and clear messages
      await unmatchUsers(matchData.matchId);
      
      // Update matches list
      setMatches(prevMatches => prevMatches.filter(match => match.id !== userId));
      
      // Update filtered matches list to immediately hide the unmatched user
      setFilteredMatches(prevFiltered => prevFiltered.filter(match => match.id !== userId));
      
      // If the unmatched user is currently selected in chat, close the chat
      if (selectedMatch && selectedMatch.id === userId) {
        closeChat();
      }
      
      Alert.alert('Unmatched', `You have unmatched with ${userName}.`);
      
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


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !roomId || sending || moderatingMessage) return;

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

      // Send message to server
      await sendMessage(roomId, messageContent);

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

  // Function to mark matches as viewed
  const markMatchesAsViewed = async () => {
    try {
      if (!currentUserId) return;
      
      // Store the current timestamp as the last viewed time for matches
      await AsyncStorage.setItem(`matches_viewed_${currentUserId}`, new Date().toISOString());
      console.log('✅ Matches marked as viewed');
    } catch (error) {
      console.error('❌ Error marking matches as viewed:', error);
    }
  };

  // Function to refresh messages
  const refreshMessages = async () => {
    if (!selectedMatch || !roomId) return;
    
    try {
      setChatLoading(true);
      const refreshedMessages = await getMessages(roomId);
      setMessages(refreshedMessages);
      console.log('✅ Messages refreshed');
    } catch (error) {
      console.error('❌ Error refreshing messages:', error);
    } finally {
      setChatLoading(false);
    }
  };

  // Function to open chat with a match
  const openChat = async (match) => {
    try {
      setSelectedMatch(match);
      setRoomId(match.matchId); // Use matchId from the match object
      setChatLoading(true);
      
      // Load messages for this match
      const matchMessages = await getMessages(match.matchId);
      setMessages(matchMessages);
      
      // Set up real-time subscription for this match
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
      
      const subscription = await subscribeToMessages(match.matchId, (newMessage, eventType) => {
        if (eventType === 'insert') {
          // Get sender name for the new message
          const getSenderName = async () => {
            try {
              const { data: userProfile, error } = await supabase
                .from('profile')
                .select('name')
                .eq('id', newMessage.sender_id)
                .single();
              
              if (!error && userProfile) {
                const messageWithSender = {
                  ...newMessage,
                  sender_name: userProfile.name
                };
                setMessages(prev => [...prev, messageWithSender]);
              }
            } catch (error) {
              console.error('❌ Error getting sender name:', error);
            }
          };
          getSenderName();
        }
      });
      
      setMessageSubscription(subscription);
      setChatLoading(false);
      
    } catch (error) {
      console.error('❌ Error opening chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
      setChatLoading(false);
    }
  };

  // Function to close chat
  const closeChat = () => {
    // Unsubscribe from real-time updates
    if (messageSubscription) {
      messageSubscription.unsubscribe();
      setMessageSubscription(null);
    }
    
    // Clear chat state
    setSelectedMatch(null);
    setMessages([]);
    setNewMessage('');
    setRoomId(null);
    setChatLoading(false);
  };

  // Function to set up matches subscription
  const setupMatchesSubscription = () => {
    // For now, we'll implement a simple polling mechanism
    // In the future, this could be replaced with real-time subscriptions
    console.log('🔔 Setting up matches subscription');
    
    // Clean up existing subscription
    if (matchesSubscription) {
      matchesSubscription.unsubscribe();
    }
    
    // For now, we'll just log that subscription is set up
    // Real-time match updates can be implemented later if needed
    setMatchesSubscription({ unsubscribe: () => {} });
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
