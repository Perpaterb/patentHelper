# Next Steps - Parenting Helper Development

## Current Status (Updated: 2025-11-04)

Currently working on: **Calendar Feature - 2-Column Virtual Grid Day View**

## Recently Completed Tasks

### Calendar Frontend - Date Picker Modal (2025-10-31)
- [x] Fixed calendar view toggle button (Month/Day labels were backwards)
- [x] Fixed date picker modal not appearing on banner click
- [x] Added Previous/Next day navigation buttons to Day view
- [x] Replaced native date picker with custom centered modal popup
  - Centered modal with semi-transparent overlay
  - Day/Month/Year carousel pickers (reordered from Month/Day/Year)
  - Go and Cancel buttons at bottom of modal
  - Fixed text truncation in month/year pickers
- [x] Reverted to native DateTimePicker per user preference
  - Using iOS spinner display mode
  - Date order (Day/Month/Year vs Month/Day/Year) controlled by device locale
- [x] Re-implemented centered modal with native DateTimePicker inside
  - Go button applies selected date
  - Cancel button dismisses without changes
  - Temporary state prevents unwanted updates while scrolling
- [x] Fixed toggle button text highlighting by removing background style

### Calendar Frontend - Day View Grid Layout (2025-10-31)
- [x] Transformed Day view to display grid of rectangles
  - Master datetime variable remains active but hidden
  - Removed datetime display UI (datetimeDisplay, datetimeLabel, datetimeValue, instructionText)
  - Added grid generation: 20 placeholder items
  - Changed container from View to ScrollView
  - Grid rectangles: 50px height, 150px width (exact specs)
  - Flex row layout with wrapping
  - Swipe gestures continue to control datetime in background
  - Previous/Next day navigation buttons remain functional

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`
  - Lines 277-327: `renderDayView()` function restructured
  - Lines 590-610: Added grid styles (gridContainer, gridRectangle, gridRectangleText)

**Commits:**
1. `fix: Correct calendar view toggle logic and date picker behavior`
2. `feat: Replace native date picker with custom modal date selector`
3. `fix: Improve date picker display - reorder to Day/Month/Year and use abbreviations`
4. `refactor: Switch back to native DateTimePicker with spinner display`
5. `feat: Add centered modal date picker with Go/Cancel buttons`
6. `feat: Transform Day view to grid layout with hidden datetime`
7. `fix: Implement virtual grid with cross-axis pollution fix and visual offset compensation` (pending)

### Calendar Frontend - 2-Column Virtual Grid Day View (2025-11-03)
- [x] Implemented 2-column infinite virtual scrolling grid
  - Left column: Hour labels (12am, 1am, etc.)
  - Right column: Event slots (Today, Tomorrow, Yesterday calculated dynamically)
  - Virtual rendering: Only renders visible cells + buffer rows
  - Smooth 60fps pan gesture handling with React Native Reanimated
- [x] Fixed cross-axis pollution bug in drag gestures
  - Added re-anchoring of drag origins after cell boundary crosses
  - Prevents horizontal movement from affecting vertical scroll and vice versa
  - Uses `startTranslationX` and `startTranslationY` shared values
- [x] Fixed visual glitch showing wrong hour labels during scroll
  - Implemented visual offset compensation
  - Hour labels calculated from both logical scroll position AND visual offset
  - Added extra buffer rows (+4) and render one row above viewport
  - Ensures labels are always correct regardless of animation timing

**Technical Implementation:**
- Lines 77-79: Added re-anchor shared values for cross-axis fix
- Lines 201-207: Batched state update function to reduce React renders
- Lines 283-340: Pan gesture handler with normalization and re-anchoring
- Lines 360, 372: Animation callbacks using batched updates
- Lines 431-435: Buffer rows calculation and extra top row rendering
- Lines 441-447: Visual offset compensation for grid cells
- Lines 479-482: Visual offset compensation for left header cells

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Float-Based Scrolling Rewrite (2025-11-03)
- [x] Replaced Reanimated implementation with float-based scrolling
  - Removed React Native Reanimated and GestureHandler dependencies
  - Added PanResponder for gesture handling
  - Used `useRef` for float scroll values (`scrollYFloat`, `scrollXFloat`)
  - Direct position calculation from fractional part of float
  - Eliminated timing issues between UI thread and JS thread
- [x] Restored original button styling from CalendarScreen_OLD.jsx
  - Added `styles.headerDateButton`, `styles.headerDateText`, `styles.viewToggleText`
  - Fixed button toggle logic to use ternary operator
  - Button shows current view mode and toggles correctly

**Technical Changes:**
- Lines 49-70: Added float-based scroll state with `useRef`
- Lines 157-198: Implemented PanResponder for gesture handling
- Lines 200-255: Updated header with named styles and fixed toggle logic
- Lines 337-340: Direct cell position calculation using fractional scroll
- Lines 546-559: Added header button style definitions

**Commits:**
1. `refactor: Replace Reanimated with float-based scrolling for calendar Day view`
2. `fix: Restore original button styling and fix toggle logic`

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Externally Controlled Grid with Probe Highlight (2025-11-04)
- [x] Implemented externally-controlled infinite grid
  - `externalXYFloat` state drives the grid position
  - `onXYFloatChange` callback updates parent state
  - Grid watches external state via `useEffect`
- [x] Added probe cell highlighting
  - Yellow highlight fades out over 400ms when probe cell changes
  - Uses Animated API for smooth fade animation
  - Highlight positioned at exact probe cell location
- [x] Restored `masterDayTimeDate` variable
  - Calculated from probe position (hour + day)
  - Displayed in header banner button
  - Updates in real-time as grid scrolls
- [x] Implemented date picker integration
  - Banner button opens date picker modal
  - `handleDatePickerConfirm` converts selected date to scroll floats
  - Uses `getXYFloatForProbeTarget` to calculate target position
  - Grid jumps to selected date/time when confirmed
- [x] Updated grid sizing
  - `headerCellW = width / 3` (was /6)
  - `velocity.current.x = 0` in `onPanResponderGrant` (was removed)

**Technical Implementation:**
- Lines 62-73: `getXYFloatForProbeTarget` function converts date/time to scroll floats
- Lines 78-394: `InfiniteGrid` component with external control
- Lines 109-113: `useEffect` watches external XY float changes
- Lines 217-227: Probe cell highlight animation with fade effect
- Lines 418-429: `masterDayTimeDate` calculation in CalendarScreen
- Lines 432-444: `handleDatePickerConfirm` converts date picker to scroll position

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Date Picker Modal Restoration (2025-11-04)
- [x] Fixed date picker modal to use Day/Month/Year wheels
  - Changed `mode="datetime"` to `mode="date"`
  - Only shows date wheels (no time selector)
- [x] Restored Go/Cancel button functionality
  - Go button sets time to 12pm (noon) and updates grid position
  - Cancel button closes modal without applying changes
  - Buttons update `externalXYFloat` to jump to selected date
- [x] Applied proper styling from CalendarScreen_OLD.jsx
  - Restored `modalContent`, `modalButtons`, `cancelButton`, `goButton` styles
  - Gray Cancel button (`#f5f5f5`) with dark gray text
  - Purple Go button (`#6200ee`) with white text
  - Buttons are properly sized and spaced

**Technical Implementation:**
- Lines 431-447: `handleGoPress` sets `targetHour = 12` (noon)
- Lines 572-595: Date picker modal with Go/Cancel buttons
- Lines 697-739: Complete modal styles matching original design

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Fix Grid Position and Probe Positioning (2025-11-04)
- [x] Fixed grid position offset by adjusting scroll calculation
  - Problem: Grid was positioned half a cell to the right when master time was set
  - Solution: Added `-0.5` offset to `scrollXFloat` calculation in `getXYFloatForProbeTarget`
  - Line 71: `scrollXFloat: targetDay - probeXInGrid + padL / cellW - 0.5 + 0.0001`
- [x] Adjusted probe vertical positioning for better alignment
  - Changed `probeScreenY` from `HEADER_H + gridH / 2` to `HEADER_H + gridH / 2.5`
  - Applied consistently at lines 65, 204, and 421
  - Moves the probe higher up on screen for better visibility and interaction

**Technical Details:**
- The `-0.5` offset in scrollXFloat compensates for the grid column alignment
- The `/ 2.5` divisor for probeScreenY positions the probe at 40% from top instead of 50%
- Both changes ensure the date picker jumps to the correct grid position

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

## Pending Calendar Tasks

### High Priority
- [ ] Test Day view scrolling and momentum
- [ ] Fix real-time datetime updates during swipe (original issue)
- [ ] Test and tune scroll sensitivity (HOURS_PER_SCREEN_SWIPE variable)

### Feature Additions
- [ ] Add event type selection (Child Event vs Normal Event) to create form
- [ ] Add member tagging to events for notifications
- [ ] Add event reminder/notification settings

### Backend Integration
- [ ] Connect calendar screens to backend API
- [ ] Implement event CRUD operations
- [ ] Add event approval workflows for admin-restricted groups
- [ ] Implement event notifications

## Git Commit Rules (MANDATORY)

**CRITICAL**: Before ANY commit, you MUST:

1. **Run Tests**: `npm test` must pass
2. **Update Documentation** (Non-negotiable):
   - Update NEXT_STEPS.md with completed tasks marked [x]
   - Update README.md if API/dependencies/setup changed
   - Update appplan.md if requirements evolved
3. **Code Quality**:
   - Run `npm run lint` in changed directories
   - Run `npm run format` to format code
4. **Security Check**:
   - Verify no secrets or .env files are staged
   - No hardcoded credentials in code

**Commit Message Format** (Conventional Commits):
- `feat: Add new feature`
- `fix: Bug fix`
- `refactor: Code refactoring`
- `docs: Documentation updates`
- `test: Add or update tests`
- `chore: Maintenance tasks`

**If documentation is not updated, DO NOT commit.**

## Current Architecture Notes

### Calendar Implementation Details
- **CalendarScreen** has two view modes: Month and Day
- **Master datetime variable** (`masterDayViewDateTime`) controls Day view
  - Remains active in state but NOT displayed in UI
  - Used by swipe gestures and navigation buttons
- **Day view display**: Grid of rectangles
  - 20 placeholder items (50px height, 150px width each)
  - Flex row layout with wrapping
  - ScrollView container for scrolling
- **Vertical swipe gestures** change time in Day view
  - Swipe up = time moves forward
  - Swipe down = time moves backward
  - Full screen swipe = 8 hours (configurable via `HOURS_PER_SCREEN_SWIPE`)
- **Date picker**: Native DateTimePicker wrapped in centered Modal
  - Temporary state for preview before applying
  - Go button applies changes
  - Cancel button dismisses
- **Navigation**: Previous/Next buttons for both Month and Day views

### Known Issues/Gotchas
- Device locale settings control date wheel order in native picker (not customizable in code)
- Toggle button text can highlight on some devices (removed background styling to fix)
- Time component must be preserved when changing dates in Day view

## Next Session Priorities

1. Test and refine Day view scrolling mechanics
2. Implement real-time datetime display updates during swipe
3. Connect to backend API for event data
4. Add event creation functionality
