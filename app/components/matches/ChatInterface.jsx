import React, { useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  Animated,
  TouchableOpacity
} from 'react-native';
import LottieView from 'lottie-react-native';
import ChatHeader from './ChatHeader';
import MessagesList from './MessagesList';
import MessageInput from './MessageInput';
import StrikeIndicator from './StrikeIndicator';
import ChatSuggestions from './ChatSuggestions.jsx';

export default function ChatInterface({
  selectedMatch,
  messages,
  newMessage,
  setNewMessage,
  sending,
  moderatingMessage,
  chatLoading,
  showSuggestions,
  suggestions,
  suggestionCategories,
  selectedCategory,
  generatingSuggestions,
  userStrikes,
  currentUserId,
  flatListRef,
  onCloseChat,
  onSendMessage,
  onDeleteMessage,
  onToggleSuggestions,
  onGenerateSuggestions,
  onSuggestionSelect,
  scrollToBottom
}) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    floatingAnimation.start();

    return () => floatingAnimation.stop();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const handleCupidPress = () => {
    // Show suggestions without generating them immediately
    onToggleSuggestions();
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
        showSuggestions={showSuggestions}
        onBack={onCloseChat}
        onToggleSuggestions={onToggleSuggestions}
      />

      <MessagesList
        messages={messages}
        currentUserId={currentUserId}
        onDeleteMessage={onDeleteMessage}
        flatListRef={flatListRef}
        scrollToBottom={scrollToBottom}
      />
      
      <View style={styles.cupidContainer}>
        <TouchableOpacity onPress={handleCupidPress}>
          <Animated.Image 
            source={require('../../../assets/images/cupid.png')} 
            style={[styles.cupid, { transform: [{ translateY }] }]} 
          />
        </TouchableOpacity>
      </View>
      
      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        sending={sending}
        moderatingMessage={moderatingMessage}
      />

      <ChatSuggestions
        showSuggestions={showSuggestions}
        suggestions={suggestions}
        suggestionCategories={suggestionCategories}
        selectedCategory={selectedCategory}
        generatingSuggestions={generatingSuggestions}
        onCategoryPress={onGenerateSuggestions}
        onSuggestionSelect={onSuggestionSelect}
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
  chatLoadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  cupid: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  cupidContainer: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20, 
  },
}); 