import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import MessageBubble from './MessageBubble';

export default function MessagesList({ 
  messages, 
  currentUserId, 
  onDeleteMessage,
  flatListRef,
  scrollToBottom
}) {
  const internalFlatListRef = useRef(null);
  const finalFlatListRef = flatListRef || internalFlatListRef;

  const internalScrollToBottom = () => {
    if (finalFlatListRef.current && messages.length > 0) {
      finalFlatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    internalScrollToBottom();
  }, [messages]);

  const renderMessage = ({ item }) => {
    const isMyMessage = item.sender_id === currentUserId;
    
    return (
      <MessageBubble
        message={item}
        isMyMessage={isMyMessage}
        onDeleteMessage={onDeleteMessage}
      />
    );
  };

  return (
    <FlatList
      ref={finalFlatListRef}
      data={messages}
      renderItem={renderMessage}
      keyExtractor={item => item.id}
      style={styles.messagesList}
      contentContainerStyle={styles.messagesContainer}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={scrollToBottom || internalScrollToBottom}
    />
  );
}

const styles = StyleSheet.create({
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 15,
  },
}); 