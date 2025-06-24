import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HeartBackground = () => {
  const heartAnimations = useRef([]).current;
  const heartOpacityAnimations = useRef([]).current;
  const hearts = [];

  // Generate multiple hearts with different positions and speeds
  for (let i = 0; i < 50; i++) {
    const heartRef = useRef(new Animated.Value(screenHeight + 50)).current;
    const opacityRef = useRef(new Animated.Value(0)).current;
    heartAnimations.push(heartRef);
    heartOpacityAnimations.push(opacityRef);
    
    hearts.push({
      id: i,
      x: Math.random() * screenWidth,
      speed: 5000,
      size: 20 + Math.random() * 20, 
      animation: heartRef,
      opacityAnimation: opacityRef,
    });
  }

  useEffect(() => {
    const animations = hearts.map((heart, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(heart.animation, {
            toValue: -50,
            duration: heart.speed,
            useNativeDriver: true,
          }),
          Animated.timing(heart.animation, {
            toValue: screenHeight + 50,
            duration: 0,
            useNativeDriver: true,
          })
        ])
      );
    });

    const opacityAnimations = hearts.map((heart) => {
      return Animated.timing(heart.opacityAnimation, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true,
      });
    });

    // Start all animations with staggered delays
    animations.forEach((animation, index) => {
      setTimeout(() => {
        animation.start();
        // Fade in the heart when it starts moving
        opacityAnimations[index].start();
      }, index * 100); // Stagger each heart by 100ms
    });

    return () => {
      animations.forEach(animation => animation.stop());
      opacityAnimations.forEach(animation => animation.stop());
    };
  }, []);

  return (
    <View style={styles.container}>
      {hearts.map((heart) => (
        <Animated.Text
          key={heart.id}
          style={[
            styles.heart,
            {
              left: heart.x,
              fontSize: heart.size,
              transform: [{ translateY: heart.animation }],
              opacity: heart.opacityAnimation,
            },
          ]}
        >
          ❤️
        </Animated.Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    pointerEvents: 'none',
  },
  heart: {
    position: 'absolute',
  },
});

export default HeartBackground; 