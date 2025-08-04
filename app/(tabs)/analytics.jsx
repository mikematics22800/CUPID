import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from 'react-native'
import React, { useState, useEffect } from 'react'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { getAnalyticsData, getAnalyticsSummary } from '../../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [summaryData, setSummaryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const [analytics, summary] = await Promise.all([
        getAnalyticsData(),
        getAnalyticsSummary()
      ])
      
      setAnalyticsData(analytics)
      setSummaryData(summary)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchAnalyticsData()
    setRefreshing(false)
  }

  useEffect(() => {
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

  const barChartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(138, 43, 226, ${opacity})`, // Purple color
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    }
  }

  const formatDateLabels = (labels) => {
    return labels.map(label => {
      const date = new Date(label)
      return `${date.getMonth() + 1}/${date.getDate()}`
    })
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
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
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Likes Received</Text>
              <Text style={styles.summaryValue}>{summaryData.totalLikesReceived}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Likes Given</Text>
              <Text style={styles.summaryValue}>{summaryData.likesGiven}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Matches</Text>
              <Text style={styles.summaryValue}>{summaryData.totalMatches}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Match Rate</Text>
              <Text style={styles.summaryValue}>{summaryData.matchRate}%</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Profile Views</Text>
              <Text style={styles.summaryValue}>{summaryData.profileViews}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Avg Likes/Day</Text>
              <Text style={styles.summaryValue}>{summaryData.averageLikesPerDay}</Text>
            </View>
          </View>
        )}

        {/* Likes Chart */}
        {analyticsData?.likes && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Likes Over Time (Last 30 Days)</Text>
            <LineChart
              data={{
                labels: formatDateLabels(analyticsData.likes.labels.slice(-7)), // Show last 7 days
                datasets: [
                  {
                    data: analyticsData.likes.data.slice(-7),
                    color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`,
                    strokeWidth: 2
                  }
                ]
              }}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Matches Chart */}
        {analyticsData?.matches && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Matches Over Time (Last 30 Days)</Text>
            <BarChart
              data={{
                labels: formatDateLabels(analyticsData.matches.labels.slice(-7)), // Show last 7 days
                datasets: [
                  {
                    data: analyticsData.matches.data.slice(-7)
                  }
                ]
              }}
              width={width - 40}
              height={220}
              chartConfig={barChartConfig}
              style={styles.chart}
              showValuesOnTopOfBars={true}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollView: {
    flex: 1
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d'
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 10
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    minWidth: (width - 60) / 2,
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
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
    textAlign: 'center'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  infoContainer: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 10
  },
  infoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20
  }
})

export default Analytics