import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { getNewLikesCount, getNewMatchesCount, supabase } from '../../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';

export default function TabLayout() {
  const [newLikes, setNewLikes] = useState(0);
  const [newMatches, setNewMatches] = useState(0);

  useEffect(() => {
    loadAllCounts();
    
    // Set up real-time subscription for likes
    const likesSubscription = supabase
      .channel('likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'like'
        },
        () => {
          loadAllCounts();
        }
      )
      .subscribe();

    // Set up real-time subscription for matches
    const matchesSubscription = supabase
      .channel('matches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match'
        },
        () => {
          loadAllCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesSubscription);
      supabase.removeChannel(matchesSubscription);
    };
  }, []);

  // Refresh counts when the tab layout comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadAllCounts();
    }, [])
  );

  const loadAllCounts = async () => {
    try {
      // Load all counts in parallel
      const [likesCount, matchesCount] = await Promise.all([
        getNewLikesCount(),
        getNewMatchesCount()
      ]);
      
      setNewLikes(likesCount);
      setNewMatches(matchesCount);
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  };

  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: 'hotpink',
      tabBarInactiveTintColor: 'gray',
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: '#eee',
      },
      headerTitle: ''
    }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="diversity-1" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          title: 'Likes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart" size={size} color={color} />
          ),
          tabBarBadge: newLikes > 0 ? newLikes : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'hotpink',
            color: 'white',
          },
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
          tabBarBadge: newMatches > 0 ? newMatches : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'hotpink',
            color: 'white',
          },
        }}
      />
      <Tabs.Screen
        name="metrics"
        options={{
          title: 'Metrics',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="area-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
