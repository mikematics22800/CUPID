# Component Organization

This document outlines the new component organization structure for the CUPID app.

## Overview

Components have been organized into folders based on their respective screens to improve maintainability and code organization.

## Folder Structure

```
app/components/
├── auth/                    # Authentication components (existing)
│   ├── WelcomeScreen.jsx
│   ├── PhotoSection.jsx
│   ├── LoginForm.jsx
│   ├── RegisterForm.jsx
│   ├── DualVerificationForm.jsx
│   ├── ContactSection.jsx
│   ├── RegisterButton.jsx
│   ├── BioSection.jsx
│   ├── InterestsSection.jsx
│   ├── PersonalInfoSection.jsx
│   ├── VerificationForm.jsx
│   └── FloatingHearts.jsx
├── app/                     # App-wide components (existing)
│   ├── chat.jsx
│   └── chat-content.jsx
├── matches/                 # Matches screen components
│   ├── MatchCard.jsx
│   ├── MessageBubble.jsx
│   ├── ChatHeader.jsx
│   ├── MessageInput.jsx
│   ├── ChatSuggestions.jsx
│   ├── EmptyState.jsx
│   └── index.js
├── likes/                   # Likes screen components
│   ├── LikeCard.jsx
│   ├── SwipeIndicators.jsx
│   ├── LikeCounter.jsx
│   ├── EmptyState.jsx
│   └── index.js
├── swipe/                   # Swipe screen components
│   ├── ProfileCard.jsx
│   ├── SwipeIndicators.jsx
│   ├── TimerDisplay.jsx
│   ├── PhotoErrorDisplay.jsx
│   ├── InsufficientPhotosState.jsx
│   ├── NoProfilesState.jsx
│   └── index.js
├── profile/                 # Profile screen components
│   ├── ProfileHeader.jsx
│   ├── ProfileInfoCard.jsx
│   └── index.js
├── settings/                # Settings screen components
│   ├── SettingItem.jsx
│   ├── AgeRangeModal.jsx
│   ├── SexPreferenceModal.jsx
│   ├── DistanceModal.jsx
│   └── index.js
├── shared/                  # Shared components across screens
│   ├── LoadingScreen.jsx
│   └── index.js
└── index.js                 # Main index file for all components
```

## Component Descriptions

### Matches Components
- **MatchCard**: Displays individual match information with chat and unmatch actions
- **MessageBubble**: Renders individual messages in the chat interface
- **ChatHeader**: Header for the chat interface with back button and match info
- **MessageInput**: Input area for sending messages
- **ChatSuggestions**: Panel for displaying chat suggestions and categories
- **EmptyState**: Displayed when there are no matches

### Likes Components
- **LikeCard**: Displays individual like cards with swipe functionality
- **SwipeIndicators**: Shows swipe direction indicators (pass/like back)
- **LikeCounter**: Shows current like count
- **EmptyState**: Displayed when there are no likes

### Swipe Components
- **ProfileCard**: Displays individual profile cards with swipe functionality
- **SwipeIndicators**: Shows swipe direction indicators (dislike/like)
- **TimerDisplay**: Shows the swipe timer when disabled
- **PhotoErrorDisplay**: Shows photo loading errors
- **InsufficientPhotosState**: Displayed when user needs to complete profile
- **NoProfilesState**: Displayed when there are no more profiles to show

### Profile Components
- **ProfileHeader**: Header with back and save buttons
- **ProfileInfoCard**: Displays read-only profile information

### Settings Components
- **SettingItem**: Individual setting item with icon, title, and action
- **AgeRangeModal**: Modal for selecting age range preferences
- **SexPreferenceModal**: Modal for selecting sex preferences
- **DistanceModal**: Modal for selecting maximum distance

### Shared Components
- **LoadingScreen**: Consistent loading screen across all screens

## Usage

### Importing Components

You can import components in several ways:

1. **Individual imports**:
```javascript
import MatchCard from '../components/matches/MatchCard';
import LoadingScreen from '../components/shared/LoadingScreen';
```

2. **Using index files**:
```javascript
import { MatchCard, MessageBubble } from '../components/matches';
import { LoadingScreen } from '../components/shared';
```

3. **Using main index file**:
```javascript
import { 
  MatchCard, 
  LikeCard, 
  ProfileCard, 
  LoadingScreen 
} from '../components';
```

### Benefits

1. **Better Organization**: Components are grouped by their respective screens
2. **Easier Maintenance**: Related components are located together
3. **Improved Imports**: Index files make importing components easier
4. **Scalability**: Easy to add new components to appropriate folders
5. **Code Reusability**: Shared components can be used across multiple screens

## Migration Notes

- Existing auth and app components remain in their current locations
- New components have been extracted from the main screen files
- All components maintain their original functionality
- Index files provide backward compatibility for imports

## Future Considerations

- Consider creating more shared components for common UI patterns
- Add TypeScript definitions for better type safety
- Implement component testing for each component
- Add component documentation with Storybook or similar tools 