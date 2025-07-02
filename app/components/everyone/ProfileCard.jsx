import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProfileCard({ 
  profile, 
  currentPhotoIndex, 
  setCurrentPhotoIndex, 
  cardStyle,
  onMomentumScrollEnd
}) {
  return (
    <Animated.View style={[styles.profileCard, cardStyle]}>
      {/* Photo Carousel */}
      <View style={styles.photoCarouselContainer}>
        {profile.images && profile.images.length > 0 ? (
          <>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              style={styles.photoScrollView}
            >
              {profile.images.map((image, index) => (
                <View key={index} style={styles.photoSlide}>
                  <Image 
                    source={{ uri: image }} 
                    style={styles.profileImage}
                    resizeMode="cover"
                    onError={() => {
                      // Failed to load image for profile
                    }}
                  />
                </View>
              ))}
            </ScrollView>
            
            {/* Photo Dots Indicator */}
            {profile.images.length > 1 && (
              <View style={styles.dotsContainer}>
                {profile.images.map((_, index) => (
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
            {profile.images.length > 1 && (
              <View style={styles.photoCounter}>
                <Text style={styles.photoCounterText}>
                  {currentPhotoIndex + 1} / {profile.images.length}
                </Text>
              </View>
            )}
          </>
        ) : profile.image ? (
          // Fallback for single image
          <Image 
            source={{ uri: profile.image }} 
            style={styles.profileImage}
            resizeMode="cover"
            onError={() => {
              // Failed to load image for profile
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
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {profile.distance && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.distanceText}>{profile.distance} miles away</Text>
              </View>
            )}
          </View>
          <Text style={styles.bio}>{profile.bio}</Text>
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.interestsContainer}>
              <View style={styles.interestsList}>
                {profile.interests.map((interest, index) => (
                  <Text key={index} style={styles.interestTag}>{interest}</Text>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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