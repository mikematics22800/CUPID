import React from 'react';
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