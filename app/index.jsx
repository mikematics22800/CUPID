import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

export default function Index() {
  return (
    <View style={styles.index}>
      <LottieView
        source={require('../assets/animations/heart.json')}
        autoPlay
        loop
      />
    </View>
  );
}

const styles = StyleSheet.create({
  index: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh', 
    width: '100vw' 
  },
  bgVideo: {
    position: 'absolute',
    height: '100%',
    aspectRatio: 16 / 9,
  },
});