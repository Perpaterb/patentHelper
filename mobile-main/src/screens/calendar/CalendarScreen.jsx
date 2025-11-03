/**
 * Calendar Screen
 *
 * Displays calendar with Month and Day views.
 * Day view implements 2-column grid with red-line probe system
 * matching the HTML reference implementation.
 */

import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDecay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

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

  // Master datetime for Day view - THIS IS THE KEY VARIABLE
  const [masterDayViewDateTime, setMasterDayViewDateTime] = useState(new Date());

  // Master absolute slot index (day * 24 + hour) - advances only with scroll
  const [masterAbsSlotIndex, setMasterAbsSlotIndex] = useState(0);

  // Constants for Day view grid
  const HEADER_W = 80; // Left header width
  const HEADER_H = 40; // Top header height
  const CELL_H = 40; // Cell height
  const CELL_W = (SCREEN_WIDTH - HEADER_W) / 2; // Exactly 2 columns in grid area
  const HEADER_CELL_W = SCREEN_WIDTH / 6; // Top header: 1/6 screen width per day

  // Scroll state for Day view grid
  const scrollX = useSharedValue(0); // Horizontal scroll (columns)
  const scrollY = useSharedValue(0); // Vertical scroll (rows)
  const offsetX = useSharedValue(0); // Sub-cell horizontal offset for animation
  const offsetY = useSharedValue(0); // Sub-cell vertical offset for animation
  const [scrollXJS, setScrollXJS] = useState(0);
  const [scrollYJS, setScrollYJS] = useState(0);
  const [offsetXJS, setOffsetXJS] = useState(0);
  const [offsetYJS, setOffsetYJS] = useState(0);

  // Gesture state
  const [dragging, setDragging] = useState(false);
  const baseScrollX = useSharedValue(0);
  const baseScrollY = useSharedValue(0);
  const velocityY = useSharedValue(0);
  // Re-anchor points for fixing cross-axis pollution bug
  const startTranslationX = useSharedValue(0);
  const startTranslationY = useSharedValue(0);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  // Helper functions for date/time labels
  const hourLabel = (hour24) => {
    const h = ((hour24 % 24) + 24) % 24;
    const hour = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? 'am' : 'pm';
    return `${hour}${ampm}`;
  };

  const dateLabel = (dayIndex) => {
    const baseDate = new Date(2023, 9, 31); // October 31, 2023
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + dayIndex);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const suffix =
      day % 10 === 1 && day !== 11 ? 'st' :
      day % 10 === 2 && day !== 12 ? 'nd' :
      day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    return `${day}${suffix} ${month}`;
  };

  /**
   * Get current date text for header
   * Month view: "October 2025"
   * Day view: "October 31, 2025" (based on masterDayViewDateTime)
   */
  const getHeaderDateText = () => {
    if (viewMode === 'month') {
      return currentMonth.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
    // Day view - use masterDayViewDateTime
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

  // Callbacks to sync Reanimated → React state
  const updateScrollXJS = (value) => setScrollXJS(value);
  const updateScrollYJS = (value) => setScrollYJS(value);
  const updateOffsetXJS = (value) => setOffsetXJS(value);
  const updateOffsetYJS = (value) => setOffsetYJS(value);
  const updateMasterSlot = (value) => setMasterAbsSlotIndex(value);

  // Batched state update to prevent visual glitches (all updates happen in one render)
  const updateAllScrollState = (scrollXVal, scrollYVal, offsetXVal, offsetYVal) => {
    setScrollXJS(scrollXVal);
    setScrollYJS(scrollYVal);
    setOffsetXJS(offsetXVal);
    setOffsetYJS(offsetYVal);
  };

  // Animated styles for grid movement (MUST be at component level, not inside render function)
  const gridAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
      ],
    };
  });

  // Animated style for left header (vertical movement only)
  const headerYAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: offsetY.value }],
    };
  });

  /**
   * Calculate master slot index at the red line probe position
   * Called during render to update masterAbsSlotIndex
   */
  const calculateMasterSlot = () => {
    const PAD_LEFT = CELL_W * 2;
    const PAD_TOP = CELL_H * 2;

    // Red line position (fixed at 0.5 cell width from left edge of grid)
    const redLineX = HEADER_W + 0.5 * CELL_W;

    // Center of screen vertically (in grid area)
    const gridScreenHeight = SCREEN_HEIGHT - HEADER_H;
    const centerScreenY = HEADER_H + gridScreenHeight / 2;

    // First visible cell indices
    const firstGridCol = scrollXJS - Math.ceil(PAD_LEFT / CELL_W);
    const firstGridRow = scrollYJS - Math.ceil(PAD_TOP / CELL_H);

    // Position within grid (accounting for offsets and padding)
    const xInGrid = redLineX - HEADER_W - offsetXJS + PAD_LEFT;
    const yInGrid = centerScreenY - HEADER_H - offsetYJS + PAD_TOP;

    // Calculate floating point row/col
    const rowFloat = firstGridRow + (yInGrid / CELL_H);
    const colFloat = firstGridCol + (xInGrid / CELL_W);

    // Master hour (absolute row index)
    const masterAbsHour = Math.round(rowFloat);

    // Master day (accounts for wrap-around from hours → days)
    const masterDayOffset = Math.floor(masterAbsHour / 24);
    const masterDay = masterDayOffset + Math.floor(colFloat);

    // Master hour of day (0-23)
    const masterHour24 = ((masterAbsHour % 24) + 24) % 24;

    // Master absolute slot index = day * 24 + hour
    const newMasterSlot = masterDay * 24 + masterHour24;

    if (newMasterSlot !== masterAbsSlotIndex) {
      setMasterAbsSlotIndex(newMasterSlot);

      // Update masterDayViewDateTime based on masterAbsSlotIndex
      const baseDate = new Date(2023, 9, 31); // Oct 31, 2023 as base
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + masterDay);
      newDate.setHours(masterHour24, 0, 0, 0);
      setMasterDayViewDateTime(newDate);
    }
  };

  /**
   * Pan gesture for Day view
   * - Vertical scroll: infinite with momentum
   * - Horizontal scroll: snaps to show exactly 2 columns
   * Matches HTML implementation exactly
   */
  const dayViewPanGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      runOnJS(setDragging)(true);
      baseScrollX.value = offsetXJS;
      baseScrollY.value = offsetYJS;
      // Store the initial translation values (they're cumulative in RN Gesture Handler)
      startTranslationX.value = 0;
      startTranslationY.value = 0;
      velocityY.value = 0;
    })
    .onUpdate((event) => {
      'worklet';
      // Calculate delta from the last re-anchor point (FIX for cross-axis pollution)
      const dx = event.translationX - startTranslationX.value;
      const dy = event.translationY - startTranslationY.value;

      // Update offsets (exactly like HTML: offsetX = baseScrollX + dx)
      offsetX.value = baseScrollX.value + dx;
      offsetY.value = baseScrollY.value + dy;

      // Clamp horizontal offset to ±2 cells (exactly like HTML)
      if (offsetX.value > 2 * CELL_W) offsetX.value = 2 * CELL_W;
      if (offsetX.value < -2 * CELL_W) offsetX.value = -2 * CELL_W;

      // Fix vertical offset (normalize to cell boundaries - LOOP until fully normalized)
      // CRITICAL: Use WHILE loop, not IF, to handle large deltas
      let scrollYChanged = false;
      let newScrollY = scrollY.value;
      let newOffsetY = offsetY.value;

      while (newOffsetY >= CELL_H) {
        newOffsetY -= CELL_H;
        newScrollY -= 1;
        scrollYChanged = true;
      }
      while (newOffsetY < 0) {
        newOffsetY += CELL_H;
        newScrollY += 1;
        scrollYChanged = true;
      }

      // Apply the normalized values
      offsetY.value = newOffsetY;
      scrollY.value = newScrollY;

      // CRITICAL FIX: Re-anchor drag origin after cell boundary cross
      // This prevents horizontal/vertical movement from polluting each other
      if (scrollYChanged) {
        // Reset the anchor point for Y axis
        baseScrollY.value = offsetY.value;
        startTranslationY.value = event.translationY;

        // CRITICAL: Only update JS state when scrollY actually changes (cell boundary crossed)
        // This prevents flickering by reducing unnecessary React renders
        runOnJS(updateAllScrollState)(scrollX.value, scrollY.value, offsetX.value, offsetY.value);
      }
    })
    .onEnd((event) => {
      'worklet';
      runOnJS(setDragging)(false);

      // Calculate velocity for vertical momentum (exactly like HTML)
      velocityY.value = event.velocityY / 16; // Scale down velocity

      // Snap horizontal to nearest column (exactly like HTML)
      const snapMultiple = Math.round(offsetX.value / CELL_W);
      const snapTarget = snapMultiple * CELL_W;

      // Animate horizontal snap
      offsetX.value = withTiming(snapTarget, { duration: 220 }, (finished) => {
        'worklet';
        if (finished) {
          // When snap completes, normalize scroll position (exactly like HTML stopSnapX)
          const snapMult = Math.round(offsetX.value / CELL_W);
          scrollX.value -= snapMult;
          offsetX.value = 0;
          // Batched update to prevent glitches
          runOnJS(updateAllScrollState)(scrollX.value, scrollY.value, 0, offsetY.value);
        }
      });

      // Apply vertical momentum with decay (matches HTML friction = 0.93)
      offsetY.value = withDecay({
        velocity: velocityY.value,
        deceleration: 0.993, // Closer to HTML's 0.93 friction
      }, (finished) => {
        'worklet';
        if (finished) {
          // Batched update to prevent glitches
          runOnJS(updateAllScrollState)(scrollX.value, scrollY.value, offsetX.value, offsetY.value);
        }
      });
    });

  /**
   * Render Month view
   */
  const renderMonthView = () => {
    return (
      <ScrollView contentContainerStyle={styles.monthViewContainer}>
        <Text style={styles.placeholderText}>Month View - Coming Soon</Text>
        <Text style={styles.placeholderSubtext}>
          Calendar month grid with events will be displayed here
        </Text>

        {/* Month navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const prev = new Date(currentMonth);
              prev.setMonth(prev.getMonth() - 1);
              setCurrentMonth(prev);
            }}
          >
            <Text style={styles.monthNavButtonText}>← Previous Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.monthNavButton}
            onPress={() => {
              const next = new Date(currentMonth);
              next.setMonth(next.getMonth() + 1);
              setCurrentMonth(next);
            }}
          >
            <Text style={styles.monthNavButtonText}>Next Month →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  /**
   * Render Day view with 2-column grid and red-line probe system
   * Master datetime is calculated based on what's at the red line position
   */
  const renderDayView = () => {
    // Calculate master slot on every render
    calculateMasterSlot();

    const PAD_LEFT = CELL_W * 2;
    const PAD_TOP = CELL_H * 2;

    // Calculate visible cells (using JS state for cell generation)
    const gridWidth = SCREEN_WIDTH - HEADER_W;
    const gridHeight = SCREEN_HEIGHT - HEADER_H;
    const visibleCols = Math.ceil((gridWidth + PAD_LEFT) / CELL_W) + 2;
    const visibleRows = Math.ceil((gridHeight + PAD_TOP) / CELL_H) + 4; // +4 for extra buffer rows

    const firstCol = scrollXJS - Math.ceil(PAD_LEFT / CELL_W);
    const firstRow = scrollYJS - Math.ceil(PAD_TOP / CELL_H) - 1; // -1 to render one extra row above

    // Generate grid cells (positions are static relative to container)
    const gridCells = [];
    for (let dx = 0; dx < visibleCols; dx++) {
      for (let dy = 0; dy < visibleRows; dy++) {
        // CRITICAL FIX: Calculate hour based on VISUAL position accounting for offsetY
        // This prevents flicker by ensuring labels are always correct for the visual position
        const visualOffsetRows = Math.round(offsetYJS / CELL_H);
        const gridHour = firstRow + dy + visualOffsetRows;
        const hour24 = ((gridHour % 24) + 24) % 24;
        const dayShift = Math.floor(gridHour / 24);
        const gridDateCol = firstCol + dx + dayShift;

        gridCells.push({
          key: `cell-${dx}-${dy}`,
          left: (dx * CELL_W) - PAD_LEFT,
          top: (dy * CELL_H) - PAD_TOP,
          hour: hourLabel(hour24),
          date: dateLabel(gridDateCol),
        });
      }
    }

    // Generate top header (dates) - centered on master day
    const headerCells = [];
    const headerW = SCREEN_WIDTH - HEADER_W;
    const daysShown = Math.ceil(headerW / HEADER_CELL_W) + 4;
    const masterDayIdx = Math.floor(masterAbsSlotIndex / 24);
    const masterHourFrac = ((masterAbsSlotIndex % 24) + 24) % 24 / 24;
    const nEachSide = Math.ceil(daysShown / 2);
    const headerStartX = HEADER_W + 0.5 * CELL_W - masterHourFrac * HEADER_CELL_W - nEachSide * HEADER_CELL_W;

    for (let i = -nEachSide; i < daysShown - nEachSide; i++) {
      headerCells.push({
        key: `header-x-${i}`,
        left: headerStartX + (i + nEachSide) * HEADER_CELL_W,
        date: dateLabel(masterDayIdx + i),
      });
    }

    // Generate left header (hours) - static positions
    const leftHeaderCells = [];
    for (let dy = 0; dy < visibleRows; dy++) {
      // CRITICAL FIX: Same as grid cells - account for visual offset
      const visualOffsetRows = Math.round(offsetYJS / CELL_H);
      const gridHour = firstRow + dy + visualOffsetRows;
      const hour24 = ((gridHour % 24) + 24) % 24;
      leftHeaderCells.push({
        key: `header-y-${dy}`,
        top: (dy * CELL_H) - PAD_TOP,
        hour: hourLabel(hour24),
      });
    }

    // Red line position
    const redLineX = HEADER_W + 0.5 * CELL_W;

    return (
      <GestureDetector gesture={dayViewPanGesture}>
        <View style={styles.dayViewContainer}>
          {/* Corner */}
          <View style={styles.corner} />

          {/* Top Header (Dates) */}
          <View style={styles.headerX}>
            {headerCells.map((cell) => (
              <View
                key={cell.key}
                style={[styles.headerXCell, { left: cell.left }]}
              >
                <Text style={styles.headerXText}>{cell.date}</Text>
              </View>
            ))}
          </View>

          {/* Left Header (Hours) */}
          <Animated.View style={[styles.headerY, headerYAnimatedStyle]}>
            {leftHeaderCells.map((cell) => (
              <View
                key={cell.key}
                style={[styles.headerYCell, { top: cell.top }]}
              >
                <Text style={styles.headerYText}>{cell.hour}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Main Grid */}
          <Animated.View style={[styles.grid, gridAnimatedStyle]}>
            {gridCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.gridCell,
                  {
                    left: cell.left,
                    top: cell.top,
                    width: CELL_W,
                    height: CELL_H,
                  },
                ]}
              >
                <Text style={styles.gridCellText}>
                  {cell.hour} {cell.date}
                </Text>
              </View>
            ))}
          </Animated.View>

          {/* Red Line Probe */}
          <View style={[styles.redLine, { left: redLineX - 1 }]} />
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
    backgroundColor: '#eee',
  },
  headerDateButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  headerDateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Month View Styles
  monthViewContainer: {
    padding: 20,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 100,
    color: '#666',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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

  // Day View Styles
  dayViewContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#eee',
  },
  corner: {
    position: 'absolute',
    width: 80,
    height: 40,
    top: 0,
    left: 0,
    backgroundColor: '#ccc',
    zIndex: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#888',
  },
  headerX: {
    position: 'absolute',
    left: 80,
    top: 0,
    right: 0,
    height: 40,
    backgroundColor: '#f7c',
    zIndex: 10,
    borderBottomWidth: 2,
    borderColor: '#888',
    overflow: 'visible',
  },
  headerXCell: {
    position: 'absolute',
    height: 40,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#f7c',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerXText: {
    fontSize: 14,
    fontFamily: 'System',
    color: '#000',
  },
  headerY: {
    position: 'absolute',
    top: 40,
    left: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#acf',
    zIndex: 10,
    borderRightWidth: 2,
    borderColor: '#888',
    overflow: 'hidden',
  },
  headerYCell: {
    position: 'absolute',
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#acf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerYText: {
    fontSize: 14,
    fontFamily: 'System',
    color: '#000',
  },
  grid: {
    position: 'absolute',
    left: 80,
    top: 40,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  gridCell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCellText: {
    fontSize: 14,
    fontFamily: 'System',
    color: '#000',
  },
  redLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: 40,
    backgroundColor: 'red',
    zIndex: 100,
    pointerEvents: 'none',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  goButton: {
    backgroundColor: '#6200ee',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  goButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
