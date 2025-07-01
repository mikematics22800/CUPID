# Profile Context Documentation

## Overview

The `ProfileContext` provides a centralized way to manage and share user profile data across all tabs in the CUPID app. This context eliminates the need to duplicate profile loading logic and ensures consistent profile data throughout the application.

## Setup

The `ProfileProvider` is already wrapped around the tabs layout in `app/(tabs)/_layout.jsx`, so all tab screens automatically have access to the profile context.

## Usage

### Import the hook

```javascript
import { useProfile } from '../contexts/ProfileContext';
```

### Access profile data in any tab

```javascript
export default function SomeTabScreen() {
  const { 
    user,           // Current authenticated user
    profile,        // User's profile data from database
    loading,        // Loading state
    refreshing,     // Refresh state
    photos,         // User's photos array
    bio,           // User's bio
    interests,     // User's interests array
  } = useProfile();

  // Your component logic here
}
```

### Available Actions

```javascript
const {
  // State
  user,
  profile,
  loading,
  refreshing,
  photos,
  bio,
  interests,
  
  // Actions
  loadUserProfile,    // Manually reload profile data
  refreshProfile,     // Refresh profile data with loading state
  updateProfile,      // Update profile in database
  updatePhotos,       // Update photos array
  removePhoto,        // Remove a specific photo
  hasEnoughPhotos,    // Check if user has 3+ photos
  hasBio,            // Check if user has a bio
  hasCompletedProfile, // Check if user has completed profile (photos + bio)
  getPhotoCount,      // Get current photo count
  
  // Setters for form state
  setBio,
  setInterests,
  setPhotos,
} = useProfile();
```

## Examples

### Example 1: Profile Screen

```javascript
import { useProfile } from '../contexts/ProfileContext';

export default function ProfileScreen() {
  const { 
    user, 
    profile, 
    loading, 
    photos, 
    bio, 
    interests, 
    setBio, 
    setInterests, 
    setPhotos,
    updateProfile,
    removePhoto,
    hasEnoughPhotos
  } = useProfile();

  const handleSave = async () => {
    if (!hasEnoughPhotos()) {
      Alert.alert('Not Enough Photos', 'Please upload at least 3 photos.');
      return;
    }

    if (!hasBio()) {
      Alert.alert('Missing Bio', 'Please add a bio to save your profile.');
      return;
    }

    const success = await updateProfile({
      bio: bio,
      interests: interests,
      images: photos.map(p => p.uri).filter(uri => uri.startsWith('http'))
    });

    if (success) {
      Alert.alert('Success', 'Profile updated!');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View>
      <Text>Name: {profile?.name}</Text>
      <Text>Bio: {bio}</Text>
      <Text>Photo Count: {photos.length}</Text>
      {/* Your form components */}
    </View>
  );
}
```

### Example 2: Swipe Screen

```javascript
import { useProfile } from '../contexts/ProfileContext';

export default function SwipeScreen() {
  const { user, profile, photos, hasCompletedProfile } = useProfile();

  useEffect(() => {
    if (!hasCompletedProfile()) {
      Alert.alert(
        'Complete Your Profile', 
        'Please add at least 3 photos and a bio to start swiping!'
      );
      router.push('/profile');
    }
  }, [hasCompletedProfile]);

  // Your swipe logic here
}
```

### Example 3: Settings Screen

```javascript
import { useProfile } from '../contexts/ProfileContext';

export default function SettingsScreen() {
  const { user, profile, refreshProfile } = useProfile();

  const handleRefresh = async () => {
    await refreshProfile();
    Alert.alert('Success', 'Profile refreshed!');
  };

  return (
    <View>
      <Text>Email: {user?.email}</Text>
      <Text>Member since: {new Date(user?.created_at).toLocaleDateString()}</Text>
      <Button title="Refresh Profile" onPress={handleRefresh} />
    </View>
  );
}
```

## Benefits

1. **Centralized State Management**: All profile data is managed in one place
2. **Automatic Loading**: Profile data is loaded automatically when the app starts
3. **Real-time Updates**: Changes to profile data are reflected across all tabs
4. **Reduced Code Duplication**: No need to duplicate profile loading logic
5. **Consistent Data**: All tabs always have the latest profile information
6. **Easy Testing**: Profile data can be easily mocked for testing

## Profile Data Structure

The profile context manages the following data:

```javascript
{
  user: {
    id: string,
    email: string,
    created_at: string,
    // ... other auth user properties
  },
  profile: {
    id: string,
    name: string,
    bio: string,
    interests: string[],
    birthday: string,
    sex: string,
    email: string,
    phone: string,
    images: string[]
  },
  photos: [
    {
      id: string,
      uri: string,
      isExisting: boolean,
      fileName: string
    }
  ],
  bio: string,
  interests: string[]
}
```

## Error Handling

The context includes built-in error handling:

- Authentication errors redirect to auth screen
- Database errors are logged but don't crash the app
- Photo loading errors are handled gracefully
- Network errors are handled with retry logic

## Performance Considerations

- Profile data is loaded once and cached
- Photos are loaded efficiently from both database and storage
- Real-time updates are optimized to prevent unnecessary re-renders
- Loading states prevent UI flickering 