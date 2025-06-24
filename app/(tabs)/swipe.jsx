import { View, Text, StyleSheet, Animated, Dimensions, Image} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SWIPE_THRESHOLD = 120;

export default function Swipe() {
  const [canSwipe, setCanSwipe] = useState(true);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isFirstSwipe, setIsFirstSwipe] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const [currentProfile, setCurrentProfile] = useState({
    id: '1',
    name: 'Sarah',
    age: 28,
    bio: 'Love hiking and photography',
  });

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

  const downOpacity = position.y.interpolate({
    inputRange: [0, SCREEN_HEIGHT / 2],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

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
    // This would typically fetch from your backend/database
    const profiles = [
      { id: '2', name: 'Mike', age: 31, bio: 'Coffee enthusiast and tech lover', image: 'https://picsum.photos/300/400' },
      { id: '3', name: 'Emma', age: 26, bio: 'Artist and yoga instructor', image: 'https://picsum.photos/300/400' },
      { id: '4', name: 'David', age: 29, bio: 'Foodie and travel blogger', image: 'https://picsum.photos/300/400' },
    ];
    
    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)];
    setCurrentProfile(randomProfile);
  };

  const handleSwipe = (direction) => {
    if (!canSwipe) return;
    
    setSwipeDirection(direction);
    
    // Reset timer and disable swiping
    setCanSwipe(false);
    setTimeLeft(10);
    setIsFirstSwipe(false);
    
    // Animate card based on direction
    const toValue = {
      x: direction === 'left' ? -SCREEN_WIDTH * 1.5 : 
         direction === 'right' ? SCREEN_WIDTH * 1.5 : 0,
      y: direction === 'archive' ? SCREEN_HEIGHT : 0
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
        // Here you would make an API call to update the profile status
        break;
      case 'right':
        console.log(`Liked profile ${currentProfile.id}`);
        // Here you would make an API call to update the profile status
        break;
      case 'archive':
        console.log(`Archived profile ${currentProfile.id}`);
        // Here you would make an API call to move the profile to archive
        break;
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: position.x, translationY: position.y } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;
      
      // Determine swipe direction based on distance and angle
      const absX = Math.abs(translationX);
      const absY = Math.abs(translationY);
      
      if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
        let direction = null;
        
        if (absX > absY) {
          // Horizontal swipe
          direction = translationX > 0 ? 'right' : 'left';
        } else if (translationY > 0) {
          // Downward swipe
          direction = 'archive';
        }
        
        if (direction) {
          handleSwipe(direction);
        } else {
          // Reset position if no valid swipe
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            tension: 40,
            friction: 7
          }).start();
        }
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

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Swipe Indicators */}
        <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { opacity: leftOpacity }]}>
          <Ionicons name="close-circle" size={60} color="#ff0000" />
          <Text style={[styles.indicatorText, { color: '#ff0000' }]}>DISLIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { opacity: rightOpacity }]}>
          <Ionicons name="heart" size={60} color="#4cd964" />
          <Text style={[styles.indicatorText, { color: '#4cd964' }]}>LIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeIndicator, styles.downIndicator, { opacity: downOpacity }]}>
          <Ionicons name="archive" size={60} color="#ffd93d" />
          <Text style={[styles.indicatorText, { color: '#ffd93d' }]}>ARCHIVE</Text>
        </Animated.View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          enabled={canSwipe}
        >
          <Animated.View style={[styles.profileCard, cardStyle]}>
            <Image source={{ uri: currentProfile.image }} style={styles.profileImage} />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
              <Text style={styles.bio}>{currentProfile.bio}</Text>
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>

      {!canSwipe && (
        <View style={styles.timerContainer}>
          <Image 
            source={loading}
            style={styles.loadingGif}
          />
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
  downIndicator: {
    bottom: 100,
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
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    color: '#666',
  },
  timerContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 20,
  },
  loadingGif: {
    width: 50,
    height: 50,
    marginBottom: 10,
  },
  timerText: {
    fontSize: 16,
    color: '#666',
  },
}); 

