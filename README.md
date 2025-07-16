# CUPID - Complete User Platform for Intelligent Dating 🏹

A React Native dating application built with Expo, featuring AI-powered bio generation, intelligent distance filtering, and seamless photo management.

## 📋 Table of Contents

- [Features](#-features)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Environment Setup](#-environment-setup)
- [Features Overview](#-features-overview)
- [API Reference](#-api-reference)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **🤖 AI Bio Generation** - Create engaging bios using Google's Gemini AI
- **📍 Smart Distance Filtering** - Find matches within your preferred radius
- **📸 Photo Management** - Upload and manage profile photos with ease
- **🎯 Interest Matching** - Connect based on shared hobbies and interests
- **💬 Real-time Chat** - Built-in messaging system for matched users
- **🔒 Secure Authentication** - Supabase-powered user management
- **📱 Cross-platform** - Works on iOS, Android, and Web

## 🔧 Prerequisites

- Node.js (v16 or higher)
- React Native development environment
- [Supabase](https://supabase.com) account
- [Google AI Studio](https://makersuite.google.com/app/apikey) API key
- [Google Maps Platform](https://developers.google.com/maps) API key

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd CUPID
   npm install
   ```

2. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   EXPO_PUBLIC_GEMINI_KEY=your_gemini_api_key
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
   ```

3. **Configure Supabase storage**
   ```bash
   npm run setup-storage
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your preferred platform**
   - **iOS Simulator**: Press `i` in the terminal or scan QR code with Expo Go
   - **Android Emulator**: Press `a` in the terminal
   - **Web**: Press `w` in the terminal
   - **Physical Device**: Scan the QR code with Expo Go app

## 🔑 Environment Setup

### Getting API Keys

#### Google AI Studio (Gemini)
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key to your `.env` file

#### Google Maps Platform
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Distance Matrix API
   - Geocoding API
4. Create credentials (API Key)
5. Add the key to your `.env` file

#### Supabase
1. Create a new project at [Supabase](https://supabase.com)
2. Go to Settings > API
3. Copy your project URL and anon key
4. Add them to your `.env` file

## 🎯 Features Overview

### AI Bio Generation

Create compelling dating profiles with AI assistance based on your interests.

**How it works:**
1. Navigate to Profile screen
2. Tap "AI Bio Generator" in the About Me section
3. Select interests from 5 categories:
   - 🏃‍♂️ Sports & Fitness
   - 🎨 Arts & Culture
   - 💻 Technology & Gaming
   - 🌲 Nature & Outdoors
   - 🤝 Social & Lifestyle
4. Generate personalized bio suggestions
5. One-click integration into your profile

**Technical Details:**
- Uses Google Gemini 2.0 Flash model
- Optimized for 150-character limit
- Categorized interest selection
- Network error handling

### Distance Filtering

Find matches within your preferred distance using advanced location services.

**Features:**
- **Residence-based filtering** - Uses Google Maps Distance Matrix API
- **GPS-based calculation** - Precise coordinate-based distance
- **Flexible options** - 5, 10, 25, 50, or 100 miles
- **Smart fallback** - Automatic method switching
- **Real-time updates** - Dynamic distance recalculation

**How to use:**
1. Set your residence in Settings > Edit Profile
2. Go to Everyone tab
3. Tap "Distance Filter" button
4. Choose your preferred distance
5. View filtered results with distance indicators

### Photo Management

Comprehensive photo upload and management system with cloud storage.

**Requirements:**
- Minimum 5 photos for registration
- Maximum 50MB per photo
- Supported formats: JPEG, PNG, WebP
- Automatic 1:1 aspect ratio resizing

**Features:**
- Gallery selection with preview
- Grid layout with numbered indicators
- Individual photo removal
- Upload progress tracking
- Cloud storage integration

**Storage Structure:**
```
Supabase Storage Bucket: users
├── user_id_1/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── ...
└── user_id_2/
    ├── photo1.jpg
    └── ...
```

## 📚 API Reference

### Distance Calculation

```javascript
// Get users within specified distance
getUsersWithinDistance(maxDistance, limit)

// Calculate distance between addresses
calculateAddressDistance(origin, destination)

// Calculate distance using coordinates
calculateDistance(lat1, lon1, lat2, lon2)
```

### Photo Management

```javascript
// Upload user photos
uploadUserPhotos(userId, photos)

// Get user photo URLs
getUserPhotoUrls(userId)

// Delete user photo
deleteUserPhoto(userId, photoName)
```

### AI Bio Generation

```javascript
// Generate bio from interests
generateBioFromInterests(interests)

// Get interest categories
getInterestCategories()
```

## 🛠 Development

### Project Structure

```
CUPID/
├── app/                    # Main application code
│   ├── (tabs)/            # Tab-based navigation
│   ├── components/         # Reusable components
│   └── contexts/          # React contexts
├── lib/                   # Utility libraries
├── assets/                # Static assets
└── android/ & ios/        # Platform-specific code
```

### Available Scripts

```bash
npm start          # Start Expo development server
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
npm run lint       # Run ESLint
npm run setup-storage  # Configure Supabase storage
```

### Development Workflow

1. **File-based routing** - Edit files in the `app` directory
2. **Hot reloading** - Changes reflect immediately
3. **Cross-platform** - Single codebase for iOS, Android, and Web
4. **TypeScript support** - Built-in type checking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

### Expo Documentation
- [Expo Documentation](https://docs.expo.dev/) - Learn fundamentals and advanced topics
- [Expo Tutorial](https://docs.expo.dev/tutorial/introduction/) - Step-by-step guide
- [Expo Router](https://docs.expo.dev/router/introduction/) - File-based routing

### Community
- [Expo GitHub](https://github.com/expo/expo) - Open source platform
- [Expo Discord](https://chat.expo.dev) - Community chat
- [Expo Forums](https://forums.expo.dev/) - Q&A and discussions

---

**Built with ❤️ using Expo and React Native**
