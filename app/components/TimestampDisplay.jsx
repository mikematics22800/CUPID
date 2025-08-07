import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { useProfile } from '../contexts/ProfileContext';
import { formatTimestampForLocation } from '../../lib/google';

export default function TimestampDisplay({ 
  timestamp, 
  style = {},
  fallbackText = 'Just now'
}) {
  const { geolocation, residence } = useProfile();
  const [formattedTime, setFormattedTime] = useState(fallbackText);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const formatTimestamp = async () => {
      try {
        setIsLoading(true);
        
        if (!timestamp) {
          setFormattedTime(fallbackText);
          return;
        }

        // Use the existing formatTimestampForLocation function
        const result = await formatTimestampForLocation(timestamp, geolocation, residence);
        setFormattedTime(result);
      } catch (error) {
        console.error('Error formatting timestamp:', error);
        // Fall back to simple formatting
        const date = new Date(timestamp);
        setFormattedTime(date.toLocaleString([], { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit', 
          minute: '2-digit' 
        }));
      } finally {
        setIsLoading(false);
      }
    };

    formatTimestamp();
  }, [timestamp, geolocation, residence, fallbackText]);

  if (isLoading) {
    return <Text style={style}>...</Text>;
  }

  return <Text style={style}>{formattedTime}</Text>;
} 