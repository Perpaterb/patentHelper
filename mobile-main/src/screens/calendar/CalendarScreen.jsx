/**
 * Calendar Screen
 *
 * Displays calendar with Month and Day views.
 * Day view implements externally-controlled infinite grid with probe highlight.
 */

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import API from '../../services/api';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

const HEADER_W = 50;
const HEADER_H = 40;
const CELL_H = 40;
const HIGHLIGHT_MS = 400;

// Helper functions
function hourLabel(hr24) {
  let h = ((hr24 % 24) + 24) % 24;
  let hour = h % 12 === 0 ? 12 : h % 12;
  let ampm = h < 12 ? 'am' : 'pm';
  return `${hour}${ampm}`;
}

function dateLabel(dayIdx) {
  let baseDate = new Date(2023, 9, 31);
  let date = new Date(baseDate);
  date.setDate(baseDate.getDate() + dayIdx);
  let d = date.getDate();
  let month = date.toLocaleString('default', { month: 'long' });
  let suffix =
    d % 10 === 1 && d !== 11 ? 'st' :
    d % 10 === 2 && d !== 12 ? 'nd' :
    d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  return `${d}${suffix} ${month}`;
}

function getSizes() {
  const { width, height } = Dimensions.get('window');
  const cellW = (width - HEADER_W) / 1.6;
  const headerCellW = width / 3;
  const padL = cellW * 2;
  const padT = CELL_H * 2;
  const gridW = width - HEADER_W;
  const gridH = height - HEADER_H;
  return { width, height, cellW, headerCellW, padL, padT, gridW, gridH };
}

// Convert target hour (0-23) and day offset to scroll floats
function getXYFloatForProbeTarget(targetHour, targetDay) {
  const { cellW, padL, padT, gridW, gridH } = getSizes();
  const redLineX = HEADER_W + 0.5 * cellW;
  const probeScreenY = HEADER_H + gridH / 2.5;
  const probeYInGrid = (probeScreenY - HEADER_H) / CELL_H;
  const probeXInGrid = (redLineX - HEADER_W) / cellW;

  return {
    scrollYFloat: targetHour - probeYInGrid + padT / CELL_H + 0.0001,
    scrollXFloat: targetDay - probeXInGrid + padL / cellW -0.5 + 0.0001,
  };
}

/**
 * InfiniteGrid - Externally controlled infinite scrolling grid
 */
function InfiniteGrid({ externalXYFloat, onXYFloatChange, events, navigation, groupId }) {
  const [renderTick, setRenderTick] = useState(0);
  const scrollYFloat = useRef(externalXYFloat.scrollYFloat);
  const scrollXFloat = useRef(externalXYFloat.scrollXFloat);

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
    multiple: 0,
  }).current;

  const dragStartY = useRef(0);
  const dragStartX = useRef(0);
  const scrollStartY = useRef(0);
  const scrollStartX = useRef(0);

  // Highlight state for cell under probe
  const [highlight, setHighlight] = useState({
    probeRow: 0,
    probeCol: 0,
    fade: new Animated.Value(0),
  });

  // Watch external driver
  React.useEffect(() => {
    scrollYFloat.current = externalXYFloat.scrollYFloat;
    scrollXFloat.current = externalXYFloat.scrollXFloat;
    setRenderTick((t) => t + 1);
  }, [externalXYFloat.scrollYFloat, externalXYFloat.scrollXFloat]);

  // PanResponder for grid drag
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
        let deltaY = gesture.moveY - dragStartY.current;
        let deltaX = gesture.moveX - dragStartX.current;
        scrollYFloat.current = scrollStartY.current - deltaY / CELL_H;
        scrollXFloat.current = scrollStartX.current - deltaX / cellW;
        setRenderTick((t) => t + 1);
        onXYFloatChange({
          scrollYFloat: scrollYFloat.current,
          scrollXFloat: scrollXFloat.current,
        });
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

  function startSnapToCol() {
    snapAnim.active = true;
    snapAnim.from = scrollXFloat.current;
    snapAnim.multiple = Math.round(scrollXFloat.current) - scrollXFloat.current;
    snapAnim.to = scrollXFloat.current + snapAnim.multiple;
    snapAnim.startT = Date.now();
    snapAnim.duration = 220;
    velocity.current.x = 0;
  }

  function animateStep() {
    let changed = false;
    if (snapAnim.active) {
      let t = (Date.now() - snapAnim.startT) / snapAnim.duration;
      if (t > 1) t = 1;
      scrollXFloat.current =
        snapAnim.from + (snapAnim.to - snapAnim.from) * (1 - Math.pow(1 - t, 2));
      changed = true;
      if (t >= 1) snapAnim.active = false;
      velocity.current.x = 0;
    }
    if (Math.abs(velocity.current.y) > 0.1) {
      scrollYFloat.current += velocity.current.y / CELL_H;
      velocity.current.y *= friction;
      changed = true;
    }
    if (Math.abs(velocity.current.x) > 0.1 && !snapAnim.active) {
      scrollXFloat.current += velocity.current.x / getSizes().cellW;
      velocity.current.x *= friction;
      changed = true;
    }
    if (changed) {
      setRenderTick((tick) => tick + 1);
      onXYFloatChange({
        scrollYFloat: scrollYFloat.current,
        scrollXFloat: scrollXFloat.current,
      });
    }
    if (
      snapAnim.active ||
      Math.abs(velocity.current.y) > 0.1 ||
      Math.abs(velocity.current.x) > 0.1
    ) {
      requestAnimationFrame(animateStep);
    }
  }

  // Rendering calculations
  const { width: winW, height: winH, cellW, headerCellW, padL, padT, gridW, gridH } = getSizes();

  const redLineX = HEADER_W + 0.5 * cellW;
  const probeScreenY = HEADER_H + gridH / 2.5;
  const firstCol = Math.floor(scrollXFloat.current - Math.ceil(padL / cellW));
  const firstRow = Math.floor(scrollYFloat.current - Math.ceil(padT / CELL_H));
  const visibleCols = Math.ceil(gridW / cellW) + 4;
  const visibleRows = Math.ceil(gridH / CELL_H) + 4;

  // Precise probe cell calculation
  const probeXInGrid = (redLineX - HEADER_W) / cellW;
  const probeYInGrid = (probeScreenY - HEADER_H) / CELL_H;
  const probeCol = Math.floor(scrollXFloat.current + probeXInGrid - padL / cellW);
  const probeRow = Math.floor(scrollYFloat.current + probeYInGrid - padT / CELL_H);

  // Highlight animation for cell under probe
  React.useEffect(() => {
    if (probeCol !== highlight.probeCol || probeRow !== highlight.probeRow) {
      highlight.fade.setValue(1);
      setHighlight({ probeRow, probeCol, fade: highlight.fade });
      Animated.timing(highlight.fade, {
        toValue: 0,
        duration: HIGHLIGHT_MS,
        useNativeDriver: false,
      }).start();
    }
  }, [probeCol, probeRow]);

  // Header X (date) cells
  const probeHour24 = ((probeRow % 24) + 24) % 24;
  const probeDayOffset = Math.floor(probeRow / 24);
  const probeDay = probeCol + probeDayOffset;

  const headerW = winW;
  const headerDaysShown = Math.ceil(headerW / headerCellW) + 4;
  const masterDayIdx = probeDay;
  const masterHourFrac = ((probeRow % 24) + 24) % 24 / 24;
  const headerNumEachSide = Math.ceil(headerDaysShown / 2);
  const headerStartX =
    HEADER_W + 0.5 * cellW - masterHourFrac * headerCellW - headerNumEachSide * headerCellW;

  let headerXcells = [];
  for (let i = -headerNumEachSide; i < headerDaysShown - headerNumEachSide; ++i) {
    let dayIdx = masterDayIdx + i;
    let left = headerStartX + (i + headerNumEachSide) * headerCellW;
    headerXcells.push(
      <View
        key={`hx${i}`}
        style={{
          position: 'absolute',
          left: left,
          width: headerCellW,
          height: HEADER_H,
          borderWidth: 1,
          borderColor: '#ddd',
          backgroundColor: '#f8f9fa',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Text numberOfLines={1} style={{ color: '#495057', fontWeight: '500' }}>
          {dateLabel(dayIdx)}
        </Text>
      </View>
    );
  }

  // Main grid cells
  let highlightCellLayout;
  let cells = [];
  for (let dx = 0; dx < visibleCols; ++dx) {
    for (let dy = 0; dy < visibleRows; ++dy) {
      let rowIdx = firstRow + dy;
      let colIdx = firstCol + dx;
      let hour24 = ((rowIdx % 24) + 24) % 24;
      let dayShift = Math.floor(rowIdx / 24);
      let cellDayCol = colIdx + dayShift;
      let left = dx * cellW - ((scrollXFloat.current - Math.floor(scrollXFloat.current)) * cellW);
      let top = dy * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);

      if (colIdx === probeCol && rowIdx === probeRow) {
        highlightCellLayout = { left: HEADER_W + left, top: HEADER_H + top, width: cellW, height: CELL_H };
      }

      cells.push(
        <View
          key={`c_${dx}_${dy}`}
          style={[
            styles.cell,
            { width: cellW, height: CELL_H, left: HEADER_W + left, top: HEADER_H + top },
          ]}
        >
          {/* Cell data (invisible but probe can still read hour24 and cellDayCol) */}
        </View>
      );
    }
  }

  // Header Y cells
  let headerYcells = [];
  for (let dy = 0; dy < visibleRows; ++dy) {
    let rowIdx = firstRow + dy;
    let hour24 = ((rowIdx % 24) + 24) % 24;
    let top = dy * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);
    headerYcells.push(
      <View
        key={`hy${dy}`}
        style={{
          position: 'absolute',
          top: HEADER_H + top,
          left: 0,
          width: HEADER_W,
          height: CELL_H,
          borderWidth: 1,
          borderColor: '#ddd',
          backgroundColor: '#f8f9fa',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#495057', fontSize: 12, fontWeight: '500' }}>
          {hourLabel(hour24)}
        </Text>
      </View>
    );
  }

  let probeHighlightView = null;
  if (highlightCellLayout && highlight && highlight.fade) {
    probeHighlightView = (
      <Animated.View
        style={{
          position: 'absolute',
          left: highlightCellLayout.left,
          top: highlightCellLayout.top,
          width: highlightCellLayout.width,
          height: highlightCellLayout.height,
          backgroundColor: 'rgba(255,206,10,0.13)',
          opacity: highlight.fade,
          borderRadius: 7,
          zIndex: 150,
        }}
        pointerEvents="none"
      />
    );
  }

  // Red line
  let redLine = (
    <View
      style={{
        position: 'absolute',
        left: redLineX - 1,
        top: 0,
        width: 2,
        height: HEADER_H,
        backgroundColor: 'red',
        zIndex: 150,
        pointerEvents: 'none',
      }}
    />
  );

  // Render events - split into hourly segments with scan-line algorithm for overlap layout
  let eventViews = [];
  if (events && events.length > 0) {
    const baseDate = new Date(2023, 9, 31); // Oct 31, 2023

    // Filter out child responsibility events (they render as lines, not rectangles)
    const regularEvents = events.filter(event => !event.isResponsibilityEvent);

    // STEP 1: Use scan-line algorithm to calculate slot assignments
    // This processes events at start/end points to find optimal column layout
    const eventLayouts = new Map(); // eventId -> {column, maxColumns}

    // Create scan events (start and end points)
    const scanEvents = [];
    regularEvents.forEach((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      scanEvents.push({ time: eventStart, type: 'start', event });
      scanEvents.push({ time: eventEnd, type: 'end', event });
    });

    // Sort scan events by time (start before end if same time)
    scanEvents.sort((a, b) => {
      if (a.time.getTime() !== b.time.getTime()) {
        return a.time - b.time;
      }
      return a.type === 'start' ? -1 : 1;
    });

    // Track active events and their columns
    const activeEvents = []; // Array of {event, column}
    const eventColumns = new Map(); // eventId -> column

    // Process scan events
    scanEvents.forEach((scanEvent) => {
      if (scanEvent.type === 'start') {
        // Find the first available column (leftmost)
        const usedColumns = new Set(activeEvents.map(e => e.column));
        let column = 0;
        while (usedColumns.has(column)) {
          column++;
        }

        // Assign this event to the column
        eventColumns.set(scanEvent.event.eventId, column);
        activeEvents.push({ event: scanEvent.event, column });

      } else { // type === 'end'
        // Remove this event from active events
        const index = activeEvents.findIndex(e => e.event.eventId === scanEvent.event.eventId);
        if (index !== -1) {
          activeEvents.splice(index, 1);
        }
      }
    });

    // STEP 2: Calculate max columns and expansion for each event
    // For each event, determine the maximum number of simultaneous events during its duration
    regularEvents.forEach((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const eventColumn = eventColumns.get(event.eventId);

      // Find all events that overlap with this one
      const overlappingEvents = regularEvents.filter((other) => {
        const otherStart = new Date(other.startTime);
        const otherEnd = new Date(other.endTime);
        return otherStart < eventEnd && otherEnd > eventStart;
      });

      // Calculate max columns needed during this event's lifetime
      const maxColumns = Math.max(...overlappingEvents.map(e => eventColumns.get(e.eventId) + 1));

      // Check if columns to the right are free (can this event expand?)
      const overlappingColumns = new Set(overlappingEvents.map(e => eventColumns.get(e.eventId)));
      let columnsToUse = 1;
      for (let col = eventColumn + 1; col < maxColumns; col++) {
        if (!overlappingColumns.has(col)) {
          columnsToUse++;
        } else {
          break; // Stop at first occupied column
        }
      }

      eventLayouts.set(event.eventId, {
        column: eventColumn,
        maxColumns,
        columnsToUse,
      });
    });

    // STEP 3: Render hour segments using pre-calculated layouts
    for (let dx = 0; dx < visibleCols; ++dx) {
      for (let dy = 0; dy < visibleRows; ++dy) {
        const rowIdx = firstRow + dy;
        const colIdx = firstCol + dx;
        const hour24 = ((rowIdx % 24) + 24) % 24;
        const dayShift = Math.floor(rowIdx / 24);
        const cellDayCol = colIdx + dayShift;

        // Calculate the actual date/time for this cell (1 hour slot)
        const cellDate = new Date(baseDate);
        cellDate.setDate(baseDate.getDate() + cellDayCol);
        cellDate.setHours(hour24, 0, 0, 0);
        const cellEndTime = new Date(cellDate.getTime() + 60 * 60 * 1000);

        // Find events that overlap with this hour
        regularEvents.forEach((event) => {
          const eventStart = new Date(event.startTime);
          const eventEnd = new Date(event.endTime);
          const overlaps = eventStart < cellEndTime && eventEnd > cellDate;

          if (overlaps) {
            const layout = eventLayouts.get(event.eventId);
            if (!layout) return;

            // Calculate the visible portion of the event in this hour slot
            const segmentStart = eventStart > cellDate ? eventStart : cellDate;
            const segmentEnd = eventEnd < cellEndTime ? eventEnd : cellEndTime;

            const startMinuteFraction = (segmentStart - cellDate) / (1000 * 60 * 60);
            const durationHours = (segmentEnd - segmentStart) / (1000 * 60 * 60);

            // Check if this is the first segment
            const isFirstSegment = eventStart >= cellDate && eventStart < cellEndTime;

            // Calculate position
            const left = dx * cellW - ((scrollXFloat.current - Math.floor(scrollXFloat.current)) * cellW);
            const top = (dy + startMinuteFraction) * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);

            // Layout within right half of column
            const availableWidth = cellW / 2;
            const columnWidth = availableWidth / layout.maxColumns;
            const eventWidth = columnWidth * layout.columnsToUse;
            const eventOffsetX = columnWidth * layout.column;

            const eventLeft = HEADER_W + left + (cellW / 2) + eventOffsetX;
            const eventTop = HEADER_H + top;
            const eventHeight = durationHours * CELL_H;

            const eventKey = `${event.eventId}_${rowIdx}_${colIdx}`;

            eventViews.push(
              <TouchableOpacity
                key={eventKey}
                style={{
                  position: 'absolute',
                  left: eventLeft,
                  top: eventTop,
                  width: eventWidth,
                  height: eventHeight,
                  backgroundColor: '#e3f2fd',
                  borderLeftWidth: 3,
                  borderLeftColor: '#2196f3',
                  padding: 2,
                  zIndex: 5,
                }}
                onPress={() => {
                  navigation.navigate('EditEvent', {
                    groupId: groupId,
                    eventId: event.eventId,
                  });
                }}
              >
                {isFirstSegment && (
                  <>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#1976d2',
                      }}
                    >
                      {event.title}
                    </Text>
                    {layout.columnsToUse > 1 && event.description && (
                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 9,
                          color: '#555',
                          marginTop: 1,
                        }}
                      >
                        {event.description}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          }
        });
      }
    }
  }

  // Render child responsibility event lines (left half of day column)
  let childEventViews = [];
  if (events && events.length > 0) {
    const baseDate = new Date(2023, 9, 31); // Oct 31, 2023

    // Flatten responsibility events into a single array with parent event timing
    const allResponsibilityLines = [];
    events.forEach((event) => {
      if (event.responsibilityEvents && event.responsibilityEvents.length > 0) {
        event.responsibilityEvents.forEach((re) => {
          allResponsibilityLines.push({
            responsibilityEventId: re.responsibilityEventId,
            eventId: event.eventId,
            startTime: event.startTime,
            endTime: event.endTime,
            childColor: re.child.iconColor,
            startAdultColor: re.startResponsibleMember?.iconColor || re.startResponsibleOtherColor,
            endAdultColor: re.endResponsibleMember?.iconColor || re.endResponsibleOtherColor,
            hasHandoff: !!re.endResponsibleMember || !!re.endResponsibleOtherName,
          });
        });
      }
    });

    // STEP 1: Use scan-line algorithm to calculate slot assignments for child events
    const childEventLayouts = new Map(); // responsibilityEventId -> {column, maxColumns, columnsToUse}

    // Create scan events (start and end points)
    const childScanEvents = [];
    allResponsibilityLines.forEach((line) => {
      const eventStart = new Date(line.startTime);
      const eventEnd = new Date(line.endTime);
      childScanEvents.push({ time: eventStart, type: 'start', line });
      childScanEvents.push({ time: eventEnd, type: 'end', line });
    });

    // Sort scan events by time (start before end if same time)
    childScanEvents.sort((a, b) => {
      if (a.time.getTime() !== b.time.getTime()) {
        return a.time - b.time;
      }
      return a.type === 'start' ? -1 : 1;
    });

    // Track active lines and their columns
    const activeLines = []; // Array of {line, column}
    const lineColumns = new Map(); // responsibilityEventId -> column

    // Process scan events
    childScanEvents.forEach((scanEvent) => {
      if (scanEvent.type === 'start') {
        // Find the first available column (leftmost)
        const usedColumns = new Set(activeLines.map(l => l.column));
        let column = 0;
        while (usedColumns.has(column)) {
          column++;
        }

        // Assign this line to the column
        lineColumns.set(scanEvent.line.responsibilityEventId, column);
        activeLines.push({ line: scanEvent.line, column });

      } else { // type === 'end'
        // Remove this line from active lines
        const index = activeLines.findIndex(l => l.line.responsibilityEventId === scanEvent.line.responsibilityEventId);
        if (index !== -1) {
          activeLines.splice(index, 1);
        }
      }
    });

    // STEP 2: Calculate max columns and expansion for each line
    allResponsibilityLines.forEach((line) => {
      const lineStart = new Date(line.startTime);
      const lineEnd = new Date(line.endTime);
      const lineColumn = lineColumns.get(line.responsibilityEventId);

      // Find all lines that overlap with this one
      const overlappingLines = allResponsibilityLines.filter((other) => {
        const otherStart = new Date(other.startTime);
        const otherEnd = new Date(other.endTime);
        return otherStart < lineEnd && otherEnd > lineStart;
      });

      // Calculate max columns needed during this line's lifetime
      const maxColumns = Math.max(...overlappingLines.map(l => lineColumns.get(l.responsibilityEventId) + 1));

      // Check if columns to the right are free (can this line expand?)
      const overlappingColumns = new Set(overlappingLines.map(l => lineColumns.get(l.responsibilityEventId)));
      let columnsToUse = 1;
      for (let col = lineColumn + 1; col < maxColumns; col++) {
        if (!overlappingColumns.has(col)) {
          columnsToUse++;
        } else {
          break; // Stop at first occupied column
        }
      }

      childEventLayouts.set(line.responsibilityEventId, {
        column: lineColumn,
        maxColumns,
        columnsToUse,
      });
    });

    // STEP 3: Render child event lines using pre-calculated layouts
    for (let dx = 0; dx < visibleCols; ++dx) {
      for (let dy = 0; dy < visibleRows; ++dy) {
        const rowIdx = firstRow + dy;
        const colIdx = firstCol + dx;
        const hour24 = ((rowIdx % 24) + 24) % 24;
        const dayShift = Math.floor(rowIdx / 24);
        const cellDayCol = colIdx + dayShift;

        // Calculate the actual date/time for this cell (1 hour slot)
        const cellDate = new Date(baseDate);
        cellDate.setDate(baseDate.getDate() + cellDayCol);
        cellDate.setHours(hour24, 0, 0, 0);
        const cellEndTime = new Date(cellDate.getTime() + 60 * 60 * 1000);

        // Find child lines that overlap with this hour
        allResponsibilityLines.forEach((line) => {
          const lineStart = new Date(line.startTime);
          const lineEnd = new Date(line.endTime);
          const overlaps = lineStart < cellEndTime && lineEnd > cellDate;

          if (overlaps) {
            const layout = childEventLayouts.get(line.responsibilityEventId);
            if (!layout) return;

            // Calculate the visible portion of the line in this hour slot
            const segmentStart = lineStart > cellDate ? lineStart : cellDate;
            const segmentEnd = lineEnd < cellEndTime ? lineEnd : cellEndTime;

            const startMinuteFraction = (segmentStart - cellDate) / (1000 * 60 * 60);
            const durationHours = (segmentEnd - segmentStart) / (1000 * 60 * 60);

            // Calculate position
            const left = dx * cellW - ((scrollXFloat.current - Math.floor(scrollXFloat.current)) * cellW);
            const top = (dy + startMinuteFraction) * CELL_H - ((scrollYFloat.current - Math.floor(scrollYFloat.current)) * CELL_H);

            // Layout within LEFT half of column
            const availableWidth = cellW / 2;
            const columnWidth = availableWidth / layout.maxColumns;
            const lineThickness = 4; // Thin lines, not rectangles
            const lineSpacing = 1; // Gap between child and adult lines
            const totalPairWidth = (lineThickness * 2) + lineSpacing; // 2 lines + gap
            const lineOffsetX = (columnWidth * layout.column) + ((columnWidth * layout.columnsToUse - totalPairWidth) / 2);

            const lineTop = HEADER_H + top;
            const lineHeight = durationHours * CELL_H;

            // Each child/adult pair = 2 thin vertical lines side by side
            // Line 1: Child color (left)
            // Line 2: Adult color (right, with small gap)
            const childLineKey = `${line.responsibilityEventId}_child_${rowIdx}_${colIdx}`;
            const adultLineKey = `${line.responsibilityEventId}_adult_${rowIdx}_${colIdx}`;

            // Child line (left)
            childEventViews.push(
              <View
                key={childLineKey}
                style={{
                  position: 'absolute',
                  left: HEADER_W + left + lineOffsetX,
                  top: lineTop,
                  width: lineThickness,
                  height: lineHeight,
                  backgroundColor: line.childColor,
                  zIndex: 4, // Below normal events (zIndex: 5)
                }}
              />
            );

            // Adult line (right, with gap)
            childEventViews.push(
              <View
                key={adultLineKey}
                style={{
                  position: 'absolute',
                  left: HEADER_W + left + lineOffsetX + lineThickness + lineSpacing,
                  top: lineTop,
                  width: lineThickness,
                  height: lineHeight,
                  backgroundColor: line.startAdultColor,
                  zIndex: 4,
                }}
              />
            );
          }
        });
      }
    }
  }

  return (
    <View style={styles.gridRoot} {...(!snapAnim.active && panResponder.panHandlers)}>
      {/* Top bar & header cells */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: HEADER_H,
          zIndex: 16,
          backgroundColor: '#f8f9fa',
          borderBottomWidth: 1,
          borderBottomColor: '#ddd',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
        }}
      >
        {headerXcells}
        {redLine}
      </View>
      {/* Left header Y col */}
      <View style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: HEADER_W, zIndex: 10 }}>
        {headerYcells}
      </View>
      {/* Highlighted cell */}
      {probeHighlightView}
      {/* Main grid */}
      <View style={{ flex: 1 }}>{cells}</View>
      {/* Child responsibility lines (left half) */}
      {childEventViews}
      {/* Event rectangles (right half) */}
      {eventViews}
    </View>
  );
}

/**
 * CalendarScreen component
 */
export default function CalendarScreen({ navigation, route }) {
  const { groupId } = route.params;

  // View mode: 'month' or 'day'
  const [viewMode, setViewMode] = useState('month');

  // Current month for Month view
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate initial position based on current date/time
  const getInitialPosition = () => {
    const now = new Date();
    const baseDate = new Date(2023, 9, 31); // Oct 31, 2023

    // Calculate day offset from base date
    const diffMs = now - baseDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Get current hour (round to nearest hour)
    const currentHour = now.getHours();

    // Use the helper function to get proper scroll position
    return getXYFloatForProbeTarget(currentHour, diffDays);
  };

  // Day view: External XY float state that drives the grid
  const [externalXYFloat, setExternalXYFloat] = useState(getInitialPosition());

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());

  // Event creation modal state
  const [showEventTypeModal, setShowEventTypeModal] = useState(false);

  // Events state
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  /**
   * Fetch events for a date range
   */
  const fetchEvents = async () => {
    try {
      setEventsLoading(true);

      // Fetch ALL events for this group (no date range filter)
      // This ensures consistent layout calculation across all scrolling positions
      const response = await API.get(`/groups/${groupId}/calendar/events`);

      if (response.data.success) {
        setEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  /**
   * Fetch events when view mode changes to day or when scrolling significantly
   */
  useEffect(() => {
    if (viewMode === 'day') {
      fetchEvents();
    }
  }, [viewMode, groupId]);

  /**
   * Refresh events when returning from CreateEvent or EditEvent screens
   */
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (viewMode === 'day') {
        fetchEvents();
      }
    });

    return unsubscribe;
  }, [navigation, viewMode]);

  // Calculate masterDayTimeDate from current probe position
  const { cellW, padL, padT, gridW, gridH } = getSizes();
  const redLineX = HEADER_W + 0.5 * cellW;
  const probeScreenY = HEADER_H + gridH / 2.5;
  const probeXInGrid = (redLineX - HEADER_W) / cellW;
  const probeYInGrid = (probeScreenY - HEADER_H) / CELL_H;
  const probeCol = Math.floor(externalXYFloat.scrollXFloat + probeXInGrid - padL / cellW);
  const probeRow = Math.floor(externalXYFloat.scrollYFloat + probeYInGrid - padT / CELL_H);
  const probeHour24 = ((probeRow % 24) + 24) % 24;
  const probeDayOffset = Math.floor(probeRow / 24);
  const probeDay = probeCol + probeDayOffset;
  const masterDayTimeDate = `${hourLabel(probeHour24)} - ${dateLabel(probeDay)}`;

  // Handle Go button - apply the selected date at 12pm
  const handleGoPress = () => {
    // Convert selected date to day offset, set hour to 12 (noon)
    const baseDate = new Date(2023, 9, 31);
    const daysDiff = Math.floor((tempSelectedDate - baseDate) / (1000 * 60 * 60 * 24));
    const targetHour = 12; // Always go to 12pm (noon)

    // Convert to scroll floats
    const newXYFloat = getXYFloatForProbeTarget(targetHour, daysDiff);
    setExternalXYFloat(newXYFloat);
    setShowDatePicker(false);
  };

  // Handle Cancel button - close modal without applying changes
  const handleCancelPress = () => {
    setShowDatePicker(false);
  };

  // Set header with toggle button
  useLayoutEffect(() => {
    if (viewMode === 'month') {
      navigation.setOptions({
        headerTitle: 'Calendar',
        headerRight: () => (
          <TouchableOpacity
            style={{ marginLeft: 10, marginRight: 10 }}
            onPress={() => setViewMode(viewMode === 'month' ? 'day' : 'month')}
          >
            <Text style={styles.viewToggleText}>{viewMode === 'day' ? 'Day' : 'Month'}</Text>
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => {
              setTempSelectedDate(new Date());
              setShowDatePicker(true);
            }}
            style={styles.headerDateButton}
          >
            <Text style={styles.headerDateText}>{masterDayTimeDate}</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={{ marginLeft: 10, marginRight: 10 }}
            onPress={() => setViewMode(viewMode === 'month' ? 'day' : 'month')}
          >
            <Text style={styles.viewToggleText}>{viewMode === 'day' ? 'Day' : 'Month'}</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, viewMode, masterDayTimeDate]);

  // Month view rendering
  const renderMonthView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let dayCounter = 1;

    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        if ((week === 0 && day < firstDay) || dayCounter > daysInMonth) {
          days.push(<View key={`${week}-${day}`} style={[styles.dayCell, styles.emptyDayCell]} />);
        } else {
          const isToday =
            dayCounter === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();
          days.push(
            <View key={`${week}-${day}`} style={[styles.dayCell, isToday && styles.todayCell]}>
              <Text style={[styles.dayText, isToday && styles.todayText]}>{dayCounter}</Text>
            </View>
          );
          dayCounter++;
        }
      }
      weeks.push(
        <View key={week} style={styles.weekRow}>
          {days}
        </View>
      );
      if (dayCounter > daysInMonth) break;
    }

    return (
      <View style={styles.monthViewContainer}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => {
            const newMonth = new Date(currentMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setCurrentMonth(newMonth);
          }}>
            <Text style={styles.monthNavButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={() => {
            const newMonth = new Date(currentMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            setCurrentMonth(newMonth);
          }}>
            <Text style={styles.monthNavButtonText}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekDaysRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={styles.weekDayText}>
              {day}
            </Text>
          ))}
        </View>
        {weeks}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {viewMode === 'month' ? (
        renderMonthView()
      ) : (
        <InfiniteGrid
          externalXYFloat={externalXYFloat}
          onXYFloatChange={setExternalXYFloat}
          events={events}
          navigation={navigation}
          groupId={groupId}
        />
      )}

      {/* Floating Action Button (only in Day view) */}
      {viewMode === 'day' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowEventTypeModal(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent={true} animationType="fade">
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

      {/* Event Type Choice Modal */}
      <Modal visible={showEventTypeModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New...</Text>
            <TouchableOpacity
              style={styles.eventTypeButton}
              onPress={() => {
                setShowEventTypeModal(false);
                // Calculate masterDateTime from probe position
                const baseDate = new Date(2023, 9, 31); // Oct 31, 2023
                const masterDateTime = new Date(baseDate);
                masterDateTime.setDate(baseDate.getDate() + probeDay);
                masterDateTime.setHours(probeHour24, 0, 0, 0);
                navigation.navigate('CreateEvent', {
                  groupId,
                  defaultStartDate: masterDateTime.toISOString()
                });
              }}
            >
              <Text style={styles.eventTypeIcon}>📅</Text>
              <View style={styles.eventTypeTextContainer}>
                <Text style={styles.eventTypeTitle}>Event</Text>
                <Text style={styles.eventTypeDescription}>
                  Meetings, appointments, reminders
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.eventTypeButton}
              onPress={() => {
                setShowEventTypeModal(false);
                // Calculate masterDateTime from probe position
                const baseDate = new Date(2023, 9, 31); // Oct 31, 2023
                const masterDateTime = new Date(baseDate);
                masterDateTime.setDate(baseDate.getDate() + probeDay);
                masterDateTime.setHours(probeHour24, 0, 0, 0);
                navigation.navigate('CreateChildEvent', {
                  groupId,
                  defaultStartDate: masterDateTime.toISOString()
                });
              }}
            >
              <Text style={styles.eventTypeIcon}>👶</Text>
              <View style={styles.eventTypeTextContainer}>
                <Text style={styles.eventTypeTitle}>Child Responsibility</Text>
                <Text style={styles.eventTypeDescription}>
                  Who's responsible for a child at this time
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 20 }]}
              onPress={() => setShowEventTypeModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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

  // Header button styles
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

  // Month view styles
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
  emptyDayCell: {
    backgroundColor: '#f5f5f5',
  },
  todayCell: {
    backgroundColor: '#e3f2fd',
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  dayText: {
    fontSize: 16,
  },
  todayText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },

  // Grid styles
  gridRoot: {
    flex: 1,
    backgroundColor: '#eee',
  },
  cell: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignSelf: 'flex-start',
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
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
    fontWeight: '600',
  },

  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },

  // Event Type Choice Modal
  eventTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTypeIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  eventTypeTextContainer: {
    flex: 1,
  },
  eventTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  eventTypeDescription: {
    fontSize: 14,
    color: '#666',
  },
});
