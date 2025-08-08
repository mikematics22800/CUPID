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
  SafeAreaView
} from 'react-native';
import { TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { createOrUpdateQuiz, getUserQuiz, deleteQuiz } from '../../../lib/supabase';
import { promptGemini } from '../../../lib/gemini';
import { useProfile } from '../../contexts/ProfileContext';

export default function QuizSection({ onQuizSaved, onQuizDataChange }) {
  const { user, profile, bio, interests, name } = useProfile();
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showQuestionCountModal, setShowQuestionCountModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [quizExists, setQuizExists] = useState(false);
  const pickerScrollViewRef = React.useRef(null);

  // Initialize with 25 empty question forms
  const [questions, setQuestions] = useState(Array(25).fill(['', '', '', '', '']));
  const [originalQuestions, setOriginalQuestions] = useState(Array(25).fill(['', '', '', '', '']));

  // Load existing quiz on component mount
  useEffect(() => {
    loadExistingQuiz();
  }, [user]);

  // Notify parent component when quiz data changes
  useEffect(() => {
    if (onQuizDataChange) {
      // Only pass non-empty questions to parent
      const nonEmptyQuestions = questions.filter(q => q[0]?.trim() && q[1]?.trim() && q[2]?.trim() && q[3]?.trim() && q[4]?.trim());
      onQuizDataChange(nonEmptyQuestions);
    }
  }, [questions, onQuizDataChange]);

  const loadExistingQuiz = async () => {
    if (!user) return;
    
    try {
      const quiz = await getUserQuiz(user.id);
      if (quiz && quiz.length > 0) {
        // Convert new quiz format to the format expected by the component
        const formattedQuestions = quiz.map(q => [
          q.question,
          q.correctAnswer,
          ...q.options.filter(option => option !== q.correctAnswer).slice(0, 3)
        ]);
        
        // Create a new array with 25 slots, populated with existing questions
        const newQuestions = Array(25).fill(['', '', '', '', '']);
        formattedQuestions.forEach((question, index) => {
          if (index < 25) {
            newQuestions[index] = question;
          }
        });
        
        setQuestions(newQuestions);
        setOriginalQuestions([...newQuestions]);
        setQuizExists(true);
      } else {
        // Reset to empty 25-question array
        const emptyQuestions = Array(25).fill(['', '', '', '', '']);
        setQuestions(emptyQuestions);
        setOriginalQuestions([...emptyQuestions]);
        setQuizExists(false);
      }
    } catch (error) {
      console.error('Error loading existing quiz:', error);
      // Reset to empty 25-question array
      const emptyQuestions = Array(25).fill(['', '', '', '', '']);
      setQuestions(emptyQuestions);
      setOriginalQuestions([...emptyQuestions]);
      setQuizExists(false);
    }
  };

  const generateQuizWithGemini = async (numQuestions = 10) => {
    if (!user) return;

    setGenerating(true);
    try {
      // Delete existing quiz first
      if (quizExists) {
        console.log('🗑️ Deleting existing quiz before generating new one...');
        try {
          await deleteQuiz(user.id);
          console.log('✅ Existing quiz deleted successfully');
          // Clear local state
          setQuestions([]);
          setOriginalQuestions([]);
          setQuizExists(false);
        } catch (deleteError) {
          console.error('❌ Error deleting existing quiz:', deleteError);
          // Continue with generation even if deletion fails
        }
      }

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

TASK: Generate exactly ${numQuestions} questions with answers based on the user's profile information.

REQUIREMENTS:
1. Create exactly ${numQuestions} questions that are personal, fun, and reveal interesting things about the user
2. Questions should be based on their interests, bio, and personality traits
3. Each question must have a specific, personal answer
4. For each question, provide exactly 3 fake/incorrect answers that are plausible but wrong
5. Questions should be engaging and help potential matches learn about the user
6. Mix different types of questions (favorites, experiences, preferences, personality traits, etc.)

RESPONSE FORMAT: You must respond with ONLY a valid JSON array. No other text.
Each inner array must contain exactly 5 elements: [question, correct_answer, fake_answer1, fake_answer2, fake_answer3]

EXAMPLE FORMAT:
[
  ["What's my favorite movie?", "The Matrix", "Inception", "Interstellar", "The Dark Knight"],
  ["What's my dream vacation destination?", "Japan", "Italy", "Australia", "Brazil"],
  ["What's my biggest fear?", "Spiders", "Heights", "Public Speaking", "Flying"],
  ["What's my favorite food?", "Pizza", "Sushi", "Tacos", "Burgers"],
  ["What's my ideal weekend activity?", "Hiking", "Netflix marathon", "Shopping", "Cooking"],
  ["What's my favorite season?", "Fall", "Summer", "Spring", "Winter"],
  ["What's my dream job?", "Software Engineer", "Doctor", "Teacher", "Artist"],
  ["What's my favorite music genre?", "Rock", "Pop", "Hip Hop", "Jazz"],
  ["What's my biggest accomplishment?", "Graduating college", "Running a marathon", "Learning guitar", "Traveling solo"],
  ["What's my favorite way to relax?", "Reading", "Gaming", "Meditation", "Yoga"]
]

IMPORTANT: 
- Respond with ONLY the JSON array, no additional text
- Use the user's actual interests and bio to create personalized questions
- If the user has limited profile info, create general personality questions
- Ensure all questions are appropriate for a dating app context
- Each question must have exactly 3 fake answers
- Generate exactly ${numQuestions} questions`;

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
      
      if (quizData.length !== numQuestions) {
        throw new Error(`Generated quiz must have exactly ${numQuestions} questions, got ${quizData.length}`);
      }

      // Validate each question has question, answer, and 3 fake answers
      for (let i = 0; i < quizData.length; i++) {
        if (!Array.isArray(quizData[i])) {
          throw new Error(`Question ${i + 1} is not an array`);
        }
        if (quizData[i].length !== 5) {
          throw new Error(`Question ${i + 1} must have exactly 5 elements (question, answer, fake_answer1, fake_answer2, fake_answer3), got ${quizData[i].length}`);
        }
        if (!quizData[i][0] || !quizData[i][1] || !quizData[i][2] || !quizData[i][3] || !quizData[i][4]) {
          throw new Error(`Question ${i + 1} cannot have empty question, answer, or fake answers`);
        }
      }

      console.log('✅ Quiz validation passed, setting questions:', quizData);
      
      // Create a new array with 25 slots, populated with generated questions
      const newQuestions = Array(25).fill(['', '', '', '', '']);
      quizData.forEach((question, index) => {
        if (index < 25) {
          newQuestions[index] = question;
        }
      });
      
      // Save the generated quiz to the database
      console.log('💾 Saving generated quiz to database...');
      await createOrUpdateQuiz(user.id, quizData);
      console.log('✅ Generated quiz saved to database');
      
      setQuestions(newQuestions);
      setOriginalQuestions([...newQuestions]);
      setQuizExists(true);
      
      Alert.alert('Quiz Generated & Saved!', `Generated and saved ${numQuestions} questions. Feel free to review and edit to your liking.`);
      
      // Notify parent component
      if (onQuizSaved) {
        onQuizSaved();
      }
    } catch (error) {
      console.error('❌ Error generating quiz:', error);
      
      Alert.alert(
        'Quiz Generation Error', 
        `Failed to generate quiz: ${error.message}\n\nPlease try again or create your quiz manually.`,
        [
          {
            text: 'OK',
            style: 'default'
          }
        ]
      );
    } finally {
      setGenerating(false);
    }
  };

  const addQuestion = () => {
    // Find the first empty question slot
    const emptyIndex = questions.findIndex(q => !q[0]?.trim());
    if (emptyIndex === -1) {
      Alert.alert('Maximum Questions Reached', 'You can have a maximum of 25 questions in your quiz.');
      return;
    }
    // The form is already there, just focus on it or show a message
    Alert.alert('Add Question', `Please fill in question ${emptyIndex + 1} to add it to your quiz.`);
  };

  const removeQuestion = (index) => {
    const newQuestions = [...questions];
    newQuestions[index] = ['', '', '', '', ''];
    setQuestions(newQuestions);
  };

  const editQuestion = (index, newQuestion, newAnswer, newFakeAnswer1, newFakeAnswer2, newFakeAnswer3) => {
    const newQuestions = [...questions];
    newQuestions[index] = [newQuestion, newAnswer, newFakeAnswer1, newFakeAnswer2, newFakeAnswer3];
    setQuestions(newQuestions);
  };

  const clearQuiz = () => {
    Alert.alert(
      'Clear Quiz',
      'Are you sure you want to clear all questions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          const emptyQuestions = Array(25).fill(['', '', '', '', '']);
          setQuestions(emptyQuestions);
        }}
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
              setQuizExists(false);
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

  const handleGenerateQuiz = () => {
    setShowQuestionCountModal(true);
  };

  const scrollToQuestionCount = (count) => {
    const scrollY = (count - 10) * 50;
    return scrollY;
  };

  // Scroll to initial position when modal opens
  useEffect(() => {
    if (showQuestionCountModal && pickerScrollViewRef.current) {
      setTimeout(() => {
        pickerScrollViewRef.current?.scrollTo({
          y: scrollToQuestionCount(questionCount),
          animated: false
        });
      }, 100);
    }
  }, [showQuestionCountModal, questionCount]);

  const confirmGenerateQuiz = () => {
    setShowQuestionCountModal(false);
    generateQuizWithGemini(questionCount);
  };

  const validateQuiz = () => {
    // Count non-empty questions
    const nonEmptyQuestions = questions.filter(q => 
      q[0]?.trim() && q[1]?.trim() && q[2]?.trim() && q[3]?.trim() && q[4]?.trim()
    );

    if (nonEmptyQuestions.length < 10) {
      Alert.alert(
        'Insufficient Questions',
        'Your quiz must have at least 10 questions. Please add more questions or generate a new quiz.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }

    if (nonEmptyQuestions.length > 25) {
      Alert.alert(
        'Too Many Questions',
        'Your quiz cannot have more than 25 questions. Please remove some questions.',
        [{ text: 'OK', style: 'default' }]
      );
      return false;
    }

    // Check if all filled questions have complete content
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      // Only validate questions that have at least one field filled
      if (question[0]?.trim() || question[1]?.trim() || question[2]?.trim() || question[3]?.trim() || question[4]?.trim()) {
        if (!question[0]?.trim() || !question[1]?.trim() || !question[2]?.trim() || !question[3]?.trim() || !question[4]?.trim()) {
          Alert.alert(
            'Incomplete Questions',
            `Question ${i + 1} is incomplete. Please fill in all fields (question, answer, and 3 fake answers).`,
            [{ text: 'OK', style: 'default' }]
          );
          return false;
        }
      }
    }

    return true;
  };



  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Match Quiz</Text>
        <Text style={styles.subtitle}>
          Create or edit your quiz to test how well your matches know you!
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
          {quizExists ? 'Edit Quiz' : 'Create Quiz'} {(() => {
            const filledQuestions = questions.filter(q => 
              q[0]?.trim() && q[1]?.trim() && q[2]?.trim() && q[3]?.trim() && q[4]?.trim()
            ).length;
            return filledQuestions > 0 ? `(${filledQuestions}/25)` : '';
          })()}
        </Text>
      </TouchableOpacity>

      {quizExists && (
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={handleDeleteQuiz}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Ionicons name="trash" size={20} color="white" />
          )}
          <Text style={styles.actionButtonText}>
            {deleting ? 'Deleting...' : 'Delete Quiz'}
          </Text>
        </TouchableOpacity>
      )}




      {/* Quiz Editing Modal */}
      <Modal
        visible={showQuizModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          // Reset to original questions if user closes without saving
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
                // Reset to original questions if user closes without saving
                setQuestions([...originalQuestions]);
                setShowQuizModal(false);
              }}
            >
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGenerateQuiz}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="sparkles" size={16} color="white" />
                )}
                <Text style={styles.generateButtonText}>
                  {generating ? 'Generating...' : 'Generate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearQuiz}
              >
                <Ionicons name="trash-outline" size={16} color="white" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={async () => {
                  try {
                    // Validate quiz before saving
                    if (!validateQuiz()) {
                      return;
                    }

                    // Get non-empty questions
                    const nonEmptyQuestions = questions.filter(q => 
                      q[0]?.trim() && q[1]?.trim() && q[2]?.trim() && q[3]?.trim() && q[4]?.trim()
                    );

                    // Save to database
                    await createOrUpdateQuiz(user.id, nonEmptyQuestions);
                    
                    // Update local state
                    setOriginalQuestions([...questions]);
                    setQuizExists(true);
                    
                    Alert.alert('Success', 'Your quiz has been saved successfully!');
                    
                    // Notify parent component
                    if (onQuizSaved) {
                      onQuizSaved();
                    }
                  } catch (error) {
                    console.error('Error saving quiz:', error);
                    Alert.alert('Error', 'Failed to save quiz. Please try again.');
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            <ScrollView style={styles.questionsContainer}>
              {Array.from({ length: 25 }, (_, index) => {
                const question = questions[index] || ['', '', '', '', ''];
                const isEmpty = !question[0]?.trim() && !question[1]?.trim() && !question[2]?.trim() && !question[3]?.trim() && !question[4]?.trim();
                
                return (
                  <View key={index} style={[
                    styles.questionInputSection,
                    isEmpty && styles.emptyQuestionSection
                  ]}>
                    <View style={styles.questionHeader}>
                      <Text style={[
                        styles.questionNumber,
                        isEmpty && styles.emptyQuestionNumber
                      ]}>
                        Question {index + 1}
                      </Text>
                      {!isEmpty && (
                        <TouchableOpacity
                          style={styles.removeQuestionButton}
                          onPress={() => removeQuestion(index)}
                        >
                          <Ionicons name="trash" size={20} color="#ff3b30" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <TextInput
                      mode="outlined"
                      label="Question"
                      style={styles.input}
                      value={question[0] || ''}
                      onChangeText={(text) => editQuestion(index, text, question[1] || '', question[2] || '', question[3] || '', question[4] || '')}
                      multiline
                      maxLength={200}
                      placeholder={isEmpty ? "Enter your question here..." : ""}
                    />
                    <TextInput
                      mode="outlined"
                      label="Answer"
                      style={styles.input}
                      value={question[1] || ''}
                      onChangeText={(text) => editQuestion(index, question[0] || '', text, question[2] || '', question[3] || '', question[4] || '')}
                      multiline
                      maxLength={100}
                      placeholder={isEmpty ? "Enter the correct answer..." : ""}
                    />
                    <TextInput
                      mode="outlined"
                      label="Fake Answer 1"
                      style={styles.input}
                      value={question[2] || ''}
                      onChangeText={(text) => editQuestion(index, question[0] || '', question[1] || '', text, question[3] || '', question[4] || '')}
                      multiline
                      maxLength={100}
                      placeholder={isEmpty ? "Enter a fake answer..." : ""}
                    />
                    <TextInput
                      mode="outlined"
                      label="Fake Answer 2"
                      style={styles.input}
                      value={question[3] || ''}
                      onChangeText={(text) => editQuestion(index, question[0] || '', question[1] || '', question[2] || '', text, question[4] || '')}
                      multiline
                      maxLength={100}
                      placeholder={isEmpty ? "Enter a fake answer..." : ""}
                    />
                    <TextInput
                      mode="outlined"
                      label="Fake Answer 3"
                      style={styles.input}
                      value={question[4] || ''}
                      onChangeText={(text) => editQuestion(index, question[0] || '', question[1] || '', question[2] || '', question[3] || '', text)}
                      multiline
                      maxLength={100}
                      placeholder={isEmpty ? "Enter a fake answer..." : ""}
                    />
                  </View>
                );
              })}
            </ScrollView>

            {/* Embedded Question Count Modal */}
            {showQuestionCountModal && (
              <View style={styles.embeddedModalOverlay}>
                <View style={styles.embeddedQuestionCountModal}>
                  <Text style={styles.modalTitle}>How many questions?</Text>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerWheel}>
                      <View style={styles.pickerSelectionIndicator} />
                      <ScrollView
                        ref={pickerScrollViewRef}
                        style={styles.pickerScrollView}
                        showsVerticalScrollIndicator={false}
                        snapToInterval={50}
                        decelerationRate="fast"
                        onMomentumScrollEnd={(event) => {
                          const y = event.nativeEvent.contentOffset.y;
                          const index = Math.round(y / 50);
                          const newValue = Math.max(10, Math.min(25, 10 + index));
                          setQuestionCount(newValue);
                        }}
                      >
                        {/* Add padding items to center the selection */}
                        <View style={styles.pickerPaddingItem} />
                        <View style={styles.pickerPaddingItem} />
                        
                        {Array.from({ length: 16 }, (_, i) => i + 10).map((num) => (
                          <TouchableOpacity
                            key={num}
                            style={styles.pickerItem}
                            onPress={() => setQuestionCount(num)}
                          >
                            <View style={[
                              styles.pickerItemContainer,
                              questionCount === num && styles.pickerItemContainerSelected
                            ]}>
                              <Text style={[
                                styles.pickerItemText,
                                questionCount === num && styles.pickerItemTextSelected
                              ]}>
                                {num}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        
                        {/* Add padding items to center the selection */}
                        <View style={styles.pickerPaddingItem} />
                        <View style={styles.pickerPaddingItem} />
                      </ScrollView>
                    </View>
                  </View>
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowQuestionCountModal(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={confirmGenerateQuiz}
                    >
                      <Text style={styles.confirmButtonText}>Generate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

        </SafeAreaView>
      </Modal>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
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
    paddingVertical: 10,
    borderRadius: 18,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionCountModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pickerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerWheel: {
    height: 150,
    width: 120,
    position: 'relative',
    marginBottom: 8,
  },
  pickerSelectionIndicator: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 50,
    backgroundColor: 'transparent',
    zIndex: 1,
    transform: [{ translateY: -25 }],
  },
  pickerScrollView: {
    flex: 1,
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerPaddingItem: {
    height: 50,
  },
  pickerItemContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 40,
    alignItems: 'center',
  },
  pickerItemContainerSelected: {
    backgroundColor: 'hotpink',
  },
  pickerItemText: {
    fontSize: 20,
    color: '#999',
    fontWeight: '400',
  },
  pickerItemTextSelected: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  confirmButton: {
    backgroundColor: 'hotpink',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  addQuestionButton: {
    padding: 8,
  },
  removeQuestionButton: {
    padding: 8,
    position: 'absolute',
    right: 0,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveQuizButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveQuizButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  generateButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
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
    color: 'hotpink',
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
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
    marginBottom: 8,
    backgroundColor: 'white',
  },
  emptyQuestionSection: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  emptyQuestionNumber: {
    color: '#999',
  },
  embeddedModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  embeddedQuestionCountModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
}); 