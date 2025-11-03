/**
 * Calendar Screen
 *
 * Displays calendar with Month and Day views.
 * Day view uses master datetime variable controlled by vertical swipe gestures.
 */

import React, { useState, useLayoutEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDecay,
  runOnJS,
} from 'react-native-reanimated';
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

  // Master absolute slot index (day * 24 + hour) - advances only with up/down scroll
  const [masterAbsSlotIndex, setMasterAbsSlotIndex] = useState(0);

  // Scroll state for Day view grid
  const scrollX = useSharedValue(0); // Horizontal scroll (columns)
  const scrollY = useSharedValue(0); // Vertical scroll (rows)
  const offsetX = useSharedValue(0); // Sub-cell horizontal offset for animation
  const offsetY = useSharedValue(0); // Sub-cell vertical offset for animation
  const [scrollXJS, setScrollXJS] = useState(0);
  const [scrollYJS, setScrollYJS] = useState(0);
  const [offsetXJS, setOffsetXJS] = useState(0);
  const [offsetYJS, setOffsetYJS] = useState(0);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  /**
   * Get current date text for header
   * Month view: "October 2025"
   * Day view: "October 31, 2025"
   */
  const getHeaderDateText = () => {
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
   * Configure header with date button (center) and view mode toggle (right)
   */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackTitle: '', // Only show back arrow, no text
      headerTitle: () => (
        <TouchableOpacity onPress={handleBannerPress} style={styles.headerDateButton}>
          <Text style={styles.headerDateText}>{getHeaderDateText()}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          style={{ marginLeft: 10, marginRight: 10 }}
          onPress={() => setViewMode(viewMode === 'month' ? 'day' : 'month')}
        >
          <Text style={styles.viewToggleText}>
            {viewMode === 'day' ? 'Day' : 'Month'}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, viewMode, currentMonth, masterDayViewDateTime]);

  /**
   * Handle header date button click - open date picker modal
   */
  const handleBannerPress = () => {
    const currentDate = viewMode === 'month' ? currentMonth : masterDayViewDateTime;
    setDatePickerValue(currentDate);
    setTempSelectedDate(currentDate);
    setShowDatePicker(true);
  };

  /**
   * Handle date change from native picker (updates temporary state)
   */
  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setTempSelectedDate(selectedDate);
    }
  };

  /**
   * Handle Go button - apply the selected date
   */
  const handleGoPress = () => {
    if (viewMode === 'month') {
      setCurrentMonth(tempSelectedDate);
    } else {
      // Preserve time component for day view
      const newDate = new Date(tempSelectedDate);
      newDate.setHours(masterDayViewDateTime.getHours());
      newDate.setMinutes(masterDayViewDateTime.getMinutes());
      newDate.setSeconds(masterDayViewDateTime.getSeconds());
      setMasterDayViewDateTime(newDate);
    }
    setShowDatePicker(false);
  };

  /**
   * Handle Cancel button - close modal without applying changes
   */
  const handleCancelPress = () => {
    setShowDatePicker(false);
  };

  // Callback to update JS state from Reanimated worklet
  const updateScrollOffsetJS = (value) => {
    setScrollOffsetJS(value);
  };

  /**
   * Pan gesture for Day view vertical scrolling
   * Natural physics-based scrolling with momentum and deceleration
   * VERTICAL ONLY - horizontal movement is ignored
   */
  const dayViewPanGesture = Gesture.Pan()
    .activeOffsetY([-5, 5]) // Require 5px vertical movement to activate
    .failOffsetX([-5, 5]) // Cancel immediately if horizontal movement exceeds 5px
    .onStart(() => {
      // Save the current scroll position when gesture starts
      scrollOffset.value = scrollOffsetJS;
    })
    .onUpdate((event) => {
      // Update scroll offset in real-time as user drags
      scrollOffset.value = scrollOffsetJS - event.translationY;
    })
    .onEnd((event) => {
      // Apply natural physics-based momentum with decay
      // This creates the same feel as a webpage scroll
      scrollOffset.value = withDecay({
        velocity: -event.velocityY,
        deceleration: 0.998, // Higher value = scrolls longer (like iOS)
        clamp: [undefined, undefined], // No limits - infinite scroll
      }, () => {
        // Update JS state when animation completes
        runOnJS(updateScrollOffsetJS)(scrollOffset.value);
      });
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
   * Render Day view with infinite scrolling background grid
   * Master datetime stays active but hidden
   * Controlled by vertical swipe gestures with natural physics
   * Grid lines move infinitely in both directions
   */
  const renderDayView = () => {
    // Grid cell dimensions
    const CELL_HEIGHT = 50;
    const GRID_WIDTH = Dimensions.get('window').width;

    // Calculate which horizontal grid lines to render based on scroll offset
    const VIEWPORT_HEIGHT = SCREEN_HEIGHT;
    const BUFFER_CELLS = 10; // Extra cells to render above/below viewport

    const currentScrollOffset = scrollOffsetJS;
    const firstVisibleIndex = Math.floor((currentScrollOffset - (BUFFER_CELLS * CELL_HEIGHT)) / CELL_HEIGHT);
    const lastVisibleIndex = Math.ceil((currentScrollOffset + VIEWPORT_HEIGHT + (BUFFER_CELLS * CELL_HEIGHT)) / CELL_HEIGHT);

    // Animated container that moves with scroll offset
    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: -scrollOffset.value }],
      };
    });

    // Generate visible grid lines with numbers
    const gridLines = [];
    for (let i = firstVisibleIndex; i <= lastVisibleIndex; i++) {
      const yPosition = i * CELL_HEIGHT;
      gridLines.push({
        id: i,
        number: i,
        yPosition: yPosition,
      });
    }

    return (
      <GestureDetector gesture={dayViewPanGesture}>
        <View style={styles.dayViewContainer}>
          {/* Infinite scrolling background grid */}
          <Animated.View style={[styles.infiniteGridContainer, animatedStyle]}>
            {/* Render horizontal grid lines with numbers */}
            {gridLines.map((line) => (
              <View
                key={line.id}
                style={{
                  position: 'absolute',
                  top: line.yPosition,
                  left: 0,
                  right: 0,
                  height: CELL_HEIGHT,
                  borderBottomWidth: 1,
                  borderBottomColor: '#ddd',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingLeft: 16,
                }}
              >
                <Text style={styles.gridNumberText}>{line.number}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* View Content */}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'day' && renderDayView()}

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCancelPress}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Date</Text>

                <DateTimePicker
                  value={tempSelectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  style={styles.datePicker}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={handleCancelPress}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.goButton]}
                    onPress={handleGoPress}
                  >
                    <Text style={styles.goButtonText}>Go</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  headerDateButton: {
    padding: 8,
  },
  headerDateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  viewToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    userSelect: 'none',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  goButton: {
    backgroundColor: '#6200ee',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  infiniteGridContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fff',
  },
  gridNumberText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
