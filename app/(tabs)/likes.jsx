import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { getUsersWhoLikedMe, handleUserLike, discardLike, markLikesAsViewed, getCurrentLocationAndresidence } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import { useProfile } from '../contexts/ProfileContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function LikesScreen() {
  const { updateProfile } = useProfile();
  const [likes, setLikes] = useState([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);
  const [currentLikeIndex, setCurrentLikeIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  const fetchLikes = async () => {
    try {
      setLoading(true);
      // Starting to fetch likes
      
      const likesData = await getUsersWhoLikedMe();
              // Likes data received
      
      setLikes(likesData);
      if (likesData.length > 0) {
        setCurrentLikeIndex(0);
        setCurrentPhotoIndex(0);
      } else {
        setCurrentLikeIndex(-1);
        setCurrentPhotoIndex(0);
      }
              // Successfully loaded likes

    } catch (error) {
      console.error('❌ Error in fetchLikes:', error);
      Alert.alert('Error', 'Failed to load likes. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Mark likes as viewed when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const markAsViewed = async () => {
        try {
          await markLikesAsViewed();
          // Likes marked as viewed
        } catch (error) {
          console.error('❌ Error marking likes as viewed:', error);
        }
      };
      
      markAsViewed();
    }, [])
  );

  useEffect(() => {
    fetchLikes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLikes();
  };

  const handleSwipe = async (direction) => {
    if (!likes[currentLikeIndex] || currentLikeIndex < 0 || currentLikeIndex >= likes.length) {
              // No valid like to process
      return;
    }
    
    const currentLike = likes[currentLikeIndex];
    
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
      // Reset position and show next like
      position.setValue({ x: 0, y: 0 });
      loadNextLike();
    });
    
    // Handle the swipe action
    switch (direction) {
      case 'left':
        // Passed on like
        try {
          setProcessingAction(currentLike.id);
          const result = await discardLike(currentLike.id);
          
          if (result.success) {
            // Remove from likes list
            setLikes(prevLikes => prevLikes.filter(like => like.id !== currentLike.id));
            
            if (!result.alreadyDiscarded) {
              Alert.alert('Passed', 'You passed on this like.');
            }
          }
        } catch (error) {
          console.error('❌ Error discarding like:', error);
          Alert.alert('Error', 'Failed to discard like. Please try again.');
        } finally {
          setProcessingAction(null);
        }
        break;
      case 'right':
                  // Liked back
        try {
          setProcessingAction(currentLike.id);
          const result = await handleUserLike(currentLike.id);
          
          if (result.success) {
            if (result.isMatch) {
              // Remove from likes list immediately since they're now a match
              setLikes(prevLikes => prevLikes.filter(like => like.id !== currentLike.id));
              
              Alert.alert(
                '🎉 It\'s a Match!',
                'You and this person have liked each other! They\'ll now appear in your matches.',
                [
                  {
                    text: 'View Matches',
                    onPress: () => {
                      // Navigate to matches tab
                      // You could add navigation here if needed
                    }
                  },
                  {
                    text: 'Continue',
                    style: 'cancel'
                  }
                ]
              );
            } else {
              // Remove from likes list since they're no longer just a "like"
              setLikes(prevLikes => prevLikes.filter(like => like.id !== currentLike.id));
              Alert.alert('Success', 'You liked them back!');
            }
          }
        } catch (error) {
          console.error('❌ Error liking back:', error);
          Alert.alert('Error', 'Failed to like back. Please try again.');
        } finally {
          setProcessingAction(null);
        }
        break;
    }

    // Increment swipe count and check for geolocation tracking
    setSwipeCount(prevCount => {
      const newCount = prevCount + 1;
      
      // Track geolocation every 10 swipes
      if (newCount % 10 === 0) {
        (async () => {
          try {
            console.log(`📍 Tracking geolocation after ${newCount} swipes (likes screen)`);
            const location = await getCurrentLocationAndresidence();
            if (location) {
              console.log('✅ Geolocation updated:', location.geolocation);
              // Update user's geolocation in database
              await updateProfile({ geolocation: location.geolocation });
            } else {
              console.log('⚠️ No location data available');
            }
          } catch (error) {
            console.error('❌ Error tracking geolocation:', error);
          }
        })();
      }
      
      return newCount;
    });
  };

  const loadNextLike = () => {
    const nextIndex = currentLikeIndex + 1;
    
    if (nextIndex < likes.length && likes.length > 0) {
      setCurrentLikeIndex(nextIndex);
      setCurrentPhotoIndex(0); // Reset photo index for new like
    } else {
      // No more likes, show empty state
      setCurrentLikeIndex(-1);
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

  if (loading) {
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

  if (likes.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="heart-outline" size={80} color="#ccc" />
        <Text style={styles.emptyStateTitle}>No likes yet</Text>
        <Text style={styles.emptyStateText}>
          This could be because:
          {'\n'}• No users within your distance preference have liked you
          {'\n'}• Keep swiping to increase your chances!
          {'\n'}• Check back later for new likes
        </Text>
        <TouchableOpacity   
          style={styles.button}
          onPress={onRefresh}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentLikeIndex >= likes.length || currentLikeIndex < 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color="hotpink" />
          <Text style={styles.emptyTitle}>No more likes</Text>
          <Text style={styles.emptySubtitle}>You've gone through all your likes!</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={60} color="hotpink" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentLike = likes[currentLikeIndex];
  
  // Additional safety check
  if (!currentLike) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={80} color="hotpink" />
          <Text style={styles.emptyTitle}>No likes available</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={60} color="hotpink" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Swipe Indicators */}
        <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { opacity: leftOpacity }]}>
          <Ionicons name="close-circle" size={60} color="#ff0000" />
          <Text style={[styles.indicatorText, { color: '#ff0000' }]}>PASS</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { opacity: rightOpacity }]}>
          <Ionicons name="heart" size={60} color="hotpink" />
          <Text style={[styles.indicatorText, { color: 'hotpink' }]}>LIKE</Text>
        </Animated.View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={!processingAction}
        >
          <Animated.View style={[styles.likeCard, cardStyle]}>
            {/* Photo Carousel */}
            <View style={styles.photoCarouselContainer}>
              {currentLike.images && currentLike.images.length > 0 ? (
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
                    {currentLike.images.map((image, index) => (
                      <View key={index} style={styles.photoSlide}>
                        <Image 
                          source={{ uri: image }} 
                          style={styles.profileImage}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Failed to load image for like:', currentLike.id, 'photo:', index);
                          }}
                        />
                      </View>
                    ))}
                  </ScrollView>
                  
                  {/* Photo Dots Indicator */}
                  {currentLike.images.length > 1 && (
                    <View style={styles.dotsContainer}>
                      {currentLike.images.map((_, index) => (
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
                  {currentLike.images.length > 1 && (
                    <View style={styles.photoCounter}>
                      <Text style={styles.photoCounterText}>
                        {currentPhotoIndex + 1} / {currentLike.images.length}
                      </Text>
                    </View>
                  )}
                </>
              ) : currentLike.image ? (
                // Fallback for single image
                <Image 
                  source={{ uri: currentLike.image }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Failed to load image for like:', currentLike.id);
                  }}
                />
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
              nestedScrollEnabled={true}
            >
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{currentLike.name}, {currentLike.age}</Text>
                <Text style={styles.bio}>{currentLike.bio}</Text>
                {currentLike.interests && currentLike.interests.length > 0 && (
                  <View style={styles.interestsContainer}>
                    <View style={styles.interestsList}>
                      {currentLike.interests.map((interest, index) => (
                        <Text key={index} style={styles.interestTag}>{interest}</Text>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.locationRow}>
                  <View style={styles.ageContainer}>
                    <Text style={styles.ageText}>{currentLike.age}</Text>
                  </View>
                  {currentLike.distance !== null && (
                    <View style={styles.distanceContainer}>
                      <Ionicons name="location" size={16} color="hotpink" />
                      <Text style={styles.distanceText}>{currentLike.distance} miles away</Text>
                    </View>
                  )}
                  {currentLike.residence && !currentLike.distance && (
                    <View style={styles.residenceContainer}>
                      <Ionicons name="location" size={16} color="hotpink" />
                      <Text style={styles.residenceText}>{currentLike.residence}</Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Processing indicator */}
            {processingAction === currentLike.id && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="hotpink" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'hotpink',
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
  likeCard: {
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
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  likeCounter: {
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  likeCounterText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 10,
  },
  button: {
    padding: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
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
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  ageContainer: {
    marginRight: 10,
  },
  ageText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  distanceText: {
    fontSize: 16,
    color: '#666',
  },
  residenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  residenceText: {
    fontSize: 16,
    color: '#666',
  },
}); 