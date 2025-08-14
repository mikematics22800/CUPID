import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import TimePicker from './TimePicker';
import VenueInput from './VenueInput';

const DatePlanner = ({ visible, onClose, match }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [datePlans, setDatePlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [venue, setVenue] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDates, setPendingDates] = useState([]);
  const [isUser1, setIsUser1] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyingDate, setModifyingDate] = useState(null);
  const [modifyDateTime, setModifyDateTime] = useState(null);
  const [modifyVenue, setModifyVenue] = useState('');

  useEffect(() => {
    if (visible && match) {
      loadUserAndMatchData();
      loadDatePlans();
    }
  }, [visible, match]);

  const loadUserAndMatchData = async () => {
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        Alert.alert('Error', 'Authentication required');
        return;
      }
      setCurrentUser(user);

      // Get match data including creation date
      const { data: matchData, error: matchError } = await supabase
        .from('match')
        .select('user_1_id, user_2_id, created_at')
        .eq('id', match.matchId)
        .single();

      if (matchError || !matchData) {
        Alert.alert('Error', 'Match not found');
        return;
      }
      setMatchData(matchData);
      
      // Determine if current user is user_1 or user_2
      setIsUser1(currentUser?.id === matchData.user_1_id);
      
      // Set calendar to start from the match creation date
      if (matchData.created_at) {
        setCurrentMonth(new Date(matchData.created_at));
      } else {
        // Fallback to current date if no match date available
        setCurrentMonth(new Date());
      }
    } catch (error) {
      console.error('Error loading user and match data:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const loadDatePlans = async () => {
    if (!match?.matchId) return;
    
    try {
      setLoading(true);
      
      // Load all date plans for this match
      const { data, error } = await supabase
        .from('date')
        .select('*')
        .eq('match_id', match.matchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading date plans:', error);
        Alert.alert('Error', 'Failed to load date plans');
        return;
      }

      setDatePlans(data || []);
      
      // Load pending dates (dates where current user needs to respond)
      if (!isUser1 && data) {
        const pending = data.filter(date => 
          date.user_2_id === currentUser?.id && date.accepted === null
        );
        setPendingDates(pending);
      }
    } catch (error) {
      console.error('Error loading date plans:', error);
      Alert.alert('Error', 'Failed to load date plans');
    } finally {
      setLoading(false);
    }
  };

  const createDatePlan = async () => {
    if (!selectedDate || !venue.trim()) {
      Alert.alert('Missing Information', 'Please select a date and enter a venue');
      return;
    }

    if (!match?.matchId) {
      Alert.alert('Error', 'Match information not available');
      return;
    }

    if (!currentUser || !matchData) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }

    try {
      setLoading(true);
      
      const isUser1 = currentUser?.id === matchData.user_1_id;
      const isUser2 = currentUser?.id === matchData.user_2_id;

      if (!isUser1 && !isUser2) {
        Alert.alert('Error', 'You are not part of this match');
        return;
      }

      // Combine date and time
      const dateTime = new Date(selectedDate);
      if (selectedTime) {
        dateTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      }

      // Create new date plan using new schema
      const { data: newDate, error: createError } = await supabase
        .from('date')
        .insert([
          {
            match_id: match.matchId,
            venue: venue.trim(),
            date_time: dateTime.toISOString(),
            user_1_id: matchData.user_1_id,
            user_2_id: matchData.user_2_id,
            accepted: null, // Pending user_2's response
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating date plan:', createError);
        Alert.alert('Error', 'Failed to create date plan');
        return;
      }

      // Add the new date plan to the list
      setDatePlans(prev => [newDate, ...prev]);
      
      // Reset form
      setSelectedDate(null);
      setSelectedTime(null);
      setVenue('');
      
      Alert.alert('Success', 'Date plan created successfully!');
    } catch (error) {
      console.error('Error creating date plan:', error);
      Alert.alert('Error', 'Failed to create date plan');
    } finally {
      setLoading(false);
    }
  };



  const generateCalendarDays = () => {
    if (!currentMonth) return [];
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Only show days from the current month, not 6 weeks
    const days = [];
    const currentDate = new Date(firstDay);
    
    // Add days from the current month only
    while (currentDate <= lastDay) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const isPast = (date) => {
    // This function is for visual styling only - shows dates since matching
    if (!matchData?.created_at) {
      // Fallback to current date if no match date available
      return date < new Date(new Date().setHours(0, 0, 0, 0));
    }
    
    // Use match creation date as the starting point for visibility
    const matchDate = new Date(matchData.created_at);
    const startOfMatchDay = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
    return date < startOfMatchDay;
  };

  const isSelectable = (date) => {
    // This function controls which dates can actually be selected for planning
    // Only allow selecting dates that are in the future (today or later)
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return date >= startOfToday;
  };

  const isAtMatchMonth = () => {
    if (!matchData?.created_at || !currentMonth) return false;
    
    const matchDate = new Date(matchData.created_at);
    return currentMonth.getMonth() === matchDate.getMonth() && 
           currentMonth.getFullYear() === matchDate.getFullYear();
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      
      // Prevent navigating to months before the match date
      if (matchData?.created_at) {
        const matchDate = new Date(matchData.created_at);
        const matchMonth = new Date(matchDate.getFullYear(), matchDate.getMonth(), 1);
        
        if (newMonth < matchMonth) {
          return prev; // Don't change month if it would go before match date
        }
      }
      
      return newMonth;
    });
  };





  const deleteDatePlan = async (dateId) => {
    if (!match?.matchId) return;

    if (!currentUser || !matchData) {
      Alert.alert('Error', 'User data not loaded. Please try again.');
      return;
    }

    try {
      setLoading(true);
      
      const isUser1 = currentUser?.id === matchData.user_1_id;
      const isUser2 = currentUser?.id === matchData.user_2_id;

      if (!isUser1 && !isUser2) {
        Alert.alert('Error', 'You are not part of this match');
        return;
      }

      // Delete the date plan
      const { error: deleteError } = await supabase
        .from('date')
        .delete()
        .eq('id', dateId);

      if (deleteError) {
        console.error('Error deleting date plan:', deleteError);
        Alert.alert('Error', 'Failed to delete date plan');
        return;
      }

      // Remove from local state
      setDatePlans(prev => prev.filter(date => date.id !== dateId));
      setPendingDates(prev => prev.filter(date => date.id !== dateId));

      Alert.alert('Success', 'Date plan deleted successfully!');
    } catch (error) {
      console.error('Error deleting date plan:', error);
      Alert.alert('Error', 'Failed to delete date plan');
    } finally {
      setLoading(false);
    }
  };

  const acceptDate = async (dateId) => {
    if (!match?.matchId || !currentUser) return;

    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('date')
        .update({ 
          accepted: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', dateId);

      if (updateError) {
        console.error('Error accepting date:', updateError);
        Alert.alert('Error', 'Failed to accept date');
        return;
      }

      // Update local state
      setDatePlans(prev => 
        prev.map(date => 
          date.id === dateId 
            ? { ...date, accepted: true, updated_at: new Date().toISOString() }
            : date
        )
      );
      setPendingDates(prev => prev.filter(date => date.id !== dateId));

      Alert.alert('Success', 'Date accepted!');
    } catch (error) {
      console.error('Error accepting date:', error);
      Alert.alert('Error', 'Failed to accept date');
    } finally {
      setLoading(false);
    }
  };

  const rejectDate = async (dateId) => {
    if (!match?.matchId || !currentUser) return;

    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('date')
        .update({ 
          accepted: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', dateId);

      if (updateError) {
        console.error('Error rejecting date:', updateError);
        Alert.alert('Error', 'Failed to reject date');
        return;
      }

      // Update local state
      setDatePlans(prev => 
        prev.map(date => 
          date.id === dateId 
            ? { ...date, accepted: false, updated_at: new Date().toISOString() }
            : date
        )
      );
      setPendingDates(prev => prev.filter(date => date.id !== dateId));

      Alert.alert('Success', 'Date rejected');
    } catch (error) {
      console.error('Error rejecting date:', error);
      Alert.alert('Error', 'Failed to reject date');
    } finally {
      setLoading(false);
    }
  };

  const modifyDate = async (dateId, newDateTime, newVenue) => {
    if (!match?.matchId || !currentUser) return;

    try {
      setLoading(true);
      
      const { error: updateError } = await supabase
        .from('date')
        .update({ 
          date_time: newDateTime.toISOString(),
          venue: newVenue,
          updated_at: new Date().toISOString() 
        })
        .eq('id', dateId);

      if (updateError) {
        console.error('Error modifying date:', updateError);
        Alert.alert('Error', 'Failed to modify date');
        return;
      }

      // Update local state
      setDatePlans(prev => 
        prev.map(date => 
          date.id === dateId 
            ? { 
                ...date, 
                date_time: newDateTime.toISOString(),
                venue: newVenue,
                updated_at: new Date().toISOString() 
              }
            : date
        )
      );
      setPendingDates(prev => prev.filter(date => date.id !== dateId));

      Alert.alert('Success', 'Date modified and accepted!');
    } catch (error) {
      console.error('Error modifying date:', error);
      Alert.alert('Error', 'Failed to modify date');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteDatePlan = (dateId) => {
    Alert.alert(
      'Delete Date Plan',
      'Are you sure you want to delete this date plan? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteDatePlan(dateId),
        },
      ]
    );
  };

  const formatDateTime = (dateTimeString) => {
    try {
      const date = new Date(dateTimeString);
      
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting date time:', error);
      return 'Invalid date';
    }
  };

  const handleTimeSelected = (time) => {
    setSelectedTime(time);
  };

  const handleVenueSelected = (venueData) => {
    setVenue(venueData.name || venueData.description);
  };

  const handleDateSelection = (date) => {
    if (!isSelectable(date)) return;
    
    // If the same date is already selected, deselect it
    if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
      setSelectedDate(null);
      setSelectedTime(null);
      setVenue('');
    } else {
      // Select the new date and clear previous selections
      setSelectedDate(date);
      setSelectedTime(null);
      setVenue('');
    }
  };

  if (!match) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Date Planner</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Calendar */}
          <View style={styles.calendarSection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="hotpink" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : !currentMonth ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading calendar...</Text>
              </View>
            ) : (
              <>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity 
                    onPress={() => changeMonth(-1)} 
                    style={[
                      styles.monthButton,
                      isAtMatchMonth() && styles.disabledMonthButton
                    ]}
                    disabled={isAtMatchMonth()}
                  >
                    <Ionicons 
                      name="chevron-back" 
                      size={20} 
                      color={isAtMatchMonth() ? "#ccc" : "#333"} 
                    />
                  </TouchableOpacity>
                  <Text style={styles.monthText}>
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                    <Ionicons name="chevron-forward" size={20} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.calendar}>
                  {/* Day headers */}
                  <View style={styles.dayHeaders}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <Text key={day} style={styles.dayHeader}>{day}</Text>
                    ))}
                  </View>

                  {/* Calendar days */}
                  <View style={styles.daysGrid}>
                    {generateCalendarDays().map((date, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.day,
                          isToday(date) && styles.today,
                          isSelected(date) && styles.selectedDay,
                          isPast(date) && styles.pastDay,
                          !isSelectable(date) && styles.nonSelectableDay
                        ]}
                        onPress={() => handleDateSelection(date)}
                        disabled={!isSelectable(date)}
                      >
                        <Text style={[
                          styles.dayText,
                          isToday(date) && styles.todayText,
                          isSelected(date) && styles.selectedDayText,
                          isPast(date) && styles.pastDayText,
                          !isSelectable(date) && styles.nonSelectableDayText
                        ]}>
                          {date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Date Plan Form */}
          {selectedDate && (
            <View style={styles.formSection}>              
              {/* Time Selection */}
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Text style={styles.timeInputText}>
                    {selectedTime 
                      ? selectedTime.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          hour12: true 
                        })
                      : 'Select time'
                    }
                  </Text>
                  <Ionicons name="time" size={20} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Venue Input */}
              <View style={styles.inputContainer}>
                <VenueInput
                  value={venue}
                  onChangeText={setVenue}
                  onVenueSelected={handleVenueSelected}
                  placeholder="Search for venues..."
                  label="Venue"
                />
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.disabledButton]}
                onPress={createDatePlan}
                disabled={loading}
              >
                <Text style={styles.createButtonText}>
                  {loading ? 'Scheduling...' : 'Schedule Date'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pending Dates (for user_2 only) */}
          {!isUser1 && pendingDates.length > 0 && (
            <View style={styles.plansSection}>
              <Text style={styles.plansTitle}>Pending Date Requests</Text>
              
              {pendingDates.map((datePlan) => (
                <View key={datePlan.id} style={styles.pendingPlanCard}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planDate}>
                      {formatDateTime(datePlan.date_time)}
                    </Text>
                    <Text style={styles.planLocation}>{datePlan.venue}</Text>
                    <Text style={styles.pendingLabel}>Waiting for your response</Text>
                  </View>
                  
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => acceptDate(datePlan.id)}
                      disabled={loading}
                    >
                      <Text style={styles.actionButtonText}>Accept</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.modifyButton]}
                      onPress={() => {
                        setModifyingDate(datePlan);
                        setModifyDateTime(new Date(datePlan.date_time));
                        setModifyVenue(datePlan.venue);
                        setShowModifyModal(true);
                      }}
                      disabled={loading}
                    >
                      <Text style={styles.actionButtonText}>Modify</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => rejectDate(datePlan.id)}
                      disabled={loading}
                    >
                      <Text style={styles.actionButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Existing Date Plans */}
          {datePlans.length > 0 && (
            <View style={styles.plansSection}>
              <Text style={styles.plansTitle}>
                {isUser1 ? 'Your Scheduled Dates' : 'All Date Plans'}
              </Text>
              
              {datePlans.map((datePlan) => (
                <View key={datePlan.id} style={[
                  styles.planCard,
                  datePlan.accepted === false && styles.rejectedPlanCard
                ]}>
                  <View style={styles.planHeader}>
                    <View style={styles.planHeaderTop}>
                      <Text style={styles.planDate}>
                        {formatDateTime(datePlan.date_time)}
                      </Text>
                      {isUser1 && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => confirmDeleteDatePlan(datePlan.id)}
                        >
                          <Ionicons name="trash" size={16} color="#ff6b6b" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.planLocation}>{datePlan.venue}</Text>
                    {datePlan.accepted === true && (
                      <Text style={styles.acceptedLabel}>✓ Accepted</Text>
                    )}
                    {datePlan.accepted === false && (
                      <Text style={styles.rejectedLabel}>✗ Rejected</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Modify Date Modal */}
        <Modal
          visible={showModifyModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowModifyModal(false)}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => setShowModifyModal(false)} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.title}>Modify Date</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content}>
              <View style={styles.formSection}>
                <Text style={styles.formTitle}>Modify the proposed date:</Text>
                
                {/* Date Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => {
                      // You can add a date picker here if needed
                      // For now, we'll use the existing date
                    }}
                  >
                    <Text style={styles.dateInputText}>
                      {modifyDateTime ? modifyDateTime.toLocaleDateString() : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Time Selection */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeInputText}>
                      {modifyDateTime 
                        ? modifyDateTime.toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })
                        : 'Select time'
                      }
                    </Text>
                    <Ionicons name="time" size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Venue Input */}
                <View style={styles.inputContainer}>
                  <VenueInput
                    value={modifyVenue}
                    onChangeText={setModifyVenue}
                    onVenueSelected={(venueData) => setModifyVenue(venueData.name || venueData.description)}
                    placeholder="Search for restaurants, parks, movie theaters..."
                    label="Venue"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.createButton, loading && styles.disabledButton]}
                  onPress={() => {
                    if (modifyDateTime && modifyVenue.trim()) {
                      modifyDate(modifyingDate.id, modifyDateTime, modifyVenue.trim());
                      setShowModifyModal(false);
                    } else {
                      Alert.alert('Missing Information', 'Please select a date/time and enter a venue');
                    }
                  }}
                  disabled={loading}
                >
                  <Text style={styles.createButtonText}>
                    {loading ? 'Updating...' : 'Update & Accept Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Time Picker Modal */}
        <TimePicker
          visible={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          onTimeSelected={(time) => {
            if (showModifyModal) {
              setModifyDateTime(prev => {
                const newDateTime = new Date(prev || new Date());
                newDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
                return newDateTime;
              });
            } else {
              setSelectedTime(time);
            }
          }}
          initialTime={modifyDateTime || selectedTime || new Date()}
          title="Select Time"
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  matchInfo: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  matchName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  matchDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  calendarSection: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
    maxWidth: 350,
  },
  monthButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  disabledMonthButton: {
    opacity: 0.5,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendar: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 350,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  calendarInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  today: {
    backgroundColor: 'hotpink',
    borderRadius: 20,
  },
  todayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedDay: {
    backgroundColor: 'hotpink',
    borderRadius: 20,
  },
  selectedDayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  pastDay: {
    opacity: 0.3,
  },
  pastDayText: {
    color: '#999',
  },
  nonSelectableDay: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  nonSelectableDayText: {
    color: '#999',
  },
  formSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  createButton: {
    backgroundColor: 'hotpink',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  plansSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  planHeader: {
    marginBottom: 12,
  },
  planHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  planDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  planLocation: {
    fontSize: 14,
    color: '#666',
  },
  pendingPlanCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  pendingLabel: {
    fontSize: 12,
    color: '#856404',
    fontStyle: 'italic',
    marginTop: 4,
  },
  pendingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffeaa7',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  modifyButton: {
    backgroundColor: '#ffc107',
  },
  rejectButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rejectedPlanCard: {
    opacity: 0.6,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  acceptedLabel: {
    fontSize: 12,
    color: '#155724',
    fontWeight: '600',
    marginTop: 4,
  },
  rejectedLabel: {
    fontSize: 12,
    color: '#721c24',
    fontWeight: '600',
    marginTop: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
  },

  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  timeInputText: {
    flex: 1,
    marginRight: 10,
    fontSize: 16,
    color: '#333',
  },
  calendarHelpText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default DatePlanner;