# Get to Know Me Quiz Feature

## Overview
The "Get to Know Me" quiz feature allows users to create personalized quizzes that their matches can take to learn more about them. This feature enhances the dating experience by providing a fun and interactive way for users to test how well they know each other.

## Features

### 1. Quiz Creation
- Users can create up to 10 personalized questions about themselves
- Two creation methods:
  - **Manual Entry**: Users can manually type questions and answers
  - **AI Generation**: Uses Gemini AI to generate questions based on user's profile (bio, interests, etc.)
- Questions are stored in the `quiz` table in the `user` schema

### 2. Quiz Taking
- Matched users can take each other's quizzes
- Interactive quiz interface with progress tracking
- Question navigation with visual indicators
- Score calculation and results display
- Quiz scores are stored in the `matches` table

### 3. Score Tracking
- Scores are calculated as percentage (correct answers / total questions)
- Scores are stored in the format: `[["quiz_owner_id", score], ...]`
- Visual indicators show quiz completion status
- Trophy icon for completed quizzes

## Database Schema

### Quiz Table (`user.quiz`)
```sql
CREATE TABLE "user"."quiz" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    questions JSONB NOT NULL, -- [["question", "answer"], ...]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Matches Table Update
```sql
ALTER TABLE "user"."matches" 
ADD COLUMN quiz_scores JSONB DEFAULT '[]'::jsonb;
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

### QuizTaker (`app/components/matches/QuizTaker.jsx`)
- Component for taking quizzes from matches
- Located in the matches page
- Features:
  - Interactive quiz interface
  - Progress tracking
  - Question navigation
  - Score calculation and display
  - Results with encouraging messages

## API Functions

### Quiz Management (`lib/supabase.js`)
- `createOrUpdateQuiz(userId, quizData)` - Create or update user's quiz
- `getUserQuiz(userId)` - Get a user's quiz
- `submitQuizAnswers(quizOwnerId, answers)` - Calculate quiz score
- `saveQuizScore(quizOwnerId, quizTakerId, score)` - Save score to matches
- `getQuizScores()` - Get current user's quiz scores
- `getQuizScoreForUser(quizOwnerId)` - Get score for specific user

## User Experience

### Creating a Quiz
1. Navigate to Settings → Edit Profile
2. Scroll to "Get to Know Me Quiz" section
3. Choose to generate with AI or create manually
4. Review and edit questions as needed
5. Save the quiz

### Taking a Quiz
1. Go to Matches page
2. Click the quiz button (help circle icon) on any match card
3. Answer questions one by one
4. Submit quiz to see results
5. View score and encouraging message

### Visual Indicators
- **Blue help circle**: Quiz available to take
- **Gold trophy**: Quiz completed
- **Score display**: Shows percentage score below match card

## AI Integration

The quiz generation uses Google's Gemini AI to create personalized questions based on:
- User's bio
- Interests
- Age
- Profile information

The AI generates exactly 10 questions in the required JSON format and validates the response before saving.

## Security

- Row Level Security (RLS) policies ensure users can only access their own quizzes
- Quiz scores are stored securely in the matches table
- All database operations are properly authenticated

## Future Enhancements

Potential improvements could include:
- Quiz templates for common question types
- Quiz sharing between users
- Quiz analytics and insights
- Quiz difficulty levels
- Quiz categories (personality, preferences, etc.)
- Quiz completion badges/achievements

## Technical Notes

- Quiz data is stored as JSONB for flexibility
- Scores are stored as arrays for efficient querying
- All components are responsive and follow the app's design system
- Error handling is implemented throughout the feature
- Loading states and user feedback are provided for all operations 