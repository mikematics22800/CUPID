import { Video } from 'expo-av';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View style={styles.index}>
      <Video
        source={require('.././assets/media/sequence.mp4')}
        style={styles.bgVideo}
        shouldPlay
        isLooping
        useNativeControls
      />
      <ActivityIndicator size="large" color="#0000ff" />
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