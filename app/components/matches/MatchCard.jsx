import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQuizScoreForUser } from '../../../lib/supabase';

export default function MatchCard({ 
  match, 
  chatRoom, 
  onOpenChat, 
  onUnmatch, 
  processingUnmatch 
}) {
  const [quizScore, setQuizScore] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const hasUnreadMessages = chatRoom?.lastMessage && !chatRoom.lastMessage.isFromMe && !chatRoom.lastMessage.isRead;

  // Load quiz score on component mount
  useEffect(() => {
    loadQuizScore();
  }, [match.id]);

  const loadQuizScore = async () => {
    try {
      const score = await getQuizScoreForUser(match.id);
      setQuizScore(score);
    } catch (error) {
      console.error('Error loading quiz score:', error);
    }
  };

  const handleQuizCompleted = (score) => {
    setQuizScore(score);
  };

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchContent}>
        {match.photo ? (
          <Image 
            source={{ uri: match.photo }} 
            style={styles.matchPhoto}
            resizeMode="cover"
            onError={() => {
              // Failed to load image for match
            }}
          />
        ) : (
          <View style={styles.matchPhotoPlaceholder}>
            <Ionicons name="person" size={30} color="#ccc" />
          </View>
        )}
                  <View style={styles.matchInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.matchName}>{match.name}, {match.age}</Text>
              {hasUnreadMessages && <View style={styles.unreadBadge} />}
            </View>
            {match.distance !== null && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.distanceText}>{match.distance} miles away</Text>
              </View>
            )}
          </View>
      </View>
      <View style={styles.matchActions}>
        <Text style={styles.timestamp}>
          {chatRoom?.lastMessage ? 
            new Date(chatRoom.lastMessage.createdAt).toLocaleString([], { 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit', 
              minute: '2-digit' 
            }) : 
            'Just matched!'
          }
        </Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.messageButton]}
            onPress={() => onOpenChat(match)}
          >
            <Ionicons 
              name={hasUnreadMessages ? "chatbubble" : "chatbubble-outline"} 
              size={20} 
              color='white'
            />
          </TouchableOpacity>
          
          {/* Quiz Button */}
          <TouchableOpacity 
            style={[styles.quizButton, quizScore !== null && styles.quizCompletedButton]}
            onPress={() => setShowQuiz(true)}
          >
            <Ionicons 
              name="trophy"
              size={20} 
              color='white'
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.unmatchButton, processingUnmatch === match.id && styles.processingButton]}
            onPress={() => onUnmatch(match.id, match.name)}
            disabled={processingUnmatch === match.id}
          >
            <Ionicons name="close" size={20} color="white"/>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quiz Score Display */}
      {quizScore !== null && (
        <View style={styles.quizScoreContainer}>
          <Text style={styles.quizScoreText}>
            Quiz Score: {quizScore}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  matchPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'hotpink',
    marginLeft: 8,
  },
  matchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    backgroundColor: 'hotpink',
    borderRadius: 20,
  },
  unreadButton: {
    backgroundColor: 'hotpink',
  },
  quizButton: {
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  quizCompletedButton: {
    backgroundColor: '#FFD700',
  },
  unmatchButton: {
    padding: 8,
    backgroundColor: 'red',
    borderRadius: 20,
  },
  processingButton: {
    backgroundColor: '#ccc',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  quizScoreContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quizScoreText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
  },
}); 