import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getQuizWithOptions, submitQuizAnswers, saveQuizScore, supabase } from '../../../lib/supabase';

const { width } = Dimensions.get('window');

export default function QuizTaker({ 
  quizOwnerId, 
  quizOwnerName, 
  isVisible, 
  onClose, 
  onQuizCompleted 
}) {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (isVisible && quizOwnerId) {
      loadQuiz();
    }
  }, [isVisible, quizOwnerId]);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const quizData = await getQuizWithOptions(quizOwnerId);
      if (quizData) {
        setQuiz(quizData);
        setAnswers(new Array(quizData.length).fill(null));
        setCurrentQuestionIndex(0);
        setShowResults(false);
        setResults(null);
      } else {
        Alert.alert('No Quiz', 'This user hasn\'t created a quiz yet.');
        onClose();
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz. Please try again.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (answer) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = async () => {
    if (answers.some(answer => answer === null)) {
      Alert.alert(
        'Incomplete Quiz',
        'Please answer all questions before submitting.',
        [
          { text: 'Continue Quiz', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitQuizAnswers }
        ]
      );
      return;
    }
    await handleSubmitQuiz();
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    try {
      console.log(`🎯 Starting quiz submission for quiz owner: ${quizOwnerId}`);
      
      // Calculate score
      const scoreResult = await submitQuizAnswers(quizOwnerId, answers);
      console.log(`📊 Score calculated: ${scoreResult.score}%`);
      
      // Save score to database
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log(`👤 Current user ID: ${currentUser.id}`);
      console.log(`💾 Saving score: ${scoreResult.score}% for quiz taker ${currentUser.id} on quiz owner ${quizOwnerId}`);
      
      await saveQuizScore(quizOwnerId, currentUser.id, scoreResult.score);
      
      setResults(scoreResult);
      setShowResults(true);
      
      if (onQuizCompleted) {
        onQuizCompleted(scoreResult);
      }
    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / quiz.length) * 100;
  };

  const getScoreMessage = (score) => {
    if (score >= 90) return "Amazing! You really know them well! 💕";
    if (score >= 80) return "Great job! You have a good connection! 😊";
    if (score >= 70) return "Good effort! Keep getting to know each other! 👍";
    if (score >= 60) return "Not bad! There's room to grow! 🌱";
    if (score >= 50) return "You're getting there! Keep trying! 💪";
    return "Keep learning about each other! Every relationship takes time! ❤️";
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#34C759';
    if (score >= 80) return 'hotpink';
    if (score >= 70) return '#FF9500';
    if (score >= 60) return '#FFCC00';
    return '#FF3B30';
  };

  if (loading) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hotpink" />
          <Text style={styles.loadingText}>Loading quiz...</Text>
        </View>
      </Modal>
    );
  }

  if (!quiz) {
    return null;
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showResults ? 'Quiz Results' : `${quizOwnerName}'s Quiz`}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {!showResults ? (
          /* Quiz Interface */
          <View style={styles.quizContainer}>
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${getProgressPercentage()}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentQuestionIndex + 1} of {quiz.length}
              </Text>
            </View>

            {/* Question */}
            <View style={styles.questionContainer}>
              <Text style={styles.questionText}>
                {quiz[currentQuestionIndex].question}
              </Text>
            </View>

            {/* Answer Options */}
            <ScrollView style={styles.optionsContainer}>
              {quiz[currentQuestionIndex].options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    answers[currentQuestionIndex] === option && styles.selectedOption
                  ]}
                  onPress={() => selectAnswer(option)}
                >
                  <Text style={[
                    styles.optionText,
                    answers[currentQuestionIndex] === option && styles.selectedOptionText
                  ]}>
                    {option}
                  </Text>
                  {answers[currentQuestionIndex] === option && (
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Navigation */}
            <View style={styles.navigation}>
              <TouchableOpacity
                style={[styles.navButton, currentQuestionIndex === 0 && styles.disabledButton]}
                onPress={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? "#ccc" : "hotpink"} />
                <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.disabledText]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {currentQuestionIndex === quiz.length - 1 ? (
                <TouchableOpacity
                  style={[styles.navButton, styles.submitButton]}
                  onPress={submitQuiz}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Submit</Text>
                      <Ionicons name="checkmark" size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={nextQuestion}
                >
                  <Text style={styles.navButtonText}>Next</Text>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* Results Interface */
          <View style={styles.resultsContainer}>
            <View style={styles.resultsContent}>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Your Score</Text>
                <Text style={[styles.scoreText, { color: getScoreColor(results.score) }]}>
                  {results.score}%
                </Text>
                <Text style={styles.scoreDetails}>
                  {results.correctAnswers} out of {results.totalQuestions} correct
                </Text>
              </View>

              <View style={styles.messageContainer}>
                <Text style={styles.messageText}>
                  {getScoreMessage(results.score)}
                </Text>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons name="trophy" size={24} color="#FFD700" />
                  <Text style={styles.statText}>Quiz Completed!</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="heart" size={24} color="#FF6B6B" />
                  <Text style={styles.statText}>Keep learning about each other</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.closeResultsButton} onPress={onClose}>
              <Text style={styles.closeResultsButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  quizContainer: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'hotpink',
    borderRadius: 3,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  questionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    lineHeight: 24,
  },
  optionsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedOption: {
    backgroundColor: 'hotpink',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: 'hotpink',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#ccc',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginHorizontal: 8,
  },
  submitButton: {
    backgroundColor: 'hotpink',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
  resultsContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  resultsContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreDetails: {
    fontSize: 14,
    color: '#666',
  },
  messageContainer: {
    marginBottom: 30,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    width: '100%',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  closeResultsButton: {
    backgroundColor: 'hotpink',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  closeResultsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 