import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserQuiz, getOtherUserQuizScore, supabase } from '../../../lib/supabase';
import QuizTaker from './QuizTaker';
import TimestampDisplay from '../TimestampDisplay';

export default function MatchCard({ 
  match, 
  onOpenChat, 
  onUnmatch, 
  processingUnmatch 
}) {
  const [quizScore, setQuizScore] = useState(null);
  const [otherUserQuizScore, setOtherUserQuizScore] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [currentUserHasQuiz, setCurrentUserHasQuiz] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Load quiz score and check if user has quiz on component mount
  useEffect(() => {
    loadQuizData();
  }, [match.id]);

  const loadQuizData = async () => {
    try {
      // Check if the matched user has a quiz
      const quiz = await getUserQuiz(match.id);
      setHasQuiz(quiz !== null && quiz.length > 0);
      
      // Check if current user has a quiz
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const currentUserQuiz = await getUserQuiz(currentUser.id);
        setCurrentUserHasQuiz(currentUserQuiz !== null && currentUserQuiz.length > 0);
      }
      
      // Get the other user's quiz score on current user's quiz
      const otherUserScore = await getOtherUserQuizScore(match.id);
      setOtherUserQuizScore(otherUserScore);
      
    } catch (error) {
      console.error('Error loading quiz data:', error);
      setHasQuiz(false);
      setCurrentUserHasQuiz(false);
      setOtherUserQuizScore(null);
    }
  };

  const handleQuizCompleted = (scoreResult) => {
    setQuizScore(scoreResult.score);
    setShowQuiz(false);
    // Refresh the quiz data to show updated scores
    loadQuizData();
  };

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchContent}>
        {match.photo ? (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: match.photo }} 
              style={styles.matchPhoto}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                // Failed to load image for match
              }}
            />
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="hotpink" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.matchPhotoPlaceholder}>
            <Ionicons name="person" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.matchInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.matchName}>{match.name}, {match.age}</Text>
          </View>
          {match.distance !== null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.distanceText}>{match.distance} miles away</Text>
            </View>
          )}
          {/* Quiz Score Display - Only show if current user has a quiz and other user has taken it */}
          {currentUserHasQuiz && otherUserQuizScore !== null && (
            <View style={styles.quizScoreContainer}>
              <Ionicons name="trophy" size={14} color="#666" />
              <Text style={styles.quizScoreText}>
                {otherUserQuizScore}%
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.matchActions}>
        <TimestampDisplay 
          timestamp={match.matchedAt}
          format="relative"
          style={styles.timestamp}
          fallbackText="Just matched!"
        />
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.messageButton]}
            onPress={() => onOpenChat(match)}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={20} 
              color='white'
            />
          </TouchableOpacity>
          
          {/* Quiz Button - Only show if user has a quiz */}
          {hasQuiz && (
            <TouchableOpacity 
              style={styles.quizButton}
              onPress={() => setShowQuiz(true)}
            >
              <Ionicons 
                name="trophy"
                size={20} 
                color='white'
              />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.unmatchButton, processingUnmatch === match.id && styles.processingButton]}
            onPress={() => onUnmatch(match.id, match.name)}
            disabled={processingUnmatch === match.id}
          >
            <Ionicons name="close" size={20} color="white"/>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Quiz Taker Modal */}
      <QuizTaker
        quizOwnerId={match.id}
        quizOwnerName={match.name}
        isVisible={showQuiz}
        onClose={() => setShowQuiz(false)}
        onQuizCompleted={handleQuizCompleted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 15,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 200, 200, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
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

  quizButton: {
    padding: 8,
    backgroundColor: '#FFD700',
    borderRadius: 20,
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
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center', 
    gap: 4,
  },
  quizScoreText: {
    fontSize: 12,
    color: '#666',
  },

}); 