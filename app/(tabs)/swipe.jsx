import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import loading from '../../assets/images/loading.gif';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

export default function Swipe() {
  const [canSwipe, setCanSwipe] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isFirstSwipe, setIsFirstSwipe] = useState(true);
  const [currentProfile, setCurrentProfile] = useState({
    name: 'Sarah',
    age: 28,
    bio: 'Love hiking and photography',
    image: 'https://picsum.photos/300/400'
  });

  // Animation values
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
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

  const handleSwipe = (direction) => {
    if (!canSwipe) return;
    
    // Reset timer and disable swiping
    setCanSwipe(false);
    setTimeLeft(30);
    setIsFirstSwipe(false);
    
    // Animate card based on direction
    const toValue = {
      x: direction === 'left' ? -SCREEN_WIDTH * 1.5 : 
         direction === 'right' ? SCREEN_WIDTH * 1.5 : 0,
      y: direction === 'unsure' ? -SCREEN_WIDTH : 0
    };

    Animated.spring(position, {
      toValue,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start(() => {
      // Reset position and show new profile
      position.setValue({ x: 0, y: 0 });
      setCurrentProfile({
        name: 'Mike',
        age: 31,
        bio: 'Coffee enthusiast and tech lover',
        image: 'https://picsum.photos/300/400'
      });
    });
    
    console.log(`Swiped ${direction}`);
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
      <Animated.View style={[styles.profileCard, cardStyle]}>
        <Text style={styles.name}>{currentProfile.name}, {currentProfile.age}</Text>
        <Text style={styles.bio}>{currentProfile.bio}</Text>
      </Animated.View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.button, styles.dislikeButton, !canSwipe && styles.disabledButton]}
          onPress={() => handleSwipe('left')}
          disabled={!canSwipe}
        >
          <Ionicons name="thumbs-down" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.unsureButton, !canSwipe && styles.disabledButton]}
          onPress={() => handleSwipe('unsure')}
          disabled={!canSwipe}
        >
          <Ionicons name="hand-right" size={24} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.likeButton, !canSwipe && styles.disabledButton]}
          onPress={() => handleSwipe('right')}
          disabled={!canSwipe}
        >
          <Ionicons name="thumbs-up" size={24} color="white" />
        </TouchableOpacity>
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
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dislikeButton: {
    backgroundColor: '#ff0000',
  },
  unsureButton: {
    backgroundColor: '#ffd93d',
  },
  likeButton: {
    backgroundColor: '#4cd964',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 24,
    color: 'white',
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

