import { View, Text, StyleSheet, Animated, Dimensions, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { handleUserLike, updateGeolocationAndFetchProfiles, getSwipeProfiles, getUsersWithinDistance } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useProfile } from '../contexts/ProfileContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function Feed() {
  const router = useRouter();
  const { user, profile, photos, hasCompletedProfile, getPhotoCount, updateProfile, loading } = useProfile();
  const [canSwipe, setCanSwipe] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFirstSwipe, setIsFirstSwipe] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [photoLoadingError, setPhotoLoadingError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [swipeCount, setSwipeCount] = useState(0);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState(50);
  const [isDistanceFilterActive, setIsDistanceFilterActive] = useState(false);
  const [nextProfileReady, setNextProfileReady] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState({});

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
    loadProfiles(false); // Don't update location on initial load since it's done in ProfileContext
  }, []);

  const loadProfiles = async (shouldUpdateLocation = false) => {
    try {
      setLoadingProfiles(true);
      setPhotoLoadingError(false);
      setImageLoadingStates({}); // Reset image loading states
      
      console.log(`🔄 Loading profiles with location update: ${shouldUpdateLocation}`);
      let fetchedProfiles;
      
      if (isDistanceFilterActive) {
        console.log(`📍 Loading profiles within ${distanceFilter} miles using distance filtering`);
        try {
          fetchedProfiles = await getUsersWithinDistance(distanceFilter, 10);
          if (fetchedProfiles.length === 0) {
                      Alert.alert(
            'No Users Found',
            `No users found within ${distanceFilter} miles. Try increasing the distance or check your location settings.`,
            [
              { text: 'Clear Filter', onPress: clearDistanceFilter },
              { text: 'OK', style: 'cancel' }
            ]
          );
          }
        } catch (distanceError) {
          console.error('Distance filter error:', distanceError);
          Alert.alert(
            'Distance Filter Error',
            'Unable to filter by distance. Please check your location settings in your profile.',
            [
              { text: 'Clear Filter', onPress: clearDistanceFilter },
              { text: 'OK', style: 'cancel' }
            ]
          );
          return;
        }
      } else {
        fetchedProfiles = shouldUpdateLocation 
          ? await updateGeolocationAndFetchProfiles(10)
          : await getSwipeProfiles(10);
      }
      
      setProfiles(fetchedProfiles);
      
      if (fetchedProfiles.length > 0) {
        setCurrentProfile(fetchedProfiles[0]);
        setCurrentProfileIndex(0);
        setCurrentPhotoIndex(0);
        // Reset swipe count when loading new profiles
        setSwipeCount(0);
        setNextProfileReady(fetchedProfiles.length > 1); // Next profile ready if there's more than one
        console.log('🔄 Swipe count reset to 0');
      }
      
      console.log(`✅ Loaded ${fetchedProfiles.length} new profiles`);
    } catch (error) {
      console.error('Error loading profiles:', error);
      if (error.message?.includes('photo') || error.message?.includes('storage')) {
        setPhotoLoadingError(true);
        Alert.alert('Photo Loading Error', 'Some photos may not display properly. Please try again later.');
      } else if (error.message?.includes('residence')) {
        Alert.alert('Location Required', 'Please set your residence in settings to use distance filtering.');
      } else {
        Alert.alert('Error', 'Failed to load profiles. Please try again.');
      }
    } finally {
      setLoadingProfiles(false);
    }
  };

  const toggleDistanceFilter = () => {
    setShowDistanceFilter(!showDistanceFilter);
  };

  const applyDistanceFilter = (distance) => {
    setDistanceFilter(distance);
    setIsDistanceFilterActive(true);
    setShowDistanceFilter(false);
    loadProfiles(false);
  };

  const clearDistanceFilter = () => {
    setIsDistanceFilterActive(false);
    setShowDistanceFilter(false);
    loadProfiles(false);
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
      setCurrentPhotoIndex(0); // Reset photo index for new profile
      setImageLoadingStates({}); // Reset image loading states for new profile
      setNextProfileReady(true); // Next profile is ready
    } else {
      // No more profiles, check if we need to update geolocation
      const shouldUpdateLocation = swipeCount >= 10;
      console.log(`🔄 Reached end of current profiles, loading new batch with location update: ${shouldUpdateLocation}`);
      loadProfiles(shouldUpdateLocation);
      setNextProfileReady(false); // No next profile ready while loading
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
        // Disliked profile
        // For dislikes, we don't need to do anything in the database
        break;
      case 'right':
        // Liked profile
        try {
          const result = await handleUserLike(currentProfile.id);
          
          if (result.success) {
            if (result.isMatch) {
              Alert.alert(
                'It\'s a Match! 🎉 ',
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

    // Increment swipe count
    setSwipeCount(prevCount => {
      const newCount = prevCount + 1;
      console.log(`📊 Swipe count: ${newCount}/10`);
      
      // If we've reached 10 swipes, the next profile load will update geolocation
      if (newCount === 10) {
        console.log('🎯 Reached 10 swipes - next profile load will update geolocation');
      }
      
      return newCount;
    });
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

  if (loadingProfiles) {
    return (
      <View style={styles.loadingContainer}>
        <LottieView
          source={require('../../assets/animations/heart.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
          speed={1}
        />
      </View>
    );
  }

  if (user && !loading && !hasCompletedProfile()) {
    return (
      <View style={styles.incompleteProfileContainer}>
        <Ionicons name="camera-outline" size={80} color="#ccc" />
        <Text style={styles.insufficientPhotosTitle}>Please complete your profile before continuing.</Text>
        <TouchableOpacity   
          style={styles.button}
          onPress={() => router.push('/settings')}
        >
          <Text style={styles.buttonText}>Complete Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.noProfilesContainer}>
        <Ionicons name="heart-outline" size={80} color="white" />
        <Text style={styles.noProfilesTitle}>That's everyone!</Text>
        <TouchableOpacity   
          style={styles.button}
          onPress={() => loadProfiles(false)}
        >
          <Ionicons name="refresh" size={60} color="white" />
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
            {/* Photo Carousel */}
            <View style={styles.photoCarouselContainer}>
              {currentProfile.images && currentProfile.images.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={(event) => {
                      const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                      setCurrentPhotoIndex(slideIndex);
                    }}
                    style={styles.photoScrollView}
                  >
                    {currentProfile.images.map((image, index) => (
                      <View key={index} style={styles.photoSlide}>
                        <Image 
                          source={{ uri: image }} 
                          style={styles.profileImage}
                          resizeMode="cover"
                          onLoadStart={() => {
                            setImageLoadingStates(prev => ({
                              ...prev,
                              [`${currentProfile.id}-${index}`]: true
                            }));
                          }}
                          onLoad={() => {
                            setImageLoadingStates(prev => ({
                              ...prev,
                              [`${currentProfile.id}-${index}`]: false
                            }));
                            setPhotoLoadingError(false);
                          }}
                          onError={() => {
                            console.log('Failed to load image for profile:', currentProfile.id, 'photo:', index);
                            setImageLoadingStates(prev => ({
                              ...prev,
                              [`${currentProfile.id}-${index}`]: false
                            }));
                            setPhotoLoadingError(true);
                          }}
                        />
                        {imageLoadingStates[`${currentProfile.id}-${index}`] && (
                          <View style={styles.imageLoader}>
                            <ActivityIndicator size="large" color="hotpink" />
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  
                  {/* Photo Dots Indicator */}
                  {currentProfile.images.length > 1 && (
                    <View style={styles.dotsContainer}>
                      {currentProfile.images.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dot,
                            index === currentPhotoIndex && styles.activeDot
                          ]}
                        />
                      ))}
                    </View>
                  )}
                  
                  {/* Photo Counter */}
                  {currentProfile.images.length > 1 && (
                    <View style={styles.photoCounter}>
                      <Text style={styles.photoCounterText}>
                        {currentPhotoIndex + 1} / {currentProfile.images.length}
                      </Text>
                    </View>
                  )}
                </>
              ) : currentProfile.image ? (
                // Fallback for single image
                <View style={styles.photoSlide}>
                  <Image 
                    source={{ uri: currentProfile.image }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onLoadStart={() => {
                      setImageLoadingStates(prev => ({
                        ...prev,
                        [`${currentProfile.id}-single`]: true
                      }));
                    }}
                    onLoad={() => {
                      setImageLoadingStates(prev => ({
                        ...prev,
                        [`${currentProfile.id}-single`]: false
                      }));
                      setPhotoLoadingError(false);
                    }}
                    onError={() => {
                      console.log('Failed to load image for profile:', currentProfile.id);
                      setImageLoadingStates(prev => ({
                        ...prev,
                        [`${currentProfile.id}-single`]: false
                      }));
                      setPhotoLoadingError(true);
                    }}
                  />
                  {imageLoadingStates[`${currentProfile.id}-single`] && (
                    <View style={styles.imageLoader}>
                      <ActivityIndicator size="large" color="hotpink" />
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={80} color="#ccc" />
                  <Text style={styles.placeholderText}>No Photo Available</Text>
                </View>
              )}
            </View>
            
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={styles.profileInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{currentProfile.name}</Text>
                </View>
                <View style={styles.locationRow}>
                  <View style={styles.ageContainer}>
                    <Text style={styles.ageText}>{currentProfile.age}</Text>
                  </View>
                  {isDistanceFilterActive && currentProfile.distance !== null && (
                    <View style={styles.distanceContainer}>
                      <Ionicons name="location" size={16} color="hotpink" />
                      <Text style={styles.distanceText}>{currentProfile.distance} miles away</Text>
                    </View>
                  )}
                  {currentProfile.residence && !isDistanceFilterActive && (
                    <View style={styles.residenceContainer}>
                      <Ionicons name="location" size={16} color="hotpink" />
                      <Text style={styles.residenceText}>{currentProfile.residence}</Text>
                    </View>
                  )}
                </View>
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
      {!canSwipe && nextProfileReady && (
        <View style={styles.timerContainer}>
          <LottieView
            source={require('../../assets/animations/hourglass.json')}
            autoPlay
            loop
            style={styles.hourglassAnimation}
            speed={1}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hotpink',
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: 'hotpink',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  filterButtonActive: {
    backgroundColor: 'hotpink',
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: 'hotpink',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  clearFilterButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  filterContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  distanceOptions: {
    width: '100%',
    marginBottom: 20,
  },
  distanceOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  distanceOptionActive: {
    backgroundColor: 'hotpink',
  },
  distanceOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  distanceOptionTextActive: {
    color: 'white',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 30,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    height: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  photoCarouselContainer: {
    position: 'relative',
    height: 300,
    marginBottom: 15,
  },
  photoScrollView: {
    height: 300,
  },
  photoSlide: {
    width: SCREEN_WIDTH - 80, // Account for container padding (20) + card padding (20) on each side
    height: 300,
  },
  profileImage: {
    width: '100%',
    height: 300,
    borderRadius: 10,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  photoCounter: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCounterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  profileInfo: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 10,
  },
  residenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  residenceText: {
    fontSize: 12,
    color: 'hotpink',
    marginLeft: 4,
  },
  ageContainer: {
    backgroundColor: '#ffe6f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageText: {
    fontSize: 12,
    color: 'hotpink'
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
    height: 100,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  incompleteProfileContainer: {
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
  insufficientPhotosSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  noProfilesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'hotpink',
  },
  noProfilesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: 'white',
  },
  noProfilesText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'hotpink',
    borderRadius: 10,
    padding: 10,
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
  profileImagePlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 10,
  },
  photoErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  photoErrorText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 5,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe6f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: 'hotpink',
    marginLeft: 4,
  },
  timerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourglassAnimation: {
    width: 50,
    height: 50
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 200, 200, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
});

