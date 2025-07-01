import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatHeader({ 
  match, 
  showSuggestions, 
  onBack, 
  onToggleSuggestions 
}) {
  return (
    <View style={styles.chatHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <View style={styles.chatHeaderInfo}>
        {match.photo ? (
          <Image 
            source={{ uri: match.photo }} 
            style={styles.chatHeaderPhoto}
            resizeMode="cover"
            onError={() => console.log('Failed to load image for chat header:', match.id)}
          />
        ) : (
          <View style={styles.chatHeaderPhotoPlaceholder}>
            <Ionicons name="person" size={20} color="#ccc" />
          </View>
        )}
        <Text style={styles.chatHeaderName}>{match.name}</Text>
      </View>
      <TouchableOpacity 
        style={styles.moreButton}
        onPress={onToggleSuggestions}
      >
        <Ionicons 
          name={showSuggestions ? "bulb" : "bulb-outline"} 
          size={24} 
          color={showSuggestions ? "hotpink" : "#333"} 
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  chatHeaderPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  moreButton: {
    padding: 5,
  },
}); 