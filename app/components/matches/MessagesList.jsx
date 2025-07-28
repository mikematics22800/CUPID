import React, { useRef, useEffect, useState } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import MessageBubble from './MessageBubble';

export default function MessagesList({ 
  messages, 
  currentUserId, 
  onDeleteMessage,
  flatListRef,
  shouldScrollToBottom = false,
  onRefreshMessages
}) {
  const [refreshing, setRefreshing] = useState(false);
  const internalFlatListRef = useRef(null);
  const finalFlatListRef = flatListRef || internalFlatListRef;

  const scrollToBottom = () => {
    if (finalFlatListRef.current) {
      finalFlatListRef.current.scrollToEnd({ animated: false });
    }
  };

  const handleRefresh = async () => {
    if (!onRefreshMessages) return;
    
    setRefreshing(true);
    try {
      await onRefreshMessages();
    } catch (error) {
      console.error('❌ Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Use a small delay to ensure FlatList is rendered
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
  }, [messages]);

  // Scroll to bottom when component mounts (for initial load)
  useEffect(() => {
    // Use a longer delay for initial load to ensure everything is rendered
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 200);
    
    return () => clearTimeout(timer);
  }, []);

  // Scroll to bottom when explicitly requested (e.g., when chat is first opened)
  useEffect(() => {
    if (shouldScrollToBottom && messages.length > 0) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [shouldScrollToBottom, messages]);

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
      onContentSizeChange={scrollToBottom}
      onLayout={scrollToBottom}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['hotpink']}
          tintColor="hotpink"
        />
      }
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