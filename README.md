# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Set up environment variables

   Create a `.env` file in the root directory with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

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

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
