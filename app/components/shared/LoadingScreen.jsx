import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <LottieView
        source={require('../../../assets/animations/heart.json')}
        autoPlay
        loop
        style={styles.lottieAnimation}
        speed={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
}); 