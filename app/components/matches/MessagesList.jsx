import React, { useRef, useEffect, useState } from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import MessageBubble from './MessageBubble';

export default function MessagesList({ 
  messages, 
  currentUserId, 
  onDeleteMessage,
  flatListRef,
  shouldScrollToBottom = false,
  onRefreshMessages,
  isDeleteMode = false
}) {
  const [refreshing, setRefreshing] = useState(false);
  const internalFlatListRef = useRef(null);
  const finalFlatListRef = flatListRef || internalFlatListRef;

  // Define item dimensions for getItemLayout optimization
  // Adjust these values based on your MessageBubble heights
  const MIN_MESSAGE_HEIGHT = 60; // Minimum height for short messages
  const MAX_MESSAGE_HEIGHT = 200; // Maximum height for long messages
  const ITEM_SPACING = 0; // Adjust if you have spacing between messages

  const getItemLayout = (data, index) => {
    const message = data[index];
    // Estimate height based on message content length
    // You can refine this logic based on your actual message bubble heights
    const estimatedHeight = message?.content?.length > 100 ? MAX_MESSAGE_HEIGHT : MIN_MESSAGE_HEIGHT;
    
    return {
      length: estimatedHeight + ITEM_SPACING,
      offset: (MIN_MESSAGE_HEIGHT + ITEM_SPACING) * index, // Use minimum for offset calculation
      index,
    };
  };

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
        isDeleteMode={isDeleteMode}
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
      getItemLayout={getItemLayout}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
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
