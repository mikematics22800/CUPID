import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessageInput({ 
  newMessage, 
  setNewMessage, 
  onSendMessage, 
  sending, 
  moderatingMessage 
}) {
  return (
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
        onPress={onSendMessage}
        disabled={!newMessage.trim() || sending || moderatingMessage}
      >
        {sending || moderatingMessage ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="send" size={20} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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