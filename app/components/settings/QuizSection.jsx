import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createOrUpdateQuiz, getUserQuiz } from '../../../lib/supabase';
import { promptGemini } from '../../../lib/gemini';
import { useProfile } from '../../contexts/ProfileContext';

export default function QuizSection({ onQuizSaved }) {
  const { user, profile, bio, interests, name } = useProfile();
  const [questions, setQuestions] = useState([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');

  // Load existing quiz on component mount
  useEffect(() => {
    loadExistingQuiz();
  }, [user]);

  const loadExistingQuiz = async () => {
    if (!user) return;
    
    try {
      const quiz = await getUserQuiz(user.id);
      if (quiz && quiz.questions) {
        setQuestions(quiz.questions);
      }
    } catch (error) {
      console.error('Error loading existing quiz:', error);
    }
  };

  const generateQuizWithGemini = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      // Create a prompt for Gemini based on user's profile
      const profileInfo = {
        name: name || 'User',
        bio: bio || '',
        interests: interests || [],
        age: profile?.birthday ? 
          Math.floor((new Date() - new Date(profile.birthday)) / (365.25 * 24 * 60 * 60 * 1000)) : null
      };

      const prompt = `Create a fun and engaging "Get to Know Me" quiz with exactly 10 questions for a dating app user. 

User Profile:
- Name: ${profileInfo.name}
- Bio: ${profileInfo.bio}
- Interests: ${profileInfo.interests.join(', ')}
- Age: ${profileInfo.age || 'Not specified'}

Requirements:
1. Create exactly 10 questions that are personal, fun, and reveal interesting things about the user
2. Questions should be based on their interests, bio, and personality
3. Each question should have a specific, personal answer
4. Questions should be engaging and help potential matches learn about the user
5. Mix different types of questions (favorites, experiences, preferences, etc.)

Format the response as a JSON array of arrays, where each inner array contains [question, answer].
Example: [["What's my favorite movie?", "The Matrix"], ["What's my dream vacation?", "Japan"]]

Make sure the questions are personal and specific to this user based on their profile information.`;

      const response = await promptGemini(prompt);
      
      // Parse the response to extract the quiz data
      let quizData;
      try {
        // Try to parse as JSON first
        quizData = JSON.parse(response);
      } catch (parseError) {
        // If JSON parsing fails, try to extract array from the response
        const arrayMatch = response.match(/\[\[.*\]\]/s);
        if (arrayMatch) {
          try {
            quizData = JSON.parse(arrayMatch[0]);
          } catch (secondParseError) {
            throw new Error('Failed to parse quiz data from Gemini response');
          }
        } else {
          throw new Error('No valid quiz data found in Gemini response');
        }
      }

      // Validate the quiz data
      if (!Array.isArray(quizData) || quizData.length !== 10) {
        throw new Error('Generated quiz must have exactly 10 questions');
      }

      // Validate each question has both question and answer
      for (let i = 0; i < quizData.length; i++) {
        if (!Array.isArray(quizData[i]) || quizData[i].length !== 2) {
          throw new Error(`Question ${i + 1} must have both question and answer`);
        }
        if (!quizData[i][0] || !quizData[i][1]) {
          throw new Error(`Question ${i + 1} cannot have empty question or answer`);
        }
      }

      setQuestions(quizData);
      Alert.alert('Success', 'Quiz generated successfully! You can now review and edit the questions.');
    } catch (error) {
      console.error('Error generating quiz:', error);
      Alert.alert('Error', 'Failed to generate quiz. Please try again or create questions manually.');
    } finally {
      setGenerating(false);
    }
  };

  const addQuestion = () => {
    if (questions.length >= 10) {
      Alert.alert('Maximum Questions', 'You can only have 10 questions in your quiz.');
      return;
    }

    if (!currentQuestion.trim() || !currentAnswer.trim()) {
      Alert.alert('Missing Information', 'Please enter both a question and an answer.');
      return;
    }

    setQuestions([...questions, [currentQuestion.trim(), currentAnswer.trim()]]);
    setCurrentQuestion('');
    setCurrentAnswer('');
  };

  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const editQuestion = (index, newQuestion, newAnswer) => {
    const newQuestions = [...questions];
    newQuestions[index] = [newQuestion, newAnswer];
    setQuestions(newQuestions);
  };

  const saveQuiz = async () => {
    if (!user) return;

    if (questions.length === 0) {
      Alert.alert('No Questions', 'Please add at least one question to your quiz.');
      return;
    }

    if (questions.length < 10) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${questions.length}/10 questions. Would you like to add more questions or save as is?`,
        [
          { text: 'Add More', style: 'cancel' },
          { text: 'Save As Is', onPress: () => saveQuizToDatabase() }
        ]
      );
      return;
    }

    await saveQuizToDatabase();
  };

  const saveQuizToDatabase = async () => {
    setSaving(true);
    try {
      await createOrUpdateQuiz(user.id, questions);
      Alert.alert('Success', 'Your quiz has been saved successfully!');
      setShowQuizModal(false);
      if (onQuizSaved) {
        onQuizSaved();
      }
    } catch (error) {
      console.error('Error saving quiz:', error);
      Alert.alert('Error', 'Failed to save quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const clearQuiz = () => {
    Alert.alert(
      'Clear Quiz',
      'Are you sure you want to clear all questions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setQuestions([]) }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Familiarity Quiz</Text>
        <Text style={styles.subtitle}>
          Create a quiz to test how well your matches know you!
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => setShowQuizModal(true)}
      >
        <Ionicons name="create" size={20} color="white" />
        <Text style={styles.actionButtonText}>
          {questions.length > 0 ? 'Edit Quiz' : 'Create Quiz'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.generateButton]}
        onPress={generateQuizWithGemini}
        disabled={generating}
      >
        {generating ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Ionicons name="sparkles" size={20} color="white" />
        )}
        <Text style={styles.actionButtonText}>
          {generating ? 'Generating...' : 'Generate with AI'}
        </Text>
      </TouchableOpacity>
      {questions.length > 0 && (
        <View style={styles.quizPreview}>
          <Text style={styles.previewTitle}>
            Quiz Preview ({questions.length}/10 questions)
          </Text>
          <ScrollView style={styles.previewList}>
            {questions.map((question, index) => (
              <View key={index} style={styles.previewItem}>
                <Text style={styles.previewQuestion}>
                  {index + 1}. {question[0]}
                </Text>
                <Text style={styles.previewAnswer}>
                  Answer: {question[1]}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Quiz Editing Modal */}
      <Modal
        visible={showQuizModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowQuizModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowQuizModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Quiz</Text>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveQuiz}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Add New Question Section */}
            <View style={styles.addQuestionSection}>
              <Text style={styles.sectionTitle}>Add New Question</Text>
              <TextInput
                style={styles.questionInput}
                placeholder="Enter your question..."
                value={currentQuestion}
                onChangeText={setCurrentQuestion}
                multiline
              />
              <TextInput
                style={styles.answerInput}
                placeholder="Enter the answer..."
                value={currentAnswer}
                onChangeText={setCurrentAnswer}
                multiline
              />
              <TouchableOpacity
                style={[styles.addButton, questions.length >= 10 && styles.disabledButton]}
                onPress={addQuestion}
                disabled={questions.length >= 10}
              >
                <Text style={styles.addButtonText}>Add Question</Text>
              </TouchableOpacity>
            </View>

            {/* Existing Questions */}
            <View style={styles.existingQuestionsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Questions ({questions.length}/10)</Text>
                {questions.length > 0 && (
                  <TouchableOpacity onPress={clearQuiz}>
                    <Text style={styles.clearButton}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {questions.map((question, index) => (
                <QuestionItem
                  key={index}
                  index={index}
                  question={question[0]}
                  answer={question[1]}
                  onEdit={editQuestion}
                  onRemove={removeQuestion}
                />
              ))}

              {questions.length === 0 && (
                <Text style={styles.emptyState}>
                  No questions yet. Add your first question above or generate with AI!
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Question Item Component
function QuestionItem({ index, question, answer, onEdit, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question);
  const [editAnswer, setEditAnswer] = useState(answer);

  const handleSave = () => {
    if (editQuestion.trim() && editAnswer.trim()) {
      onEdit(index, editQuestion.trim(), editAnswer.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditQuestion(question);
    setEditAnswer(answer);
    setIsEditing(false);
  };

  return (
    <View style={styles.questionItem}>
      {isEditing ? (
        <View style={styles.editMode}>
          <TextInput
            style={styles.editQuestionInput}
            value={editQuestion}
            onChangeText={setEditQuestion}
            placeholder="Question"
            multiline
          />
          <TextInput
            style={styles.editAnswerInput}
            value={editAnswer}
            onChangeText={setEditAnswer}
            placeholder="Answer"
            multiline
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.saveEditButton} onPress={handleSave}>
              <Text style={styles.saveEditButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelEditButton} onPress={handleCancel}>
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.viewMode}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionNumber}>{index + 1}.</Text>
            <View style={styles.questionActions}>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="create" size={16} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRemove(index)}>
                <Ionicons name="trash" size={16} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.questionText}>{question}</Text>
          <Text style={styles.answerText}>Answer: {answer}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  generateButton: {
    backgroundColor: 'hotpink',
  },
  editButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  quizPreview: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewList: {
    maxHeight: 200,
  },
  previewItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  previewQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  previewAnswer: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  addQuestionSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
    minHeight: 60,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    minHeight: 60,
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  existingQuestionsSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  questionItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  viewMode: {
    gap: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  questionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  answerText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  editMode: {
    gap: 8,
  },
  editQuestionInput: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  editAnswerInput: {
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveEditButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveEditButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cancelEditButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelEditButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 