# Get to Know Me Quiz Feature

## Overview
The "Get to Know Me" quiz feature allows users to create personalized quizzes that their matches can take to learn more about them. This feature enhances the dating experience by providing a fun and interactive way for users to test how well they know each other.

## Features

### 1. Quiz Creation
- Users can create between 5-10 personalized questions about themselves
- Two creation methods:
  - **Manual Entry**: Users can manually type questions, correct answers, and 1 fake answer
  - **AI Generation**: Uses Gemini AI to generate questions with correct and fake answers based on user's profile (bio, interests, etc.)
- Questions are stored in the `quizzes` table with separate arrays for questions, answers, and fake answers
- Each question requires exactly 1 fake answer for multiple choice format

### 2. Quiz Taking
- Matched users can take each other's quizzes
- Interactive quiz interface with progress tracking
- Multiple choice questions with randomized options
- Question navigation with visual indicators
- Score calculation and results display
- Quiz scores are stored in the `matches` table

### 3. Score Tracking
- Scores are calculated as percentage (correct answers / total questions)
- Scores are stored in the `matches` table with `user1_score` and `user2_score` fields
- Visual indicators show quiz completion status
- Trophy icon for completed quizzes, help circle for available quizzes

## Database Schema

### Quizzes Table (`public.quizzes`)
```sql
CREATE TABLE public.quizzes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  questions ARRAY,
  answers ARRAY,
  fake_answers ARRAY,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
```

### Matches Table
```sql
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user1_id uuid,
  user2_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  user1_score real,
  user2_score real,
  CONSTRAINT matches_pkey PRIMARY KEY (id),
  CONSTRAINT matches_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id),
  CONSTRAINT matches_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id)
);
```

## Components

### QuizSection (`app/components/settings/QuizSection.jsx`)
- Main component for creating and editing quizzes
- Located in the settings/profile editing page
- Features:
  - AI-powered quiz generation
  - Manual question/answer entry
  - Question editing and deletion
  - Quiz preview
  - Save/load functionality
  - Delete quiz option

### QuizTaker (`app/components/matches/QuizTaker.jsx`)
- Component for taking quizzes from matches
- Modal interface for quiz taking
- Features:
  - Interactive quiz interface with multiple choice options
  - Progress tracking with visual progress bar
  - Question navigation (previous/next)
  - Score calculation and display
  - Results with encouraging messages based on score
  - Beautiful UI with animations and visual feedback

## API Functions

### Quiz Management (`lib/supabase.js`)
- `createOrUpdateQuiz(userId, quizData)` - Create or update user's quiz
- `getUserQuiz(userId)` - Get a user's quiz for editing
- `getQuizWithOptions(userId)` - Get quiz with multiple choice options for taking
- `generateFakeAnswers(questions, correctAnswers)` - Generate fake answers for multiple choice
- `submitQuizAnswers(quizOwnerId, answers)` - Calculate quiz score
- `saveQuizScore(quizOwnerId, quizTakerId, score)` - Save score to matches table
- `getQuizScores()` - Get current user's quiz scores
- `getQuizScoreForUser(quizOwnerId)` - Get score for specific user
- `deleteQuiz(userId)` - Delete a user's quiz

## User Experience

### Creating a Quiz
1. Navigate to Settings → Edit Profile
2. Scroll to "Familiarity Quiz" section
3. Choose to generate with AI or create manually
4. Review and edit questions as needed
5. Save the quiz
6. Option to delete quiz if needed

### Taking a Quiz
1. Go to Matches page
2. Click the quiz button (help circle icon) on any match card
3. Answer multiple choice questions one by one
4. Navigate between questions using previous/next buttons
5. Submit quiz to see results
6. View score and encouraging message
7. Quiz button changes to trophy icon after completion

### Visual Indicators
- **Blue help circle**: Quiz available to take
- **Gold trophy**: Quiz completed
- **Score display**: Shows percentage score below match card
- **Progress bar**: Shows quiz completion progress
- **Color-coded results**: Different colors based on score performance

## AI Integration

The quiz generation uses Google's Gemini AI to create personalized questions based on:
- User's bio
- Interests
- Age
- Profile information

The AI generates exactly 10 questions in the required JSON format and validates the response before saving.

## Enhanced Features

### Multiple Choice Questions
- Each question now has multiple choice options
- Correct answer is mixed with 1 user-provided fake answer
- Options are randomized for each quiz attempt
- Users can customize fake answers to make them more realistic and challenging
- AI generation creates contextually appropriate fake answers

### Improved UI/UX
- Modern, clean interface design
- Smooth animations and transitions
- Visual progress tracking
- Responsive design for different screen sizes
- Loading states and error handling
- Encouraging messages based on performance

## Security

- Row Level Security (RLS) policies ensure users can only access their own quizzes
- Quiz scores are stored securely in the matches table
- All database operations are properly authenticated
- Quiz data is validated before saving

## Future Enhancements

Potential improvements could include:
- AI-generated fake answers using Gemini
- Quiz templates for common question types
- Quiz sharing between users
- Quiz analytics and insights
- Quiz difficulty levels
- Quiz categories (personality, preferences, etc.)
- Quiz completion badges/achievements
- Quiz retake functionality with different fake answers
- Quiz time limits and scoring bonuses

## Technical Notes

- Quiz data is stored as arrays for efficient querying
- Scores are stored as real numbers in the matches table
- All components are responsive and follow the app's design system
- Error handling is implemented throughout the feature
- Loading states and user feedback are provided for all operations
- The quiz system is fully integrated with the existing match and chat functionality 