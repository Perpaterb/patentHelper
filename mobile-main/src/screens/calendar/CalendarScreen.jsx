/**
 * Calendar Screen
 *
 * Displays calendar with Month and Day views.
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
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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

  // View mode: 'month' or 'day'
  const [viewMode, setViewMode] = useState('month');

  // Current month for Month view
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Master datetime for Day view - controls all time-based positioning
  const [masterDayViewDateTime, setMasterDayViewDateTime] = useState(new Date());

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('date');

  /**
   * Configure header with view mode buttons (Month and Day only)
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
   * Month view: "October 2025"
   * Day view: "October 31, 2025" (no weekday)
   */
  const getDateHeader = () => {
    if (viewMode === 'month') {
      return currentMonth.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }

    // Day view
    return masterDayViewDateTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
   * Get days in current month for calendar grid
   */
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Day of week for first day (0 = Sunday)
    const firstDayOfWeek = firstDay.getDay();

    // Total days in month
    const daysInMonth = lastDay.getDate();

    // Create array of day objects
    const days = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        date: new Date(year, month, day),
      });
    }

    return days;
  };

  /**
   * Render Month view with calendar grid
   */
  const renderMonthView = () => {
    const days = getDaysInMonth();
    const today = new Date();
    const isCurrentMonth = currentMonth.getMonth() === today.getMonth() &&
                           currentMonth.getFullYear() === today.getFullYear();

    return (
      <ScrollView style={styles.monthViewContainer}>
        {/* Weekday headers */}
        <View style={styles.weekdayHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <Text style={styles.weekdayText}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days.map((dayObj, index) => {
            const isToday = isCurrentMonth && dayObj.day === today.getDate();

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  dayObj.day === null && styles.emptyDayCell,
                  isToday && styles.todayCell,
                ]}
                onPress={() => {
                  if (dayObj.date) {
                    // Switch to Day view with selected date
                    setMasterDayViewDateTime(dayObj.date);
                    setViewMode('day');
                  }
                }}
                disabled={dayObj.day === null}
              >
                {dayObj.day !== null && (
                  <Text style={[styles.dayText, isToday && styles.todayText]}>
                    {dayObj.day}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Month navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(currentMonth.getMonth() - 1);
              setCurrentMonth(newMonth);
            }}
          >
            <Text style={styles.monthNavButtonText}>← Previous Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const newMonth = new Date(currentMonth);
              newMonth.setMonth(currentMonth.getMonth() + 1);
              setCurrentMonth(newMonth);
            }}
          >
            <Text style={styles.monthNavButtonText}>Next Month →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Date Banner */}
        <TouchableOpacity style={styles.dateBanner} onPress={handleBannerPress}>
          <Text style={styles.dateBannerText}>{getDateHeader()}</Text>
        </TouchableOpacity>

        {/* View Content */}
        {viewMode === 'month' && renderMonthView()}
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
    </GestureHandlerRootView>
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
  // Month view styles
  monthViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  weekdayHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weekdayCell: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyDayCell: {
    backgroundColor: '#f9f9f9',
  },
  todayCell: {
    backgroundColor: '#e3f2fd',
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  todayText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  monthNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 20,
  },
  monthNavButton: {
    padding: 12,
    backgroundColor: '#6200ee',
    borderRadius: 8,
  },
  monthNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
