import { View, Text, StyleSheet, Animated, Dimensions, Image, TouchableOpacity, Alert, ScrollView} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { supabase, handleUserLike, getSwipeProfiles } from '../../lib/supabase';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function Swipe() {
  const router = useRouter();
  const [canSwipe, setCanSwipe] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFirstSwipe, setIsFirstSwipe] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);

  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });

  // Opacity for swipe indicators
  const leftOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const rightOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  // Load user's photo count and profiles on component mount
  useEffect(() => {
    loadUserPhotoCount();
    loadProfiles();
  }, []);

  const loadUserPhotoCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // List files in user's storage folder
      const { data: files, error } = await supabase.storage
        .from('users')
        .list(`${user.id}/`, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (error) {
        console.error('Error loading photos:', error);
        setUserPhotoCount(0);
      } else {
        const photoCount = files?.filter(file => file.name.match(/\.(jpg|jpeg|png|webp)$/i)).length || 0;
        setUserPhotoCount(photoCount);
      }
    } catch (error) {
      console.error('Error in loadUserPhotoCount:', error);
      setUserPhotoCount(0);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoadingProfiles(true);
      const fetchedProfiles = await getSwipeProfiles(20); // Get 20 profiles
      setProfiles(fetchedProfiles);
      
      if (fetchedProfiles.length > 0) {
        setCurrentProfile(fetchedProfiles[0]);
        setCurrentProfileIndex(0);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      Alert.alert('Error', 'Failed to load profiles. Please try again.');
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    let timer;
    if (!isFirstSwipe && !canSwipe && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanSwipe(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [canSwipe, timeLeft, isFirstSwipe]);

  const loadNextProfile = () => {
    const nextIndex = currentProfileIndex + 1;
    
    if (nextIndex < profiles.length) {
      setCurrentProfile(profiles[nextIndex]);
      setCurrentProfileIndex(nextIndex);
    } else {
      // No more profiles, reload
      loadProfiles();
    }
  };

  const handleSwipe = async (direction) => {
    if (!canSwipe || !currentProfile) return;
    
    setSwipeDirection(direction);
    
    // Reset timer and disable swiping
    setCanSwipe(false);
    setTimeLeft(10);
    setIsFirstSwipe(false);
    
    // Animate card based on direction
    const toValue = {
      x: direction === 'left' ? -SCREEN_WIDTH * 1.5 : 
         direction === 'right' ? SCREEN_WIDTH * 1.5 : 0,
      y: 0
    };

    Animated.spring(position, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start(() => {
      // Reset position and show new profile
      position.setValue({ x: 0, y: 0 });
      setSwipeDirection(null);
      loadNextProfile();
    });
    
    // Handle the swipe action
    switch (direction) {
      case 'left':
        console.log(`Disliked profile ${currentProfile.id}`);
        // For dislikes, we don't need to do anything in the database
        break;
      case 'right':
        console.log(`Liked profile ${currentProfile.id}`);
        try {
          const result = await handleUserLike(currentProfile.id);
          
          if (result.success) {
            if (result.isMatch) {
              Alert.alert(
                '🎉 It\'s a Match!',
                `You and ${currentProfile.name} have liked each other!`,
                [
                  {
                    text: 'View Match',
                    onPress: () => router.push('/matches')
                  },
                  {
                    text: 'Continue Swiping',
                    style: 'cancel'
                  }
                ]
              );
            }
          }
        } catch (error) {
          console.error('Error handling like:', error);
          Alert.alert('Error', 'Failed to process like. Please try again.');
        }
        break;
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;
      
      // Determine swipe direction based on distance
      const absX = Math.abs(translationX);
      
      if (absX > SWIPE_THRESHOLD) {
        // Horizontal swipe
        const direction = translationX > 0 ? 'right' : 'left';
        handleSwipe(direction);
      } else {
        // Reset position if swipe wasn't long enough
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          tension: 40,
          friction: 7
        }).start();
      }
    }
  };

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate }
    ]
  };

  if (loadingPhotos || loadingProfiles) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (userPhotoCount < 3) {
    return (
      <View style={styles.insufficientPhotosContainer}>
        <Ionicons name="camera-outline" size={80} color="#ccc" />
        <Text style={styles.insufficientPhotosTitle}>Please complete your profile before continuing.</Text>
        <TouchableOpacity   
          style={styles.button}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.buttonText}>Complete Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.noProfilesContainer}>
        <Ionicons name="heart-outline" size={80} color="#ccc" />
        <Text style={styles.noProfilesTitle}>No more profiles to show</Text>
        <Text style={styles.noProfilesText}>Check back later for new people!</Text>
        <TouchableOpacity   
          style={styles.button}
          onPress={loadProfiles}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Swipe Indicators */}
        <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { opacity: leftOpacity }]}>
          <Ionicons name="close-circle" size={60} color="#ff0000" />
          <Text style={[styles.indicatorText, { color: '#ff0000' }]}>DISLIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { opacity: rightOpacity }]}>
          <Ionicons name="heart" size={60} color="hotpink" />
          <Text style={[styles.indicatorText, { color: 'hotpink' }]}>LIKE</Text>
        </Animated.View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={canSwipe}
        >
          <Animated.View style={[styles.profileCard, cardStyle]}>
            <Image source={{ uri: currentProfile.image }} style={styles.profileImage} />
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
                <Text style={styles.bio}>{currentProfile.bio}</Text>
                {currentProfile.interests && currentProfile.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <View style={styles.interestsList}>
                      {currentProfile.interests.map((interest, index) => (
                        <Text key={index} style={styles.interestTag}>{interest}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {!canSwipe && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>Next swipe in {timeLeft}s</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  leftIndicator: {
    left: 20,
  },
  rightIndicator: {
    right: 20,
  },
  indicatorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    height: 450,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  scrollContainer: {
    flex: 1,
  },
  profileInfo: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  interestsContainer: {
    width: '100%',
    marginTop: 10,
  },
  interestsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  interestTag: {
    fontSize: 12,
    color: 'hotpink',
    backgroundColor: '#ffe6f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerContainer: {
    alignItems: 'center',
    backgroundColor: 'pink',
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
  },
  timerText: {
    fontSize: 16,
    color: 'red',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insufficientPhotosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insufficientPhotosTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noProfilesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  noProfilesText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'hotpink',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  matchingInterestsContainer: {
    width: '100%',
    marginTop: 10,
  },
  matchingInterestsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
    color: '#333',
  },
  matchingInterestTag: {
    backgroundColor: '#ffd700',
    color: '#333',
  },
  debugButton: {
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
}); 

