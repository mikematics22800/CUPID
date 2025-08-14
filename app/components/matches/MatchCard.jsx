import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import TimestampDisplay from '../TimestampDisplay';
import DatePlanner from './DatePlanner';
import { supabase } from '../../../lib/supabase';

export default function MatchCard({ 
  match, 
  onOpenChat, 
  onUnmatch, 
  processingUnmatch 
}) {

  const [imageLoading, setImageLoading] = useState(false);
  const [showDatePlanner, setShowDatePlanner] = useState(false);
  const [pendingDatesCount, setPendingDatesCount] = useState(0);

  // Check for pending dates when component mounts or match changes
  useEffect(() => {
    if (match?.matchId) {
      checkPendingDates();
    }
  }, [match?.matchId]);

  const checkPendingDates = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get match data to determine which user the current user is
      const { data: matchData, error: matchError } = await supabase
        .from('match')
        .select('user_1_id, user_2_id')
        .eq('id', match.matchId)
        .single();

      if (matchError || !matchData) return;

      // Determine if current user is user_1 or user_2
      const isUser1 = currentUser.id === matchData.user_1_id;
      const isUser2 = currentUser.id === matchData.user_2_id;

      if (!isUser1 && !isUser2) return;

      // Get pending dates (dates where the current user needs to respond)
      // If current user is user_1, they can't have pending dates (they create them)
      // If current user is user_2, they have pending dates from user_1
      if (isUser2) {
        const { data: pendingDates, error } = await supabase
          .from('date')
          .select('*')
          .eq('match_id', match.matchId)
          .eq('user_2_id', currentUser.id)
          .is('accepted', null);

        if (!error && pendingDates) {
          setPendingDatesCount(pendingDates.length);
        }
      } else {
        setPendingDatesCount(0);
      }
    } catch (error) {
      console.error('Error checking pending dates:', error);
    }
  };




  return (
    <View style={styles.matchCard}>
      <View style={styles.matchContent}>
        {match.photo ? (
          <View style={styles.photoContainer}>
            <Image 
              source={{ uri: match.photo }} 
              style={styles.matchPhoto}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                // Failed to load image for match
              }}
            />
            {imageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="hotpink" />
              </View>
            )}
          </View>
        ) : (
          <View style={styles.matchPhotoPlaceholder}>
            <Ionicons name="person" size={30} color="#ccc" />
          </View>
        )}
        <View style={styles.matchInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.matchName}>{match.name}, {match.age}</Text>
          </View>
          {match.distance !== null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={14} color="#666" />
              <Text style={styles.distanceText}>{match.distance} miles away</Text>
            </View>
          )}

        </View>
      </View>
      <View style={styles.matchActions}>
        <TimestampDisplay 
          timestamp={match.matchedAt}
          format="relative"
          style={styles.timestamp}
          fallbackText="Just matched!"
        />
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.messageButton]}
            onPress={() => onOpenChat(match)}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="white" />

          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.calendarButton}
            onPress={() => setShowDatePlanner(true)}
          >
            <View style={styles.calendarButtonContainer}>
              <Ionicons name="calendar" size={20} color="white"/>
              {pendingDatesCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>!</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.unmatchButton, processingUnmatch === match.id && styles.processingButton]}
            onPress={() => onUnmatch(match.id, match.name)}
            disabled={processingUnmatch === match.id}
          >
            <Ionicons name="trash" size={20} color="white"/>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Date Planner Modal */}
      <DatePlanner
        visible={showDatePlanner}
        onClose={() => {
          setShowDatePlanner(false);
          // Refresh pending dates count when planner closes
          setTimeout(() => checkPendingDates(), 500);
        }}
        match={match}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  matchCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 15,
  },
  matchPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
    borderRadius: 30,
  },
  matchPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  matchActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  messageButton: {
    padding: 8,
    backgroundColor: 'hotpink',
    borderRadius: 20,
  },


  unmatchButton: {
    padding: 8,
    backgroundColor: 'red',
    borderRadius: 20,
  },
  processingButton: {
    backgroundColor: '#ccc',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  calendarButton: {
    padding: 8,
    backgroundColor: 'purple',
    borderRadius: 20,
  },
  calendarButtonContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 