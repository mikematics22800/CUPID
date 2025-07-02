# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables

   Create a `.env` file in the root directory with your Supabase credentials and Gemini API key:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
   ```

   **To get your Gemini API key:**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key and paste it in your `.env` file

3. Set up Supabase storage for photo uploads

   ```bash
   npm run setup-storage
   ```

4. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Photo Upload Feature

The app now requires users to upload at least 5 photos before they can register. Here's how it works:

### Features:
- **Photo Selection**: Users can select photos from their device gallery
- **Photo Preview**: Selected photos are displayed in a grid with numbered indicators
- **Photo Removal**: Users can remove individual photos by tapping the X button
- **Photo Counter**: Shows current photo count (X/5) with a warning if less than 5
- **Upload Progress**: Shows "Uploading Photos..." during the registration process
- **Storage Integration**: Photos are uploaded to Supabase storage and URLs are stored in the user profile

### Technical Details:
- Photos are stored in Supabase storage bucket `users`
- Each user gets their own folder: `users/{user_id}/`
- Photos are automatically resized to 1:1 aspect ratio for consistency
- Maximum file size: 50MB per photo
- Supported formats: JPEG, PNG, WebP
- Photo URLs are generated dynamically from storage, not stored in database

### Database Schema:
The `users` table should contain basic profile information (name, bio, birthday, etc.) but does not need a `photos` column since photos are managed entirely through Supabase storage.

## AI Bio Generation Feature

The app now includes an AI-powered bio generation feature that helps users create engaging dating app bios based on their interests and hobbies.

### Features:
- **Interest Selection**: Users can select from 5 categories of interests and hobbies:
  - Sports & Fitness (Running, Gym, Yoga, etc.)
  - Arts & Culture (Photography, Music, Travel, etc.)
  - Technology & Gaming (Programming, Gaming, AI/ML, etc.)
  - Nature & Outdoors (Camping, Hiking, Gardening, etc.)
  - Social & Lifestyle (Networking, Volunteering, Foodie, etc.)
- **Multi-Selection**: Users can select multiple interests across different categories
- **AI Bio Generation**: Uses Google's Gemini AI to generate personalized bio suggestions
- **Character Limit**: Generated bios are kept under 150 characters for optimal dating app performance
- **One-Click Integration**: Generated bios are automatically added to the bio text field

### How to Use:
1. Navigate to the Profile screen
2. Tap the "AI Bio Generator" button in the About Me section
3. Select your interests and hobbies from the available categories
4. Tap "Generate Bio Suggestion"
5. The AI will create a personalized bio based on your selections
6. The generated bio will be automatically added to your bio text field

### Technical Details:
- Uses Google's Gemini 2.0 Flash model via direct API calls for React Native compatibility
- Interests are categorized for better organization and user experience
- The AI prompt is optimized for dating app context and character limits
- Error handling includes network connectivity checks and user-friendly error messages

## Distance Filtering Feature

### Features:
- **Residence-based Distance**: Filter users by distance from your residence using Google Maps Distance Matrix API
- **GPS-based Distance**: Calculate distances using precise GPS coordinates when available
- **Flexible Distance Options**: Choose from 5, 10, 25, 50, or 100 miles
- **Smart Fallback**: Automatically falls back to residence comparison if distance calculation fails
- **Visual Distance Display**: See exact distances when using distance filters

### How Distance Filtering Works
1. **Primary Method**: Uses Google Maps Distance Matrix API to calculate driving distance between residences
2. **Secondary Method**: Uses GPS coordinates with Haversine formula for precise distance calculation
3. **Fallback Method**: Compares residence strings for exact matches (0 miles)
4. **User Experience**: Shows distance in miles on profile cards when filter is active

### Technical Implementation
- **Google Maps Integration**: Distance Matrix API for accurate address-based distance calculation
- **Geolocation Support**: GPS coordinates for precise location-based matching
- **Residence Storage**: Stores user residence as formatted address strings
- **Distance Preferences**: User-configurable maximum distance settings
- **Real-time Updates**: Automatic distance recalculation when location changes

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native development environment
- Supabase account
- Google Maps API key

### Environment Variables
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
```

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run the app: `npx expo start`

## Usage

### Distance Filtering
1. Set your residence in Settings > Edit Profile
2. Go to the Everyone tab
3. Tap the "Distance Filter" button
4. Choose your desired distance (5-100 miles)
5. View users within that distance from your residence
6. Clear the filter anytime to see all users

### Location Sharing
- Enable location sharing for more accurate distance calculations
- Residence setting works as a fallback when GPS is unavailable
- Both methods provide distance-based user filtering

## API Endpoints

### Distance Calculation
- `getUsersWithinDistance(maxDistance, limit)`: Get users within specified distance
- `calculateAddressDistance(origin, destination)`: Calculate distance between addresses
- `calculateDistance(lat1, lon1, lat2, lon2)`: Calculate distance using coordinates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
