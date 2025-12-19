# Calendar Day View - Implementation Documentation

**Last Updated:** December 2024
**Branch:** `fix/calendar-day-view-scroll`
**Working Commit:** `411daea`

This document captures the complete implementation details of the Calendar Day View's infinite scrolling grid, hour bar, and date bar. Use this as a reference if future changes break the current working state.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Constants](#key-constants)
3. [Core Concepts](#core-concepts)
4. [The Probe System](#the-probe-system)
5. [Hour Bar (Left Vertical)](#hour-bar-left-vertical)
6. [Date Bar (Top Horizontal)](#date-bar-top-horizontal)
7. [Main Grid Animation](#main-grid-animation)
8. [Spring Animation Settings](#spring-animation-settings)
9. [Common Gotchas & Fixes](#common-gotchas--fixes)
10. [Debugging Tips](#debugging-tips)

---

## Overview

The Calendar Day View is an infinite scrolling 2D grid where:
- **X-axis (horizontal):** Days (columns)
- **Y-axis (vertical):** Hours (rows, 0-23 repeating infinitely)
- **Probe:** A fixed screen position that detects which cell (day + hour) is currently selected

The grid scrolls underneath a fixed "probe" point. As the user scrolls, different cells pass under the probe, updating the selected date/time.

### Architecture

```
┌─────────────────────────────────────────────┐
│  Date Bar (horizontal, scrolls with X)      │
├──────┬──────────────────────────────────────┤
│ Hour │                                      │
│ Bar  │        Main Grid                     │
│ (Y)  │     (scrolls X and Y)                │
│      │                                      │
│      │           ◆ PROBE (fixed position)   │
│      │                                      │
└──────┴──────────────────────────────────────┘
```

---

## Key Constants

```javascript
const HEADER_W = 50;      // Width of hour bar (left)
const HEADER_H = 40;      // Height of date bar (top)
const CELL_H = 40;        // Height of each hour cell
const HIGHLIGHT_MS = 400; // Duration of highlight animation when cell changes
```

### Calculated Sizes (from `getSizes()`)

```javascript
function getSizes() {
  const { width, height } = Dimensions.get('window');
  const cellW = (width - HEADER_W) / 1.6;        // Grid cell width
  const headerCellW = width / 3;                  // Date bar cell width
  const padL = cellW * 2;                         // Left padding (cells)
  const padT = CELL_H * 2;                        // Top padding (cells)
  const gridW = width - HEADER_W;                 // Grid width
  const gridH = height - HEADER_H;                // Grid height
  return { width, height, cellW, headerCellW, padL, padT, gridW, gridH };
}
```

---

## Core Concepts

### Shared Values (Reanimated)

The animation system uses two shared values that drive ALL animations:

```javascript
const scrollXFloat = useSharedValue(initialX);  // Horizontal scroll position
const scrollYFloat = useSharedValue(initialY);  // Vertical scroll position
```

These are **float values** that represent the current scroll position in "cell units":
- `scrollXFloat = 780.5` means we're halfway between column 780 and 781
- `scrollYFloat = 14.25` means we're 1/4 of the way from row 14 to row 15

### UI Thread vs JS Thread

**CRITICAL:** Smooth 60fps animation requires running on the UI thread.

- `useAnimatedStyle` - Runs on UI thread, can read shared values directly
- `useAnimatedReaction` - Watches shared values on UI thread, can trigger JS callbacks
- `runOnJS()` - Bridges from UI thread to JS thread (causes slight delay)

**Rule:** Animation transforms use `useAnimatedStyle`. React state updates use `runOnJS()` inside `useAnimatedReaction`.

---

## The Probe System

The "probe" is a fixed screen position that detects which grid cell is underneath it.

### Probe Screen Position

```javascript
const redLineX = HEADER_W + 0.5 * cellW;                    // X position on screen
const probeScreenY = HEADER_H + gridH / 2.5 + CELL_H / 2;   // Y position on screen
```

The probe is positioned:
- **X:** Half a cell width to the right of the hour bar
- **Y:** About 40% down the grid (2.5 divisor), centered in a cell

### Probe Cell Calculation

```javascript
// Convert screen position to grid position
const probeXInGrid = (redLineX - HEADER_W) / cellW;
const probeYInGrid = (probeScreenY - HEADER_H) / CELL_H;

// Calculate which cell is under the probe
const probeCol = Math.floor(scrollXFloat.value + probeXInGrid - padL / cellW);
const probeRow = Math.floor(scrollYFloat.value + probeYInGrid - padT / CELL_H);

// Calculate the actual day (accounting for hour overflow)
const probeDayOffset = Math.floor(probeRow / 24);
const probeDay = probeCol + probeDayOffset;

// Calculate hour (0-23)
const probeHour = ((probeRow % 24) + 24) % 24;
```

### Day Calculation Logic

The grid wraps hours vertically. When you scroll past 11pm (row 23), you enter row 24 which is 12am of the NEXT day.

```
Row 0-23:   Day N, hours 0-23
Row 24-47:  Day N+1, hours 0-23
Row 48-71:  Day N+2, hours 0-23
...
```

Formula:
- `probeDayOffset = Math.floor(probeRow / 24)` - How many days to add
- `probeDay = probeCol + probeDayOffset` - Actual day index

---

## Hour Bar (Left Vertical)

The hour bar displays hours 12am-11pm in a repeating cycle.

### How It Works

1. **Render fixed cells:** Render 24 + visible + buffer cells (never re-renders)
2. **Cycle with modulo:** Use `scrollYFloat % 24` to create infinite cycling
3. **Animate transform:** Translate the container based on scroll position

### Cell Rendering (Static)

```javascript
const headerYcells = useMemo(() => {
  const cells = [];
  const totalHours = 24 + Math.ceil(gridH / CELL_H) + 4; // 24 hours + visible + buffer
  for (let i = 0; i < totalHours; ++i) {
    const hour24 = i % 24;
    cells.push(
      <View key={`hy${i}`} style={{ position: 'absolute', top: i * CELL_H, ... }}>
        <Text>{hourLabel(hour24)}</Text>
      </View>
    );
  }
  return cells;
}, [gridH]); // Only re-render if screen size changes
```

### Animation Transform

```javascript
const headerYAnimatedStyle = useAnimatedStyle(() => {
  // Subtract 1 hour offset to align with probe detection
  const cyclePosition = (((scrollYFloat.value - 1) % 24) + 24) % 24;
  const offsetY = cyclePosition * CELL_H;
  return {
    transform: [{ translateY: -offsetY }],
  };
});
```

**Key Points:**
- `-1` offset aligns the hour bar with probe detection
- Double modulo `((...% 24) + 24) % 24` ensures positive values
- Cells are positioned at `top: i * CELL_H` (fixed positions)
- Container transform creates the scrolling illusion

### Hour Label Helper

```javascript
function hourLabel(hr24) {
  let h = ((hr24 % 24) + 24) % 24;
  let hour = h % 12 === 0 ? 12 : h % 12;
  let ampm = h < 12 ? 'am' : 'pm';
  return `${hour}${ampm}`;
}
```

---

## Date Bar (Top Horizontal)

The date bar displays dates and scrolls horizontally with the grid.

### Key Difference from Hour Bar

The hour bar cycles (0-23 repeats forever), but **dates don't cycle** - each day is unique. This required a different approach.

### How It Works

1. **Calculate visible days:** Determine which days should be rendered based on probe position
2. **Position cells absolutely:** Each cell is positioned at `left = dayIdx * headerCellW`
3. **Animate with exact probe position:** Transform aligns probe day with screen position

### Cell Rendering

```javascript
// Calculate visible days based on screen width
const visibleDays = Math.ceil(headerW / headerCellW) + 6; // Extra buffer for smooth scrolling

// Center the visible range around the probe day
const firstVisibleDay = Math.floor(probeDay) - Math.ceil(visibleDays / 2);

let headerXcells = [];
for (let i = 0; i < visibleDays; i++) {
  const dayIdx = firstVisibleDay + i;
  // CRITICAL: Position based on ABSOLUTE day index, not array index
  const left = dayIdx * headerCellW;
  headerXcells.push(
    <View key={`day_${dayIdx}`} style={{ position: 'absolute', left: left, ... }}>
      <Text>{dateLabel(dayIdx)}</Text>
    </View>
  );
}
```

**CRITICAL FIX:** Using `left = dayIdx * headerCellW` (absolute position) instead of `left = i * headerCellW` (array index) prevents cells from jumping when scrolling.

### Animation Transform

```javascript
const headerXAnimatedStyle = useAnimatedStyle(() => {
  const { headerCellW, padL, padT, gridH } = getSizes();
  const redLineX = HEADER_W + 0.5 * cellW;
  const probeScreenY = HEADER_H + gridH / 2.5 + CELL_H / 2;
  const probeXInGrid = (redLineX - HEADER_W) / cellW;
  const probeYInGrid = (probeScreenY - HEADER_H) / CELL_H;

  // Calculate exact (continuous) probe position
  const probeColExact = scrollXFloat.value + probeXInGrid - padL / cellW;
  const probeRowExact = scrollYFloat.value + probeYInGrid - padT / CELL_H;

  // Calculate continuous day position (not floored)
  // -0.5 offset (12 hours) aligns date bar with probe detection
  const probeDayExact = probeColExact + probeRowExact / 24 - 0.5;

  // Position so probeDayExact aligns with redLineX
  const probeDayPosition = probeDayExact * headerCellW;
  const offsetX = probeDayPosition - redLineX;

  return {
    transform: [{ translateX: -offsetX }],
  };
});
```

**Key Points:**
- Uses continuous `probeDayExact` (not floored) for smooth animation
- `-0.5` offset aligns the date bar with probe detection
- Cells at absolute positions + container transform = smooth scrolling

### Date Label Helper

```javascript
function dateLabel(dayIdx) {
  let baseDate = new Date(2023, 9, 31); // October 31, 2023 = day 0
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
```

---

## Main Grid Animation

The main grid uses a similar approach to the hour bar.

### Animation Transform

```javascript
const gridAnimatedStyle = useAnimatedStyle(() => {
  const { cellW: cw } = getSizes();
  const offsetX = (scrollXFloat.value - Math.floor(scrollXFloat.value)) * cw;
  const offsetY = (scrollYFloat.value - Math.floor(scrollYFloat.value)) * CELL_H;
  return {
    transform: [
      { translateX: -offsetX },
      { translateY: -offsetY },
    ],
  };
});
```

This uses the **fractional part** of scroll position to offset the grid, while React re-renders handle adding/removing cells at the edges.

---

## Spring Animation Settings

When the user releases a scroll gesture, the grid snaps to the nearest cell with spring animation.

### Current Working Values

```javascript
scrollXFloat.value = withSpring(snappedX, {
  damping: 50,      // Higher = less oscillation (was 20, caused bouncing)
  stiffness: 300,   // Higher = faster settling (was 200)
  velocity: -event.velocityX / cellW,
}, () => {
  // Callback when spring completes
});
```

**History:**
- `damping: 20, stiffness: 200` - Too bouncy, oscillated 2-3 times before settling
- `damping: 50, stiffness: 300` - Smooth, settles quickly without visible bounce

---

## Common Gotchas & Fixes

### 1. Date Bar Cells Jumping/Shifting

**Symptom:** When scrolling forward, cells appear to jump backwards then forward.

**Cause:** Cells positioned with array index (`left = i * headerCellW`) instead of absolute day index.

**Fix:** Use `left = dayIdx * headerCellW` so day_780 is always to the right of day_779.

### 2. Date Bar 12 Hours Early/Late

**Symptom:** Date bar shows wrong date, offset by ~12 hours.

**Fix:** Add `-0.5` offset to `probeDayExact`:
```javascript
const probeDayExact = probeColExact + probeRowExact / 24 - 0.5;
```

### 3. Hour Bar 1 Hour Off

**Symptom:** Hour bar shows 1pm when grid shows 12pm.

**Fix:** Add `-1` offset in the animation:
```javascript
const cyclePosition = (((scrollYFloat.value - 1) % 24) + 24) % 24;
```

### 4. Spring Animation Bouncing Too Much

**Symptom:** Grid bounces 2-3 times before settling after release.

**Fix:** Increase damping from 20 to 50, stiffness from 200 to 300.

### 5. Text Updating Multiple Times Before Settling

**Symptom:** Date/time text flickers or changes multiple times during spring animation.

**Cause:** React state updates (`runOnJS`) during animation.

**Fix:** Use `useAnimatedReaction` with `settledPosition` state that only updates when spring completes, not during animation.

### 6. View Mode Toggle Shows Wrong Day

**Symptom:** Switching from month to day view jumps to wrong date.

**Fix:** Pass current probe day to toggle handler and use it for positioning:
```javascript
const handleViewModeToggle = (currentProbeDay) => {
  if (viewMode === 'month') {
    const newPosition = getXYFloatForProbeTarget(12, currentProbeDay); // 12 = midday
    setExternalXYFloat(newPosition);
    setViewMode('day');
  } else {
    setViewMode('month');
  }
};
```

---

## Debugging Tips

### Add Probe Dot

To visualize where the probe is detecting:

```javascript
<View style={{
  position: 'absolute',
  left: redLineX - 5,
  top: probeScreenY - 5,
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: 'red',
  zIndex: 9999,
}} />
```

### Log Probe Detection

In `useAnimatedReaction`:
```javascript
runOnJS(console.log)('[Probe] day:', current.probeDay, 'col:', current.probeCol, 'row:', current.probeRow);
```

### Log Date Bar Animation

In `headerXAnimatedStyle`:
```javascript
console.log('[DateBarAnim] probeDayExact:', probeDayExact, 'offsetX:', offsetX);
```

### Add Cell IDs to Date Bar

```javascript
<Text style={{ fontSize: 8, color: '#999' }}>day_{dayIdx}</Text>
```

### Check Which Cells Are Rendered

```javascript
console.log('[DateBar] cells:', firstVisibleDay, 'to', firstVisibleDay + visibleDays - 1);
```

---

## Recovery Commands

If you need to restore this working state:

```bash
# Check out the working commit
git checkout 411daea

# Or restore just the calendar file
git checkout 411daea -- mobile-main/src/screens/calendar/CalendarScreen.jsx
```

---

## File Reference

**Main File:** `/home/andrew/dev/familyHelper/mobile-main/src/screens/calendar/CalendarScreen.jsx`

**Key Functions:**
- `getSizes()` - Calculate dimensions (lines ~65-74)
- `getXYFloatForProbeTarget()` - Convert target hour/day to scroll position (lines ~77-94)
- `InfiniteGrid` component - Main grid implementation (lines ~100+)
- `headerYAnimatedStyle` - Hour bar animation (lines ~257-266)
- `headerXAnimatedStyle` - Date bar animation (lines ~225-253)
- `gridAnimatedStyle` - Main grid animation (lines ~222-232)

---

## Summary

The Calendar Day View uses:

1. **Shared values** (`scrollXFloat`, `scrollYFloat`) as the single source of truth
2. **UI thread animations** via `useAnimatedStyle` for 60fps performance
3. **Fixed cell positions** with container transforms for smooth scrolling
4. **Modulo cycling** for the hour bar (24-hour repeat)
5. **Absolute positioning** for the date bar (unique days)
6. **Spring animations** with tuned damping/stiffness for settling behavior
7. **Probe detection** to determine which cell is "selected"

The key insight for the date bar was using **absolute day positions** (`left = dayIdx * headerCellW`) instead of array indices, preventing the cell jumping issue when scrolling forward.
