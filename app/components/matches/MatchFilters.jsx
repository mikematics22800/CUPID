import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MatchFilters({ 
  filters, 
  onFilterChange, 
  onClearFilters 
}) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const dateOptions = [
    { label: 'All Time', value: 'all' },
    { label: 'Last 7 Days', value: '7days' },
    { label: 'Last 30 Days', value: '30days' },
    { label: 'Last 3 Months', value: '3months' },
    { label: 'Last 6 Months', value: '6months' },
    { label: 'Last Year', value: '1year' }
  ];



  const distanceOptions = [
    { label: 'Any Distance', value: 'all' },
    { label: 'Within 5 miles', value: '5' },
    { label: 'Within 10 miles', value: '10' },
    { label: 'Within 25 miles', value: '25' },
    { label: 'Within 50 miles', value: '50' },
    { label: 'Within 100 miles', value: '100' },
    { label: '100+ miles', value: '100+' }
  ];

  const handleDateFilterChange = (value) => {
    onFilterChange({ ...filters, dateFilter: value });
  };



  const handleDistanceFilterChange = (value) => {
    onFilterChange({ ...filters, distanceFilter: value });
  };

  const getFilterLabel = () => {
    const activeFilters = [];
    
    if (filters.dateFilter && filters.dateFilter !== 'all') {
      const dateOption = dateOptions.find(option => option.value === filters.dateFilter);
      activeFilters.push(dateOption?.label || filters.dateFilter);
    }
    


    if (filters.distanceFilter && filters.distanceFilter !== 'all') {
      const distanceOption = distanceOptions.find(option => option.value === filters.distanceFilter);
      activeFilters.push(distanceOption?.label || filters.distanceFilter);
    }
    
    return activeFilters.length > 0 ? activeFilters.join(', ') : 'All Matches';
  };

  const hasActiveFilters = () => {
    return (filters.dateFilter && filters.dateFilter !== 'all') || 
           (filters.distanceFilter && filters.distanceFilter !== 'all');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.filterButton, hasActiveFilters() && styles.activeFilterButton]} 
        onPress={() => setShowFilterModal(true)}
      >
        <Ionicons name="filter" size={16} color={hasActiveFilters() ? 'white' : 'hotpink'} />
        <Text style={[styles.filterButtonText, hasActiveFilters() && styles.activeFilterButtonText]}>
          {getFilterLabel()}
        </Text>
        <Ionicons name="chevron-down" size={16} color={hasActiveFilters() ? 'white' : 'hotpink'} />
      </TouchableOpacity>

      {hasActiveFilters() && (
        <TouchableOpacity style={styles.clearButton} onPress={onClearFilters}>
          <Ionicons name="close-circle" size={16} color="white" />
        </TouchableOpacity>
      )}

      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Matches</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Date Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Matched</Text>
                {dateOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.dateFilter === option.value && styles.selectedFilterOption
                    ]}
                    onPress={() => handleDateFilterChange(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.dateFilter === option.value && styles.selectedFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                    {filters.dateFilter === option.value && (
                      <Ionicons name="checkmark" size={16} color="hotpink" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>



              {/* Distance Filter Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Distance</Text>
                {distanceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.distanceFilter === option.value && styles.selectedFilterOption
                    ]}
                    onPress={() => handleDistanceFilterChange(option.value)}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.distanceFilter === option.value && styles.selectedFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                    {filters.distanceFilter === option.value && (
                      <Ionicons name="checkmark" size={16} color="hotpink" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={() => {
                  onClearFilters();
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'hotpink',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: 'hotpink',
  },
  filterButtonText: {
    marginLeft: 6,
    marginRight: 6,
    fontSize: 14,
    color: 'hotpink',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  clearButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedFilterOption: {
    backgroundColor: '#ffe6f0',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFilterOptionText: {
    color: 'hotpink',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  clearAllButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  clearAllButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'hotpink',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
}); 