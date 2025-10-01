# CUPID - Cognitive User Platform Innovating Dating 🏹

A modern, feature-rich dating app built with Expo and React Native that revolutionizes the dating experience through intelligent matching, real-time messaging, and comprehensive analytics.

## 🌟 Features

### 🔐 Authentication & Security
- **Multi-method Authentication**: Email/password and phone number login
- **User Verification**: Email and phone verification system
- **Content Moderation**: AI-powered message filtering and user safety features
- **Strike System**: User accountability with strike tracking and ban prevention

### 💕 Core Dating Features
- **Smart Swiping**: Intuitive swipe-based profile discovery with gesture controls
- **Profile Management**: Comprehensive profile setup with photos, bio, interests, and preferences
- **Location-Based Matching**: GPS-enabled proximity matching with distance filters
- **Like System**: Send and receive likes with real-time notifications
- **Match Creation**: Automatic match creation when mutual likes occur

### 💬 Advanced Messaging
- **Real-time Chat**: Instant messaging with live message updates
- **AI Conversation Tips**: Gemini-powered conversation suggestions
- **Message Management**: Delete messages with confirmation
- **Content Moderation**: Automatic detection of inappropriate content
- **Date Planning**: Built-in venue suggestions and date coordination

### 📊 Analytics & Insights
- **Performance Tracking**: Detailed analytics on likes, matches, and engagement
- **Visual Charts**: Interactive charts showing dating activity over time
- **Match Rate Analysis**: Success metrics and optimization insights
- **Customizable Timeframes**: 1-365 day analytics range with slider control

### ⚙️ Personalization
- **Interest Categories**: 25+ interest categories with 100+ specific interests
- **Age Range Preferences**: Customizable age filtering
- **Distance Settings**: Location-based matching radius control
- **Sex Preferences**: Flexible gender preference options
- **Profile Customization**: Photo management, bio editing, and personal details

## 🛠️ Tech Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **Expo Router**: File-based navigation system
- **React Native Gesture Handler**: Advanced gesture recognition
- **React Native Reanimated**: Smooth animations and transitions
- **Lottie**: Beautiful animations and micro-interactions

### Backend & Database
- **Supabase**: Backend-as-a-Service with PostgreSQL
- **Real-time Subscriptions**: Live data updates
- **Row Level Security**: Database-level security policies
- **Geolocation Services**: Location-based queries and filtering

### AI & External Services
- **Google Gemini**: AI-powered conversation tips and content moderation
- **Firebase Auth**: Additional authentication services
- **Google Sign-In**: Social authentication option

### UI/UX Libraries
- **React Native Paper**: Material Design components
- **Expo Vector Icons**: Comprehensive icon library
- **React Native Chart Kit**: Data visualization
- **React Native Picker**: Native picker components

## 📱 App Structure

```
app/
├── (tabs)/                 # Main app screens
│   ├── feed.jsx           # Swipe interface
│   ├── likes.jsx          # Received likes management
│   ├── matches.jsx        # Chat and match management
│   ├── analytics.jsx      # Performance analytics
│   └── settings.jsx       # User preferences
├── components/            # Reusable components
│   ├── auth/             # Authentication components
│   ├── feed/             # Swipe interface components
│   ├── likes/            # Likes management components
│   ├── matches/          # Chat and match components
│   └── settings/         # Settings and preferences
├── contexts/             # React contexts
└── auth.jsx              # Authentication flow
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CUPID
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_KEY=your_supabase_anon_public_key

   # Google Gemini AI
   EXPO_PUBLIC_GEMINI_KEY=your_google_gemini_api_key

   # Google Maps API
   EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key
   ```

   ### Environment Variables Explained:

   | Variable | Description | Where to Get It |
   |----------|-------------|-----------------|
   | `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
   | `EXPO_PUBLIC_SUPABASE_KEY` | Supabase anonymous public key | Supabase Dashboard → Settings → API |
   | `EXPO_PUBLIC_GEMINI_KEY` | Google Gemini API key for AI features | Google AI Studio → Get API Key |
   | `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps API key for location services | Google Cloud Console → APIs & Services → Credentials |

4. **Database Setup**
   - Set up a Supabase project
   - Run the SQL schema from `schema.sql`
   - Configure Row Level Security policies

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

## 🗄️ Database Schema

The app uses PostgreSQL with the following main tables:

- **users**: User accounts and authentication
- **profiles**: User profile information and preferences
- **personal**: Personal details (name, age, sex)
- **likes**: Like relationships between users
- **matches**: Mutual matches between users
- **messages**: Chat messages between matched users
- **dates**: Planned dates and venue information

## 🔧 Configuration

### Supabase Setup
1. Create a new Supabase project
2. Enable Row Level Security
3. Set up authentication providers
4. Configure real-time subscriptions
5. Set up storage buckets for profile photos

### Google Gemini Integration
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create a new project or use existing one
3. Generate an API key
4. Add `EXPO_PUBLIC_GEMINI_KEY` to your `.env` file
5. Configure content moderation settings in the app

### Google Maps Integration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Time Zone API
4. Create credentials (API Key)
5. Add `EXPO_PUBLIC_GOOGLE_MAPS_KEY` to your `.env` file
6. Restrict the API key to your app's bundle identifier for security

### Location Services
- iOS: Add location permissions to `Info.plist`
- Android: Add location permissions to `AndroidManifest.xml`

## 📱 Features in Detail

### Swipe Interface
- **Gesture Recognition**: Pan gestures for swiping left/right
- **Visual Feedback**: Card rotation and movement animations
- **Timer System**: 10-second viewing timer for thoughtful decisions
- **Photo Carousel**: Multiple photos per profile with swipe navigation
- **Distance Filtering**: Location-based profile filtering

### Messaging System
- **Real-time Updates**: Live message synchronization
- **Message Moderation**: AI-powered content filtering
- **Conversation Tips**: AI-generated conversation starters
- **Date Planning**: Built-in venue suggestions and coordination
- **Message Management**: Delete and manage conversation history

### Analytics Dashboard
- **Engagement Metrics**: Likes given/received, match rates
- **Time-based Analysis**: Activity trends over customizable periods
- **Visual Charts**: Interactive line charts and summary cards
- **Performance Insights**: Success rate analysis and optimization tips

## 🎨 Design Philosophy

CUPID follows a modern, pink-themed design with:
- **Intuitive Navigation**: Tab-based navigation with clear visual hierarchy
- **Smooth Animations**: Lottie animations and gesture-based interactions
- **Accessibility**: High contrast colors and readable typography
- **Responsive Design**: Optimized for various screen sizes

## 🔒 Security & Privacy

- **Data Encryption**: All sensitive data encrypted in transit and at rest
- **Content Moderation**: AI-powered inappropriate content detection
- **User Safety**: Strike system and ban prevention
- **Privacy Controls**: Granular privacy settings and data management
- **Location Privacy**: Optional location sharing with user control

## 🚀 Deployment

### EAS Build
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

### App Store Deployment
1. Configure app metadata in `app.json`
2. Build production version with EAS
3. Submit to App Store Connect
4. Configure TestFlight for beta testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team**: For the amazing development platform
- **Supabase**: For the powerful backend infrastructure
- **Google Gemini**: For AI-powered features
- **React Native Community**: For the extensive ecosystem

## 📞 Support

For support, email support@cupidapp.com or join our Discord community.

---

**CUPID** - Where cognitive technology meets the art of connection. 🏹💕
