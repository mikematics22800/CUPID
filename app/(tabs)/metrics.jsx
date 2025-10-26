import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { LineChart } from 'react-native-chart-kit'
import { getAnalyticsData, getAnalyticsSummary, supabase } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import LottieView from 'lottie-react-native'
import { PanGestureHandler, State } from 'react-native-gesture-handler'
import { Animated } from 'react-native'

const { width } = Dimensions.get('window')

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState(null)
  const [daysRange, setDaysRange] = useState(7) // Default to 7 days
  const [userCreatedAt, setUserCreatedAt] = useState(null)
  const [maxDays, setMaxDays] = useState(365) // Default max days

  // Animation refs for slider
  const sliderPosition = useRef(new Animated.Value(0)).current
  const sliderWidth = width - 80 // Account for padding

  // Initialize slider position based on current daysRange
  useEffect(() => {
    const percentage = (daysRange - 1) / (maxDays - 1)
    const position = percentage * sliderWidth
    sliderPosition.setValue(position)
  }, [maxDays, daysRange])

  const fetchAnalyticsData = async (selectedDays = daysRange) => {
    try {
      setLoading(true)
      setError(null)
      const [analytics, summary] = await Promise.all([
        getAnalyticsData(selectedDays),
        getAnalyticsSummary()
      ])
      
      setAnalyticsData(analytics)
      setSummaryData(summary)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      setError(error.message || 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  const onSliderGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: sliderPosition } }],
    { useNativeDriver: false }
  )

  const onSliderStateChange = (event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      const { translationX } = event.nativeEvent
      const newPosition = Math.max(0, Math.min(sliderWidth, translationX))
      const percentage = newPosition / sliderWidth
      const newDays = Math.round(1 + (percentage * (maxDays - 1)))
      
      setDaysRange(newDays)
    } else if (event.nativeEvent.state === State.END) {
      fetchAnalyticsData(daysRange)
    }
  }

  const getUserCreatedAt = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (currentUser) {
        const { data: userData, error } = await supabase
          .from('user')
          .select('created_at')
          .eq('id', currentUser.id)
          .single()
        
        if (userData && !error) {
          const createdAt = new Date(userData.created_at)
          const now = new Date()
          const daysSinceCreation = Math.ceil((now - createdAt) / (1000 * 60 * 60 * 24))
          setMaxDays(Math.max(daysSinceCreation, 1)) // Minimum 1 day
          setUserCreatedAt(createdAt)
        }
      }
    } catch (error) {
      console.error('Error getting user created_at:', error)
    }
  }

  useEffect(() => {
    getUserCreatedAt()
    fetchAnalyticsData()
    
    // Set up daily refresh at midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime()
    
    const dailyRefreshTimer = setTimeout(() => {
      fetchAnalyticsData()
      // Set up recurring daily refresh
      setInterval(fetchAnalyticsData, 24 * 60 * 60 * 1000)
    }, timeUntilMidnight)
    
    return () => {
      clearTimeout(dailyRefreshTimer)
    }
  }, [])

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`, // Pink color
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ff69b4'
    }
  }

  if (loading) {
    return (
      <View style={styles.imageLoader}>
        <LottieView
          source={require('../../assets/animations/heart.json')}
          autoPlay
          loop
          style={styles.lottieAnimation}
          speed={1}
        />
      </View>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.retryText} onPress={fetchAnalyticsData}>
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        {summaryData && ( 
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Likes Received</Text>
                <Text style={styles.summaryValue}>{summaryData.totalLikesReceived}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Likes Given</Text>
                <Text style={styles.summaryValue}>{summaryData.likesGiven}</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Total Matches</Text>
                <Text style={styles.summaryValue}>{summaryData.totalMatches}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Match Rate</Text>
                <Text style={styles.summaryValue}>{summaryData.matchRate}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Combined Engagement Chart with Slider */}
        {analyticsData?.likesGiven && analyticsData?.likesReceived && analyticsData?.matches && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Engagement</Text>
            <LineChart
              data={{
                labels: analyticsData.likesGiven.labels,
                datasets: [
                  {
                    data: analyticsData.likesGiven.data,
                    color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: analyticsData.likesReceived.data,
                    color: (opacity = 1) => `rgba(255, 20, 147, ${opacity})`,
                    strokeWidth: 2
                  },
                  {
                    data: analyticsData.matches.data,
                    color: (opacity = 1) => `rgba(138, 43, 226, ${opacity})`,
                    strokeWidth: 2
                  }
                ]
              }}
              width={width - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                legend: ['Likes Given', 'Likes Received', 'Matches']
              }}
              bezier
              style={styles.chart}
            />
            
            {/* Timescale Slider */}
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <PanGestureHandler
                  onGestureEvent={onSliderGestureEvent}
                  onHandlerStateChange={onSliderStateChange}
                >
                  <Animated.View 
                    style={[
                      styles.sliderThumb,
                      {
                        transform: [{ translateX: sliderPosition }]
                      }
                    ]} 
                  />
                </PanGestureHandler>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderMinLabel}>1 day</Text>
                <Text style={styles.sliderMaxLabel}>{maxDays} days</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'hotpink',
    paddingTop: 0
  },
  scrollView: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10
  },
  retryText: {
    fontSize: 14,
    color: '#007bff',
    textDecorationLine: 'underline'
  },
  summaryContainer: {
    padding: 20,
    paddingTop: 10,
    gap: 10
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 5
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529'
  },
  sliderContainer: {
    paddingHorizontal: 40,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
    textAlign: 'center'
  },
  sliderTrack: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    position: 'relative',
    marginTop: 20
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  sliderMinLabel: {
    fontSize: 12,
    color: '#6c757d'
  },
  sliderMaxLabel: {
    fontSize: 12,
    color: '#6c757d'
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden'
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
    textAlign: 'center'
  },
  chart: {
    height: 200,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 200, 200)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
})

export default Analytics