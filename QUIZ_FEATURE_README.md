# Get to Know Me Quiz Feature

## Overview
The "Get to Know Me" quiz feature allows users to create personalized quizzes that their matches can take to learn more about them. This feature enhances the dating experience by providing a fun and interactive way for users to test how well they know each other.

## Features

### 1. Quiz Creation
- Users must create exactly 10 personalized questions about themselves
- Two creation methods:
  - **Manual Entry**: Users can manually type questions, correct answers, and 3 fake answers
  - **AI Generation**: Uses Gemini AI to generate questions with correct and 3 fake answers based on user's profile (bio, interests, etc.)
- Questions are stored in the `quizzes` table with separate arrays for questions, answers, and fake answers
- Each question requires exactly 3 fake answers for multiple choice format (4 total options per question)

### 2. Quiz Taking
- Matched users can take each other's quizzes
- Interactive quiz interface with progress tracking
- Multiple choice questions with 4 randomized options (1 correct + 3 fake)
- Question navigation with visual indicators
- Score calculation and results display
- Quiz scores are stored in the `matches` table

### 3. Score Tracking
- Scores are calculated as percentage (correct answers / total questions)
- Scores are stored in the `matches` table with `user1_score` and `user2_score` fields
- Visual indicators show quiz completion status
- Trophy icon for completed quizzes, help circle for available quizzes

## Requirements

### Profile Requirements
- Users must select between 10 and 25 interests/hobbies to complete their profile
- Users must create exactly 10 quiz questions to save their quiz

### Quiz Structure
- Each quiz question must have:
  - 1 question text
  - 1 correct answer
  - 3 fake answers (for a total of 4 multiple choice options)

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

## Data Structure

### Quiz Data Format
Each quiz question is stored as:
- `questions[index]`: The question text
- `answers[index]`: The correct answer
- `fake_answers[index]`: Array of 3 fake answers `[fake1, fake2, fake3]`

### Quiz Taking Format
When a user takes a quiz, the options are presented as:
- 4 multiple choice options per question
- 1 correct answer + 3 fake answers
- Options are shuffled randomly for each quiz attempt

## Implementation Notes

### Validation
- Profile validation requires at least 10 interests (maximum 25)
- Quiz validation requires exactly 10 complete questions
- Each question must have all 5 fields filled (question + answer + 3 fake answers)

### AI Generation
- Gemini AI generates exactly 10 questions based on user profile
- Each generated question includes 3 plausible fake answers
- Questions are personalized based on user's interests, bio, and personality traits

### User Experience
- Clear validation messages guide users to complete requirements
- Quiz interface shows progress (X/10 questions)
- Save button is disabled until all requirements are met 