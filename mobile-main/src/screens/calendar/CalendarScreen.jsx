/**
 * Calendar Screen
 *
 * Displays calendar with Month and Day views.
 * Day view implements 2-column grid with float-based scrolling
 * matching the HTML reference implementation.
 */

import React, { useState, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  PanResponder,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const HEADER_W = 80;
const HEADER_H = 40;
const CELL_H = 40;

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

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  // --- DAY VIEW: Float-based scroll state (no normalization needed!) ---
  const [renderTick, setRenderTick] = useState(0);
  const scrollYFloat = useRef(0); // Vertical scroll (float, not integer!)
  const scrollXFloat = useRef(0); // Horizontal scroll (float)

  // Animation state
  const velocity = useRef({ x: 0, y: 0 });
  const friction = 0.93;
  const animating = useRef(false);
  const snapAnim = useRef({
    active: false,
    from: 0,
    to: 0,
    startT: 0,
    duration: 220,
  }).current;

  // Drag state
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const scrollStartX = useRef(0);
  const scrollStartY = useRef(0);

  // Helper functions for sizing
  function getSizes() {
    const cellW = (SCREEN_WIDTH - HEADER_W) / 2;
    const headerCellW = SCREEN_WIDTH / 6;
    const padL = cellW * 2;
    const padT = CELL_H * 2;
    const gridW = SCREEN_WIDTH - HEADER_W;
    const gridH = SCREEN_HEIGHT - HEADER_H;
    return { cellW, headerCellW, padL, padT, gridW, gridH };
  }

  // Helper functions for labels
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
      (day % 10 === 1 && day !== 11) ? 'st' :
      (day % 10 === 2 && day !== 12) ? 'nd' :
      (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
    return `${day}${suffix} ${month}`;
  };

  // --- Animation Step Function ---
  function animateStep() {
    const { cellW } = getSizes();
    let changed = false;

    // Snap animation for horizontal
    if (snapAnim.active) {
      const t = Math.min(1, (Date.now() - snapAnim.startT) / snapAnim.duration);
      scrollXFloat.current = snapAnim.from + (snapAnim.to - snapAnim.from) * (1 - Math.pow(1 - t, 2));
      changed = true;
      if (t >= 1) {
        snapAnim.active = false;
      }
    }

    // Vertical inertia
    if (Math.abs(velocity.current.y) > 0.1) {
      scrollYFloat.current += velocity.current.y / CELL_H;
      velocity.current.y *= friction;
      changed = true;
    } else {
      velocity.current.y = 0;
    }

    // Horizontal inertia (only if not snapping)
    if (!snapAnim.active && Math.abs(velocity.current.x) > 0.1) {
      scrollXFloat.current += velocity.current.x / cellW;
      velocity.current.x *= friction;
      changed = true;
    } else if (!snapAnim.active) {
      velocity.current.x = 0;
    }

    if (changed) {
      setRenderTick(tick => tick + 1);
    }

    if (snapAnim.active || Math.abs(velocity.current.y) > 0.1 || Math.abs(velocity.current.x) > 0.1) {
      requestAnimationFrame(animateStep);
    } else {
      animating.current = false;
    }
  }

  function startSnapToCol() {
    const { cellW } = getSizes();
    snapAnim.active = true;
    snapAnim.from = scrollXFloat.current;
    snapAnim.to = Math.round(scrollXFloat.current);
    snapAnim.startT = Date.now();
    snapAnim.duration = 220;
  }

  // --- PanResponder ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !snapAnim.active,
      onMoveShouldSetPanResponder: () => !snapAnim.active,
      onPanResponderGrant: (e, gesture) => {
        animating.current = false;
        velocity.current.x = 0;
        velocity.current.y = 0;
        snapAnim.active = false;
        dragStartX.current = gesture.x0;
        dragStartY.current = gesture.y0;
        scrollStartY.current = scrollYFloat.current;
        scrollStartX.current = scrollXFloat.current;
      },
      onPanResponderMove: (e, gesture) => {
        const { cellW } = getSizes();
        const deltaY = gesture.moveY - dragStartY.current;
        const deltaX = gesture.moveX - dragStartX.current;
        scrollYFloat.current = scrollStartY.current - (deltaY / CELL_H);
        scrollXFloat.current = scrollStartX.current - (deltaX / cellW);

        // Clamp horizontal to ±2 cells
        if (scrollXFloat.current - Math.floor(scrollXFloat.current) > 2) {
          scrollXFloat.current = Math.floor(scrollXFloat.current) + 2;
        }
        if (scrollXFloat.current - Math.floor(scrollXFloat.current) < -2) {
          scrollXFloat.current = Math.floor(scrollXFloat.current) - 2;
        }

        setRenderTick(t => t + 1);
      },
      onPanResponderRelease: (e, gesture) => {
        velocity.current.x = -gesture.vx * 16;
        velocity.current.y = -gesture.vy * 16;
        startSnapToCol();
        animating.current = true;
        animateStep();
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Set header with toggle button on right and clickable title in Day view
  useLayoutEffect(() => {
    if (viewMode === 'month') {
      navigation.setOptions({
        headerTitle: 'Calendar',
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
    } else {
      // Day view: header title shows current date/time and is clickable
      const { cellW, headerCellW, padL, padT, gridW, gridH } = getSizes();
      const redLineX = HEADER_W + 0.5 * cellW;
      const probeScreenY = HEADER_H + gridH / 2;
      const probeOffsetY = probeScreenY - HEADER_H;
      const probeOffsetX = redLineX - HEADER_W;
      const probeRow = Math.floor(scrollYFloat.current + (probeOffsetY / CELL_H));
      const probeCol = Math.floor(scrollXFloat.current + (probeOffsetX / cellW));
      const probeHour24 = ((probeRow % 24) + 24) % 24;
      const probeDayOffset = Math.floor(probeRow / 24);
      const probeDay = probeDayOffset + probeCol;

      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => {
              setTempSelectedDate(new Date());
              setShowDatePicker(true);
            }}
            style={styles.headerDateButton}
          >
            <Text style={styles.headerDateText}>
              {hourLabel(probeHour24)} - {dateLabel(probeDay)}
            </Text>
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
    }
  }, [navigation, viewMode, renderTick]);

  // --- MONTH VIEW ---
  const renderMonthView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const weeks = [];
    let currentWeek = [];
    let dayCount = 1;
    let nextMonthDay = 1;

    // Fill first week with previous month days
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1;
      currentWeek.push({ day, isCurrentMonth: false, key: `prev-${i}` });
    }

    // Fill current month days
    while (dayCount <= daysInMonth) {
      currentWeek.push({ day: dayCount, isCurrentMonth: true, key: `current-${dayCount}` });
      dayCount++;

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill last week with next month days
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({ day: nextMonthDay, isCurrentMonth: false, key: `next-${nextMonthDay}` });
      nextMonthDay++;
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return (
      <View style={styles.monthViewContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}
            style={styles.monthNavButton}
          >
            <Text style={styles.monthNavButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekRow}>
            {week.map((dayObj) => (
              <TouchableOpacity
                key={dayObj.key}
                style={[
                  styles.dayCell,
                  !dayObj.isCurrentMonth && styles.dayCellInactive,
                ]}
                onPress={() => {
                  if (dayObj.isCurrentMonth) {
                    // Could navigate to day view here
                  }
                }}
              >
                <Text style={[
                  styles.dayCellText,
                  !dayObj.isCurrentMonth && styles.dayCellTextInactive,
                ]}>
                  {dayObj.day}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // --- DAY VIEW ---
  const renderDayView = () => {
    const { cellW, headerCellW, padL, padT, gridW, gridH } = getSizes();

    // Red line probe position
    const redLineX = HEADER_W + 0.5 * cellW;
    const probeScreenY = HEADER_H + gridH / 2;

    // Visible cell range (using Math.floor for logical position)
    const firstCol = Math.floor(scrollXFloat.current - Math.ceil(padL / cellW));
    const firstRow = Math.floor(scrollYFloat.current - Math.ceil(padT / CELL_H));
    const visibleCols = Math.ceil(gridW / cellW) + 4;
    const visibleRows = Math.ceil(gridH / CELL_H) + 4;

    // Calculate probe cell (what's under the red line)
    const probeOffsetY = probeScreenY - HEADER_H;
    const probeOffsetX = redLineX - HEADER_W;
    const probeRow = Math.floor(scrollYFloat.current + (probeOffsetY / CELL_H));
    const probeCol = Math.floor(scrollXFloat.current + (probeOffsetX / cellW));
    const probeHour24 = ((probeRow % 24) + 24) % 24;
    const probeDayOffset = Math.floor(probeRow / 24);
    const probeDay = probeDayOffset + probeCol;

    // --- Main Grid Cells ---
    const cells = [];
    for (let dx = 0; dx < visibleCols; dx++) {
      for (let dy = 0; dy < visibleRows; dy++) {
        const rowIdx = firstRow + dy;
        const colIdx = firstCol + dx;

        // Calculate hour and date for this cell
        const hour24 = ((rowIdx % 24) + 24) % 24;
        const dayShift = Math.floor(rowIdx / 24);
        const cellDayCol = colIdx + dayShift;

        // Position using fractional part of scroll
        const left = dx * cellW - ((scrollXFloat.current - Math.floor(scrollXFloat.current)) * cellW);
        const top = dy * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);

        cells.push(
          <View
            key={`c_${dx}_${dy}`}
            style={[
              styles.gridCell,
              {
                width: cellW,
                height: CELL_H,
                left,
                top,
              },
            ]}
          >
            <Text style={styles.gridCellText}>
              {hourLabel(hour24)} {dateLabel(cellDayCol)}
            </Text>
          </View>
        );
      }
    }

    // --- Header X (Date) Cells ---
    const headerW = SCREEN_WIDTH - HEADER_W;
    const headerDaysShown = Math.ceil(headerW / headerCellW) + 4;
    const masterDayIdx = probeDay;
    const masterHourFrac = ((probeRow % 24) + 24) % 24 / 24;
    const headerNumEachSide = Math.ceil(headerDaysShown / 2);
    const headerStartX = HEADER_W + 0.5 * cellW - masterHourFrac * headerCellW - headerNumEachSide * headerCellW;

    const headerXCells = [];
    for (let i = -headerNumEachSide; i < headerDaysShown - headerNumEachSide; i++) {
      const dayIdx = masterDayIdx + i;
      const left = headerStartX + (i + headerNumEachSide) * headerCellW;
      headerXCells.push(
        <View
          key={`hx${i}`}
          style={[
            styles.headerXCell,
            {
              left,
              width: headerCellW,
            },
          ]}
        >
          <Text numberOfLines={1} style={styles.headerCellText}>
            {dateLabel(dayIdx)}
          </Text>
        </View>
      );
    }

    // --- Header Y (Hour) Cells ---
    const headerYCells = [];
    for (let dy = 0; dy < visibleRows; dy++) {
      const rowIdx = firstRow + dy;
      const hour24 = ((rowIdx % 24) + 24) % 24;
      const top = dy * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);

      headerYCells.push(
        <View
          key={`hy${dy}`}
          style={[
            styles.headerYCell,
            {
              top,
            },
          ]}
        >
          <Text style={styles.headerCellText}>{hourLabel(hour24)}</Text>
        </View>
      );
    }

    return (
      <View style={styles.dayViewContainer} {...panResponder.panHandlers}>
        {/* Corner */}
        <View style={styles.corner} />

        {/* Top Header (Dates) */}
        <View style={styles.headerX}>
          {headerXCells}
        </View>

        {/* Left Header (Hours) */}
        <View style={styles.headerY}>
          {headerYCells}
        </View>

        {/* Main Grid */}
        <View style={styles.grid}>
          {cells}
        </View>

        {/* Red Line Probe */}
        <View style={[styles.redLine, { left: redLineX - 1 }]} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Render current view */}
      {viewMode === 'month' ? renderMonthView() : renderDayView()}

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DateTimePicker
              value={tempSelectedDate}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setTempSelectedDate(selectedDate);
                }
              }}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonGo]}
                onPress={() => {
                  // Apply the selected date
                  // For now just close the modal
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalButtonText}>Go</Text>
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
    flex: 1,
    backgroundColor: '#fff',
  },

  // --- HEADER BUTTON STYLES ---
  headerDateButton: {
    padding: 8,
  },
  headerDateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    userSelect: 'none',
  },

  // --- MONTH VIEW STYLES ---
  monthViewContainer: {
    flex: 1,
    padding: 10,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthNavButton: {
    padding: 10,
  },
  monthNavButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dayCellInactive: {
    backgroundColor: '#f5f5f5',
  },
  dayCellText: {
    fontSize: 16,
  },
  dayCellTextInactive: {
    color: '#aaa',
  },

  // --- DAY VIEW STYLES ---
  dayViewContainer: {
    flex: 1,
    backgroundColor: '#eee',
  },
  corner: {
    position: 'absolute',
    width: HEADER_W,
    height: HEADER_H,
    top: 0,
    left: 0,
    backgroundColor: '#ccc',
    zIndex: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#888',
    borderRightWidth: 2,
    borderRightColor: '#888',
  },
  headerX: {
    position: 'absolute',
    left: HEADER_W,
    top: 0,
    right: 0,
    height: HEADER_H,
    backgroundColor: '#f7c',
    zIndex: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#888',
  },
  headerXCell: {
    position: 'absolute',
    height: HEADER_H,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#f7c',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerY: {
    position: 'absolute',
    top: HEADER_H,
    left: 0,
    bottom: 0,
    width: HEADER_W,
    zIndex: 10,
  },
  headerYCell: {
    position: 'absolute',
    width: HEADER_W,
    height: CELL_H,
    borderWidth: 1,
    borderColor: '#bbb',
    backgroundColor: '#acf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 14,
  },
  grid: {
    position: 'absolute',
    left: HEADER_W,
    top: HEADER_H,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  gridCell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellText: {
    fontSize: 14,
  },
  redLine: {
    position: 'absolute',
    top: 0,
    width: 2,
    height: HEADER_H,
    backgroundColor: 'red',
    zIndex: 100,
    pointerEvents: 'none',
  },

  // --- MODAL STYLES ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 5,
  },
  modalButtonCancel: {
    backgroundColor: '#999',
  },
  modalButtonGo: {
    backgroundColor: '#6200ee',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
