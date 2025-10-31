/**
 * Calendar Screen
 *
 * Displays calendar with Month, Week, and Day views.
 * Day view uses master datetime variable controlled by vertical swipe gestures.
 */

import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import DateTimePicker from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HOURS_PER_SCREEN_SWIPE = 8; // Configurable: how many hours for full screen swipe

/**
 * CalendarScreen component
 *
 * @param {Object} props
 * @param {Object} props.navigation - React Navigation object
 * @param {Object} props.route - Route params including groupId
 * @returns {JSX.Element}
 */
export default function CalendarScreen({ navigation, route }) {
  const { groupId } = route.params;

  // View mode: 'month', 'week', 'day'
  const [viewMode, setViewMode] = useState('day');

  // Master datetime for Day view - controls all time-based positioning
  const [masterDayViewDateTime, setMasterDayViewDateTime] = useState(new Date());

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date');

  /**
   * Configure header with view mode buttons
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'month' && styles.viewButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'month' && styles.viewButtonTextActive]}>
              Month
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'week' && styles.viewButtonActive]}
            onPress={() => setViewMode('week')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'week' && styles.viewButtonTextActive]}>
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, viewMode === 'day' && styles.viewButtonActive]}
            onPress={() => setViewMode('day')}
          >
            <Text style={[styles.viewButtonText, viewMode === 'day' && styles.viewButtonTextActive]}>
              Day
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, viewMode]);

  /**
   * Get date header string based on view mode
   * Day view: No weekday, just "October 31, 2025"
   * Other views: Include weekday
   */
  const getDateHeader = () => {
    const date = viewMode === 'day' ? masterDayViewDateTime : new Date();

    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    // Add weekday for Month and Week views only
    if (viewMode !== 'day') {
      options.weekday = 'long';
    }

    return date.toLocaleDateString('en-US', options);
  };

  /**
   * Handle banner click - open date picker
   */
  const handleBannerPress = () => {
    setDatePickerMode('date');
    setShowDatePicker(true);
  };

  /**
   * Handle date picker change
   * For Day view: Preserve the time component when changing date
   */
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');

    if (event.type === 'set' && selectedDate) {
      if (viewMode === 'day') {
        // Preserve the time component from masterDayViewDateTime
        const newDate = new Date(selectedDate);
        newDate.setHours(masterDayViewDateTime.getHours());
        newDate.setMinutes(masterDayViewDateTime.getMinutes());
        newDate.setSeconds(masterDayViewDateTime.getSeconds());
        setMasterDayViewDateTime(newDate);
      }
    }
  };

  /**
   * Pan gesture for Day view vertical scrolling
   * Swipe up = time moves forward
   * Swipe down = time moves backward
   * Full screen swipe = HOURS_PER_SCREEN_SWIPE hours
   */
  const dayViewPanGesture = Gesture.Pan()
    .onEnd((event) => {
      // Calculate hours from swipe distance
      const hoursFromDistance = -(event.translationY / SCREEN_HEIGHT) * HOURS_PER_SCREEN_SWIPE;

      // Calculate additional hours from momentum (velocity)
      const velocityInPixelsPerSecond = event.velocityY;
      const momentumHours = -(velocityInPixelsPerSecond / 1000) * (HOURS_PER_SCREEN_SWIPE / SCREEN_HEIGHT) * 0.5;

      // Total hours to add (combine distance and momentum)
      const totalHours = hoursFromDistance + momentumHours;

      // Convert to milliseconds and update master datetime
      const millisecondsToAdd = totalHours * 60 * 60 * 1000;
      const newDateTime = new Date(masterDayViewDateTime.getTime() + millisecondsToAdd);
      setMasterDayViewDateTime(newDateTime);
    });

  /**
   * Render Month view placeholder
   */
  const renderMonthView = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>Month View (Coming Soon)</Text>
    </View>
  );

  /**
   * Render Week view placeholder
   */
  const renderWeekView = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>Week View (Coming Soon)</Text>
    </View>
  );

  /**
   * Render Day view with master datetime
   * Shows current datetime in center of screen
   * Controlled by vertical swipe gestures
   */
  const renderDayView = () => (
    <GestureDetector gesture={dayViewPanGesture}>
      <View style={styles.dayViewContainer}>
        <View style={styles.datetimeDisplay}>
          <Text style={styles.datetimeLabel}>Master DateTime:</Text>
          <Text style={styles.datetimeValue}>
            {masterDayViewDateTime.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
          <Text style={styles.instructionText}>
            Swipe up/down to change time
          </Text>
        </View>
      </View>
    </GestureDetector>
  );

  return (
    <View style={styles.container}>
      {/* Date Banner */}
      <TouchableOpacity style={styles.dateBanner} onPress={handleBannerPress}>
        <Text style={styles.dateBannerText}>{getDateHeader()}</Text>
      </TouchableOpacity>

      {/* View Content */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={viewMode === 'day' ? masterDayViewDateTime : new Date()}
          mode={datePickerMode}
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    marginRight: 10,
    gap: 8,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  viewButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  viewButtonTextActive: {
    fontWeight: 'bold',
  },
  dateBanner: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderText: {
    fontSize: 18,
    color: '#666',
  },
  dayViewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datetimeDisplay: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6200ee',
    minWidth: 250,
  },
  datetimeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  datetimeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
