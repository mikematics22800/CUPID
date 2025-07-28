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
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createOrUpdateQuiz, getUserQuiz, deleteQuiz } from '../../../lib/supabase';
import { promptGemini } from '../../../lib/gemini';
import { useProfile } from '../../contexts/ProfileContext';

export default function QuizSection({ onQuizSaved }) {
  const { user, profile, bio, interests, name } = useProfile();
  const [questions, setQuestions] = useState([]);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);


  // Load existing quiz on component mount
  useEffect(() => {
    loadExistingQuiz();
  }, [user]);

  // Store original questions to reset on discard
  const [originalQuestions, setOriginalQuestions] = useState([]);

  const loadExistingQuiz = async () => {
    if (!user) return;
    
    try {
      const quiz = await getUserQuiz(user.id);
      if (quiz && quiz.questions) {
        // Handle both old and new quiz formats
        const formattedQuestions = quiz.questions.map(q => {
          if (Array.isArray(q) && q.length >= 3) {
            // New format: [question, answer, fake_answer]
            return q;
          }
          return q;
        });
        setQuestions(formattedQuestions);
        setOriginalQuestions(formattedQuestions);
      } else {
        setQuestions([]);
        setOriginalQuestions([]);
      }
    } catch (error) {
      console.error('Error loading existing quiz:', error);
      setQuestions([]);
      setOriginalQuestions([]);
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

      // Create a more specific and robust prompt
      const prompt = `You are creating a "Get to Know Me" quiz for a dating app user. 

USER PROFILE:
- Name: ${profileInfo.name}
- Bio: ${profileInfo.bio || 'No bio provided'}
- Interests: ${profileInfo.interests.length > 0 ? profileInfo.interests.join(', ') : 'No interests specified'}
- Age: ${profileInfo.age || 'Not specified'}

TASK: Generate exactly 10 questions with answers based on the user's profile information.

REQUIREMENTS:
1. Create exactly 10 questions that are personal, fun, and reveal interesting things about the user
2. Questions should be based on their interests, bio, and personality traits
3. Each question must have a specific, personal answer
4. For each question, provide 1 fake/incorrect answer that is plausible but wrong
5. Questions should be engaging and help potential matches learn about the user
6. Mix different types of questions (favorites, experiences, preferences, personality traits, etc.)

RESPONSE FORMAT: You must respond with ONLY a valid JSON array. No other text.
Each inner array must contain exactly 3 elements: [question, correct_answer, fake_answer]

EXAMPLE FORMAT:
[
  ["What's my favorite movie?", "The Matrix", "Inception"],
  ["What's my dream vacation destination?", "Japan", "Italy"],
  ["What's my biggest fear?", "Spiders", "Heights"],
  ["What's my favorite food?", "Pizza", "Sushi"],
  ["What's my ideal weekend activity?", "Hiking", "Netflix marathon"],
  ["What's my favorite season?", "Fall", "Summer"],
  ["What's my dream job?", "Software Engineer", "Doctor"],
  ["What's my favorite music genre?", "Rock", "Pop"],
  ["What's my biggest accomplishment?", "Graduating college", "Running a marathon"],
  ["What's my favorite way to relax?", "Reading", "Gaming"]
]

IMPORTANT: 
- Respond with ONLY the JSON array, no additional text
- Use the user's actual interests and bio to create personalized questions
- If the user has limited profile info, create general personality questions
- Ensure all questions are appropriate for a dating app context`;

      console.log('🤖 Sending prompt to Gemini:', prompt);
      const response = await promptGemini(prompt);
      console.log('🤖 Raw Gemini response:', response);
      
      // Parse the response to extract the quiz data
      let quizData;
      try {
        // Clean the response - remove any markdown formatting or extra text
        let cleanedResponse = response.trim();
        
        // Remove markdown code blocks if present
        cleanedResponse = cleanedResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        
        // Try to parse as JSON first
        quizData = JSON.parse(cleanedResponse);
        console.log('✅ Successfully parsed JSON:', quizData);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.log('🔍 Attempting to extract array from response...');
        
        // If JSON parsing fails, try to extract array from the response
        const arrayMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          try {
            quizData = JSON.parse(arrayMatch[0]);
            console.log('✅ Successfully extracted and parsed array:', quizData);
          } catch (secondParseError) {
            console.error('❌ Second parse error:', secondParseError);
            throw new Error('Failed to parse quiz data from Gemini response. Please try again.');
          }
        } else {
          console.error('❌ No array found in response');
          throw new Error('No valid quiz data found in Gemini response. Please try again.');
        }
      }

      // Validate the quiz data
      if (!Array.isArray(quizData)) {
        throw new Error('Generated quiz data is not an array');
      }
      
      if (quizData.length < 5 || quizData.length > 10) {
        throw new Error(`Generated quiz must have between 5-10 questions, got ${quizData.length}`);
      }

      // Validate each question has question, answer, and 1 fake answer
      for (let i = 0; i < quizData.length; i++) {
        if (!Array.isArray(quizData[i])) {
          throw new Error(`Question ${i + 1} is not an array`);
        }
        if (quizData[i].length !== 3) {
          throw new Error(`Question ${i + 1} must have exactly 3 elements (question, answer, fake_answer), got ${quizData[i].length}`);
        }
        if (!quizData[i][0] || !quizData[i][1] || !quizData[i][2]) {
          throw new Error(`Question ${i + 1} cannot have empty question, answer, or fake answer`);
        }
      }

      console.log('✅ Quiz validation passed, setting questions:', quizData);
      setQuestions(quizData);
      setOriginalQuestions(quizData);
      Alert.alert('Success', 'Quiz generated successfully! You can now review and edit the questions.');
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      
      // Offer to create a basic quiz as fallback
      Alert.alert(
        'Quiz Generation Error', 
        `Failed to generate quiz: ${error.message}\n\nWould you like to create a basic quiz template instead?`,
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Create Basic Quiz',
            onPress: () => createBasicQuiz()
          }
        ]
      );
    } finally {
      setGenerating(false);
    }
  };

  const createBasicQuiz = () => {
    const basicQuestions = [
      ["What's my favorite movie?", "Enter your favorite movie", "Enter a fake movie"],
      ["What's my dream vacation destination?", "Enter your dream destination", "Enter a fake destination"],
      ["What's my biggest fear?", "Enter your biggest fear", "Enter a fake fear"],
      ["What's my favorite food?", "Enter your favorite food", "Enter a fake food"],
      ["What's my ideal weekend activity?", "Enter your ideal activity", "Enter a fake activity"],
      ["What's my favorite season?", "Enter your favorite season", "Enter a fake season"],
      ["What's my dream job?", "Enter your dream job", "Enter a fake job"],
      ["What's my favorite music genre?", "Enter your favorite genre", "Enter a fake genre"],
      ["What's my biggest accomplishment?", "Enter your accomplishment", "Enter a fake accomplishment"],
      ["What's my favorite way to relax?", "Enter your relaxation method", "Enter a fake method"]
    ];
    
    setQuestions(basicQuestions);
    setOriginalQuestions(basicQuestions);
    Alert.alert('Basic Quiz Created', 'A basic quiz template has been created. You can now customize the questions and answers!');
  };



  const removeQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const editQuestion = (index, newQuestion, newAnswer, newFakeAnswer) => {
    const newQuestions = [...questions];
    // Ensure the array has enough elements
    while (newQuestions.length <= index) {
      newQuestions.push(['', '', '']);
    }
    newQuestions[index] = [newQuestion, newAnswer, newFakeAnswer];
    setQuestions(newQuestions);
  };

  const saveQuiz = async () => {
    if (!user) return;

    if (questions.length === 0) {
      Alert.alert('No Questions', 'Please add at least one question to your quiz.');
      return;
    }

    // Check for partially filled questions (1 or 2 inputs filled but not all 3)
    const partiallyFilledQuestions = questions.filter(q => {
      const filledCount = [q[0], q[1], q[2]].filter(field => field && field.trim()).length;
      return filledCount > 0 && filledCount < 3;
    });

    if (partiallyFilledQuestions.length > 0) {
      Alert.alert(
        'Incomplete Questions',
        'Some questions are partially filled. Please either complete all fields for each question or leave them completely empty.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      return;
    }

    // Filter out empty questions
    const validQuestions = questions.filter(q => q[0] && q[1] && q[2]);

    if (validQuestions.length === 0) {
      Alert.alert('No Valid Questions', 'Please add at least one complete question with question, answer, and fake answer.');
      return;
    }

    if (validQuestions.length < 5) {
      Alert.alert(
        'Incomplete Quiz',
        `You have ${validQuestions.length}/5 complete questions. Please add at least 5 complete questions to your quiz.`,
        [
          { text: 'Add More', style: 'default' }
        ]
      );
      return;
    }

    // Update questions to only include valid ones
    setQuestions(validQuestions);
    setOriginalQuestions(validQuestions);
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

  const handleDeleteQuiz = async () => {
    if (!user) return;

    Alert.alert(
      'Delete Quiz',
      'Are you sure you want to delete your quiz? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteQuiz(user.id);
              setQuestions([]);
              Alert.alert('Success', 'Your quiz has been deleted successfully!');
              if (onQuizSaved) {
                onQuizSaved();
              }
            } catch (error) {
              console.error('Error deleting quiz:', error);
              Alert.alert('Error', 'Failed to delete quiz. Please try again.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Match Quiz</Text>
        <Text style={styles.subtitle}>
          Create a quiz to test how well your matches know you!
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.actionButton, styles.editButton]}
        onPress={() => {
          // Store current state when opening modal
          setOriginalQuestions([...questions]);
          setShowQuizModal(true);
        }}
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
          {generating ? 'Generating...' : 'Generate Quiz'}
        </Text>
      </TouchableOpacity>



      {/* Quiz Editing Modal */}
      <Modal
        visible={showQuizModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          // Reset to original state when closing without saving
          setQuestions([...originalQuestions]);
          setShowQuizModal(false);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                // Reset to original state when closing without saving
                setQuestions([...originalQuestions]);
                setShowQuizModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Quiz</Text>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (questions.filter(q => q[0] && q[1] && q[2]).length < 5 || 
                 questions.some(q => {
                   const filledCount = [q[0], q[1], q[2]].filter(field => field && field.trim()).length;
                   return filledCount > 0 && filledCount < 3;
                 })) && styles.disabledSaveButton
              ]}
              onPress={saveQuiz}
              disabled={
                questions.filter(q => q[0] && q[1] && q[2]).length < 5 || 
                questions.some(q => {
                  const filledCount = [q[0], q[1], q[2]].filter(field => field && field.trim()).length;
                  return filledCount > 0 && filledCount < 3;
                }) || 
                saving
              }
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>

            <ScrollView style={styles.questionsContainer}>
              {questions.map((question, index) => (
                <View key={index} style={styles.questionInputSection}>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Question"
                    value={question[0] || ''}
                    onChangeText={(text) => editQuestion(index, text, question[1] || '', question[2] || '')}
                    multiline
                    maxLength={200}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Answer"
                    value={question[1] || ''}
                    onChangeText={(text) => editQuestion(index, question[0] || '', text, question[2] || '')}
                    multiline
                    maxLength={100}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Fake Answer"
                    value={question[2] || ''}
                    onChangeText={(text) => editQuestion(index, question[0] || '', question[1] || '', text)}
                    multiline
                    maxLength={100}
                  />
                </View>
              ))}
              
              {questions.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    No questions yet. Use the "Generate with AI" button to create questions based on your profile, or add questions manually.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>

        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Question Item Component
function QuestionItem({ index, question, answer, fakeAnswer, onEdit, onRemove }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState(question);
  const [editAnswer, setEditAnswer] = useState(answer);
  const [editFakeAnswer, setEditFakeAnswer] = useState(fakeAnswer);

  const handleSave = () => {
    if (editQuestion.trim() && editAnswer.trim() && editFakeAnswer.trim()) {
      onEdit(index, editQuestion.trim(), editAnswer.trim(), editFakeAnswer.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditQuestion(question);
    setEditAnswer(answer);
    setEditFakeAnswer(fakeAnswer);
    setIsEditing(false);
  };

  return (
    <View style={styles.questionItem}>
      {isEditing ? (
        <View style={styles.editMode}>
          <TextInput
            style={styles.input}
            value={editQuestion}
            onChangeText={setEditQuestion}
            placeholder="Question"
            multiline
          />
          <TextInput
            style={styles.input}
            value={editAnswer}
            onChangeText={setEditAnswer}
            placeholder="Correct Answer"
            multiline
          />
          <TextInput
            style={styles.input}
            value={editFakeAnswer}
            onChangeText={setEditFakeAnswer}
            placeholder="Fake Answer"
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
          <Text style={styles.fakeAnswerText}>Fake Answer: {fakeAnswer}</Text>
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
    textAlign: 'center',
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
    backgroundColor: 'blueviolet',
  },
  clearButton: {
    backgroundColor: '#ff3b30',
  },
  addButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: 'hotpink',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  disabledSaveButton: {
    backgroundColor: '#ccc',
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
  questionsContainer: {
    flex: 1,
  },

  questionInputSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  existingQuestionsSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
  questionsList: {
    flex: 1,
  },
  questionItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
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
    textAlign: 'center',
    marginBottom: 8,
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
  fakeAnswerText: {
    fontSize: 12,
    color: '#999',
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
  editFakeAnswerInput: {
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