import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LikeCard({ 
  like, 
  currentPhotoIndex, 
  setCurrentPhotoIndex, 
  processingAction,
  cardStyle,
  onMomentumScrollEnd
}) {
  return (
    <Animated.View style={[styles.likeCard, cardStyle]}>
      {/* Photo Carousel */}
      <View style={styles.photoCarouselContainer}>
        {like.images && like.images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              style={styles.photoScrollView}
            >
              {like.images.map((image, index) => (
                <View key={index} style={styles.photoSlide}>
                  <Image 
                    source={{ uri: image }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={() => {
                      console.log('Failed to load image for like:', like.id, 'photo:', index);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            
            {/* Photo Dots Indicator */}
            {like.images.length > 1 && (
              <View style={styles.dotsContainer}>
                {like.images.map((_, index) => (
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
            {like.images.length > 1 && (
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {currentPhotoIndex + 1} / {like.images.length}
                </Text>
              </View>
            )}
          </>
        ) : like.image ? (
          // Fallback for single image
          <Image 
            source={{ uri: like.image }} 
            style={styles.profileImage}
            resizeMode="cover"
            onError={() => {
              console.log('Failed to load image for like:', like.id);
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
        nestedScrollEnabled
      >
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{like.name}, {like.age}</Text>
          <Text style={styles.bio}>{like.bio}</Text>
          {like.interests && like.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              <View style={styles.interestsList}>
                {like.interests.map((interest, index) => (
                  <Text key={index} style={styles.interestTag}>{interest}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Processing indicator */}
      {processingAction === like.id && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="hotpink" />
          <Text style={styles.processingText}>Processing...</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
}); 