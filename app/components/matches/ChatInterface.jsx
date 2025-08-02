import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Text
} from 'react-native';
import LottieView from 'lottie-react-native';
import ChatHeader from './ChatHeader';
import MessagesList from './MessagesList';
import MessageInput from './MessageInput';
import ConversationTipsModal from './ConversationTipsModal';
import { generateConversationTips } from '../../../lib/gemini';
import { useProfile } from '../../contexts/ProfileContext';

export default function ChatInterface({
  selectedMatch,
  messages,
  newMessage,
  setNewMessage,
  sending,
  moderatingMessage,
  chatLoading,
  userStrikes,
  currentUserId,
  flatListRef,
  onCloseChat,
  onSendMessage,
  onDeleteMessage,
  onRefreshMessages,
  messageSubscription
}) {
  const { profile: currentUserProfile } = useProfile();
  const [tipsModalVisible, setTipsModalVisible] = useState(false);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tips, setTips] = useState('');
  const [tipsError, setTipsError] = useState('');

  const handleShowTips = async () => {
    if (!currentUserProfile || !selectedMatch) {
      setTipsError('Unable to generate tips. Please try again.');
      setTipsModalVisible(true);
      return;
    }

    setTipsModalVisible(true);
    setTipsLoading(true);
    setTipsError('');

    try {
      // Prepare conversation data for Gemini
      const conversationData = {
        messages: messages.filter(msg => msg.content && msg.content.trim()),
        currentUserProfile: {
          id: currentUserId,
          name: currentUserProfile.name || 'You',
          age: currentUserProfile.birthday ? calculateAge(currentUserProfile.birthday) : null,
          residence: currentUserProfile.residence || '',
          interests: currentUserProfile.interests || [],
          bio: currentUserProfile.bio || ''
        },
        matchProfile: {
          id: selectedMatch.id,
          name: selectedMatch.name || 'Your match',
          age: selectedMatch.age || null,
          residence: selectedMatch.residence || '',
          interests: selectedMatch.interests || [],
          bio: selectedMatch.bio || ''
        },
        conversationContext: `This is a conversation between ${currentUserProfile.name || 'You'} and ${selectedMatch.name || 'your match'}. The conversation has ${messages.length} messages.`
      };

      const generatedTips = await generateConversationTips(conversationData);
      setTips(generatedTips);
    } catch (error) {
      console.error('❌ Error generating tips:', error);
      setTipsError(error.message || 'Failed to generate tips. Please try again.');
    } finally {
      setTipsLoading(false);
    }
  };

  const calculateAge = (birthday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  if (chatLoading) {
    return (
      <View style={styles.chatLoadingContainer}>
        <LottieView
          source={require('../../../assets/animations/heart.json')}
          autoPlay
          loop
          style={styles.chatLoadingAnimation}
          speed={1}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ChatHeader
        match={selectedMatch}
        onBack={onCloseChat}
        onRefreshMessages={onRefreshMessages}
        onShowTips={handleShowTips}
      />

      <MessagesList
        messages={messages}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        flatListRef={flatListRef}
        shouldScrollToBottom={true}
        onRefreshMessages={onRefreshMessages}
      />
      
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        sending={sending}
        moderatingMessage={moderatingMessage}
      />

      <ConversationTipsModal
        visible={tipsModalVisible}
        onClose={() => setTipsModalVisible(false)}
        tips={tips}
        loading={tipsLoading}
        error={tipsError}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hotpink',
  },
  chatLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatLoadingAnimation: {
    width: 200,
    height: 200,
  },
}); 