# Next Steps - Parenting Helper Development

## Current Status (Updated: 2025-12-04)

Currently working on: **Phone Call Recording Complete - Video Recording Pending**

---

## Phone Call Recording System - MILESTONE COMPLETE (2025-12-04)

**STATUS: FULLY WORKING**

See `backend/CALL_RECORDING_SYSTEM.md` for comprehensive technical documentation.

### What Was Built

A **server-side "Ghost Recorder"** system using Puppeteer (headless Chrome) that:
- Joins calls as an invisible participant
- Records all audio streams via MediaRecorder API
- Uploads recordings automatically when call ends
- Stores recordings with MP3 conversion for universal playback

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Puppeteer Ghost Recorder | Server-side capture ensures all participants are recorded regardless of client implementation |
| Web Audio API Silent Stream | Avoids Puppeteer's fake audio device click track while satisfying WebRTC requirements |
| REST-based Signaling | Simpler than WebSocket for intermittent recorder connections |
| Auto-refresh Polling | Better UX than requiring manual refresh after call ends |

### Problems Solved

1. **Click Track Noise (CRITICAL FIX)**
   - **Problem:** Puppeteer's fake audio device produced audible clicking during calls
   - **Solution:** Replaced `getUserMedia()` with silent Web Audio API oscillator stream
   - **File:** `backend/public/recorder.html`

2. **Auto-Refresh After Recording Upload**
   - **Problem:** Users had to navigate away and back to see recording
   - **Solution:** Polling mechanism (5s intervals, 60s max) checks for recording availability
   - **Files:** `PhoneCallDetailsScreen.jsx`, `VideoCallDetailsScreen.jsx`

3. **Audio Player Seek Not Working on Web**
   - **Problem:** Progress bar not clickable on Expo Web, seek dot overflowing
   - **Solution:** Platform-specific event handling (offsetX vs locationX), transform instead of marginLeft
   - **Files:** `AudioPlayer.jsx`, `PhoneCallDetailsScreen.jsx`

### Features Implemented

- [x] Phone call recording start/stop via Puppeteer
- [x] Silent audio stream (no click track)
- [x] Automatic recording upload on call end
- [x] Auto-refresh polling for recording availability
- [x] Unified audio player styling (messages + call recordings match)
- [x] Seek functionality on progress bar (tap to jump)
- [x] Web platform support for audio player
- [x] Removed misleading participant count

### Dropped Features (Intentionally)

- **Recording indicator delay** - Multiple attempts broke signaling endpoints (404 errors). Decided the 1-2 second delay is acceptable.

### Pending Work

- [ ] **Video Call Recording** - Infrastructure exists but not yet active
  - recorder.service.js supports `callType: 'video'`
  - Need video stream capture in recorder.html
  - Need WebM → MP4 conversion
  - Need VideoCallDetailsScreen video playback

---

**Just completed (2025-12-04):**
- ✅ Phone call recording click track fix (silent Web Audio stream)
- ✅ Auto-refresh polling for recording availability
- ✅ Audio player seek functionality (tap progress bar to jump)
- ✅ Unified audio player styling (messages match call recordings)
- ✅ Web platform audio player fixes (seek bar, overflow)
- ✅ Comprehensive documentation (backend/CALL_RECORDING_SYSTEM.md)

**Just completed (2025-12-02):**
- ✅ Force app update feature for outdated app versions
  - Backend: GET /health/app-version endpoint with configurable min versions
  - Frontend: ForceUpdateModal (non-dismissible), useVersionCheck hook
  - Opens appropriate app store when update required
- ✅ Web image/video viewer improvements
  - Fullscreen support using 90% of browser window dimensions
  - Download button added to VideoPlayer (matching ImageViewer)
  - Platform-specific download handling (web uses `<a>` element)
  - File extension fixes for downloaded files
- ✅ HEIC image upload support
  - Added heic-convert package for HEIC to JPEG conversion
  - Magic byte detection for HEIC files
  - Fixed Sharp library limitation (no native HEIC codec)
- ✅ Secure Documents fixes
  - Fixed category validation ('secure-documents' instead of 'documents')
  - Fixed downloadUrl missing in response
  - Fixed 404 errors for secure document downloads
  - Platform-specific download (web vs native)

**Previously completed (2025-11-24):**
- ✅ USER_STORIES.md created with 100+ test scenarios
- ✅ Testing infrastructure set up (Jest, React Testing Library)
- ✅ Support/Feedback button on Groups List screen
- ✅ Verified all major features implemented

**Previously completed (2025-11-23):**
- ✅ Wiki feature with Markdown editing and document management
- ✅ Secure Document Storage (upload, download, hide/unhide by admins)
- ✅ Comprehensive audit logging for ALL member actions
- ✅ API documentation updated for all new endpoints
- ✅ Photo/Video upload in Messages, Gift Registry, Profile
- ✅ Calendar event dots and child event lines in Month view

**Audit Logging Coverage:**
- Messages: send, read, hide
- Wiki: create, update, delete
- Gift Registries: all CRUD operations + purchases
- Item Registries: all CRUD operations
- Secret Santa: create, matches, delete, resend emails
- Finance: all operations including messages
- Documents: upload, download, hide/unhide, delete
- Calendar: create, update, delete events
- Groups: all member management operations
- Approvals: voting and outcomes

**Previous work (2025-11-06):**
- ✅ Implemented swipeable month calendar with PanResponder
- ✅ Always shows 6 rows (matches example code)
- ✅ Smooth momentum scrolling with snap-to-month
- ✅ masterDateTime highlighting (purple border/background)
- ✅ Current day highlighting (blue border/background - different from masterDateTime)
- ✅ Tappable day cells navigate to Day view at 12pm
- ✅ Swipe left/right to navigate between months

**Completed (previously listed as TODO):**
- ✅ Event dots at bottom of calendar cells
- ✅ Child event lines in top 70% of cells
- ✅ Photo/Video upload in Messages, Gift Registry, Profile

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

### Calendar Frontend - Event Creation & Editing (2025-11-06)
- [x] Created event creation screen with all fields
  - Title, description, start date/time, end date/time
  - Recurring event toggle with 6 frequency options (Daily, Weekly, Fortnightly, Monthly, Quarterly, Yearly)
  - Recurrence end date picker with "Forever" option
  - Modal carousel-style date/time pickers with OK/Cancel buttons
  - Default start date from probe position (masterDateTime)
  - Default end date = start + 1 hour
- [x] Created event editing screen with delete functionality
  - Fetch and populate existing event data
  - Parse recurrence rules to detect FORTNIGHTLY/QUARTERLY
  - Update event via PUT request
  - Delete single event or entire recurring series
  - Delete future events in series option
- [x] Registered navigation routes for Create/Edit screens
- [x] Implemented FAB (Floating Action Button) in Day view
  - Opens event type modal (Event vs Child Responsibility)
  - Passes masterDateTime to CreateEventScreen

**Files modified:**
- `mobile-main/src/screens/calendar/CreateEventScreen.jsx` (created)
- `mobile-main/src/screens/calendar/EditEventScreen.jsx` (created)
- `mobile-main/src/navigation/AppNavigator.jsx` (lines 164-172)
- `mobile-main/src/screens/calendar/CalendarScreen.jsx` (lines 636-730)

### Calendar Frontend - Event Rendering with Scan-Line Algorithm (2025-11-06)
- [x] Implemented scan-line algorithm for optimal event overlap layout
  - **Phase 1**: Column assignment using interval graph scan-line algorithm
  - **Phase 2**: Expansion calculation (events take rightmost available space)
  - **Phase 3**: Hourly segment rendering with pre-calculated layout
- [x] Event positioning and styling
  - Events occupy RIGHT HALF of day column (left reserved for child responsibilities)
  - Split into 1-hour segments (prevents text cutoff when scrolling)
  - Title shown only on first segment
  - Description shown only if event uses >1 column
  - Sharp corners (no border-radius) for clean grid alignment
  - Light blue background (#e3f2fd) with blue left border
  - zIndex: 5 (renders below sticky headers)
- [x] Smart overlap handling
  - Minimal column usage (optimal packing)
  - Events expand rightward when space available
  - 50/50 split for 2 overlapping events
  - Equal division for 3+ overlapping events
  - Consistent layout regardless of scroll position
- [x] Auto-refresh on navigation
  - Calendar refreshes when returning from Create/Edit screens
  - Fetches ALL events (no date range filter) for consistent layout
  - Scroll position preserved (doesn't reset)
  - Uses React Navigation `focus` listener

**Technical Implementation:**
- Lines 366-452: Scan-line algorithm (column assignment + expansion)
- Lines 454-559: Hourly segment rendering loop
- Lines 596-607: Auto-refresh on navigation focus
- Lines 641-657: Fetch all events (removed date range filtering)

**Algorithm Complexity:**
- Scan-line sorting: O(n log n)
- Expansion calculation: O(n²) worst case
- Rendering: O(visible cells × events) per frame

**Documentation:**
- Created `mobile-main/CALENDAR_EVENT_RENDERING.md` (comprehensive technical documentation)

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`
- `mobile-main/CALENDAR_EVENT_RENDERING.md` (created)

### Calendar Frontend - Child Responsibility Events UI (2025-11-06)
- [x] Created child event creation screen
  - Multi-select checkboxes for children (at least 1 required)
  - Responsible adult: Group member (Admin/Parent/Caregiver) OR manual entry
  - Manual entry: Text input + color picker (16 predefined colors)
  - Icon letter generation from manual entry name (e.g., "School" → "SC")
  - Optional handoff at end time (same options as responsible adult)
  - Full recurrence support (same 6 frequencies as normal events)
  - Validation: Requires at least 1 child and exactly 1 responsible adult
- [x] Registered navigation route for CreateChildEventScreen
- [x] Updated FAB modal to navigate to child event creation
  - Passes masterDateTime from probe position
- [x] Updated documentation with child event architecture
  - Data structure (ChildResponsibilityEvent model)
  - UI requirements and validation rules
  - Line rendering specification (2 lines per child/adult pairing)
  - Color sources (member colors vs manual entry colors)

**Technical Details:**
- Backend schema already supports child events (no changes needed)
- Data posted as `responsibilityEvents` array (one entry per child)
- Each entry includes start/end responsibility type and person details
- Manual entries store name, icon letters, and color

**Files created:**
- `mobile-main/src/screens/calendar/CreateChildEventScreen.jsx`

**Files modified:**
- `mobile-main/src/navigation/AppNavigator.jsx` (line 31, lines 169-173)
- `mobile-main/src/screens/calendar/CalendarScreen.jsx` (lines 906-917)
- `mobile-main/CALENDAR_EVENT_RENDERING.md` (child events section added)

### Calendar Frontend - Child Event Line Rendering (2025-11-06)
- [x] Implemented child event line rendering on left half of day column
  - Fetches child events from `responsibilityEvents` nested in calendar events
  - Flattens responsibility events into single array with parent event timing
  - Each child/adult pairing = 2 lines stacked vertically (50/50 split)
    - Line 1: Child's member color (top half)
    - Line 2: Adult's color from member profile OR manual entry color (bottom half)
  - Applied scan-line algorithm independently to child events for overlap handling
  - Lines render at zIndex: 4 (below normal events at zIndex: 5)
  - Lines occupy LEFT HALF of day column (0-50% width)
  - Normal events occupy RIGHT HALF (50-100% width)
- [x] Layout calculation uses same 3-phase process as normal events:
  - Phase 1: Scan-line algorithm assigns columns to overlapping lines
  - Phase 2: Expansion calculation (lines take rightmost available space)
  - Phase 3: Hourly segment rendering with pre-calculated layout
- [x] Child lines support same overlap features as normal events:
  - Minimal column usage (optimal packing)
  - Lines expand rightward when space available
  - Consistent layout regardless of scroll position

**Technical Implementation:**
- Lines 561-755: Child event line rendering logic
- Lines 567-583: Flatten responsibilityEvents into allResponsibilityLines array
- Lines 585-664: Scan-line algorithm for child event column assignment
- Lines 666-754: Hourly segment rendering loop
- Lines 712-750: Render 2 lines per child/adult pair (stacked vertically)
- Line 787: Render childEventViews before eventViews

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Child Event Edit & Delete (2025-11-06)
- [x] Made child event bars tappable with TouchableOpacity
  - Bars navigate to EditChildEventScreen on press
  - TouchableOpacity overlay at zIndex: 7 captures all taps
  - Visual feedback with activeOpacity: 0.7
- [x] Created EditChildEventScreen with full edit functionality
  - Fetch and display event details (title, notes, dates, recurrence)
  - Show child responsibility assignments (read-only summary)
  - Update event metadata (title, notes, dates, recurrence)
  - Note: Child assignments cannot be edited (must delete and recreate)
- [x] Implemented delete functionality for child events
  - Delete single event
  - Delete entire recurring series
  - Delete this and future events (from date)
  - Uses same API as normal events
- [x] Registered EditChildEventScreen route in navigation

**Technical Implementation:**
- Lines 728-806: TouchableOpacity wrapper for child event bars (CalendarScreen.jsx)
- Lines 775-780: Navigation to EditChildEvent with groupId and eventId params
- EditChildEventScreen.jsx: Complete edit/delete screen (550+ lines)
  - Displays responsibility events summary (child, adult, handoff)
  - Helper text explains assignments can't be edited
  - Delete options for single/series/from date

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`
- `mobile-main/src/screens/calendar/EditChildEventScreen.jsx` (created)
- `mobile-main/src/navigation/AppNavigator.jsx`

### Calendar Frontend - Unified Month/Day View State (2025-11-06)
- [x] Removed separate `currentMonth` state
- [x] Created `masterDateTime` Date object from `externalXYFloat` probe position
- [x] Added banner button to Month view (same as Day view)
  - Shows current datetime in banner
  - Tap to open date picker
  - Works in both Month and Day views
- [x] Updated Month view to use `masterDateTime` instead of `currentMonth`
- [x] Month navigation arrows (← →) update shared datetime state
  - Previous month: Sets date to 1st of previous month at 12pm
  - Next month: Sets date to 1st of next month at 12pm
  - Updates `externalXYFloat` using `getXYFloatForProbeTarget`
- [x] Seamless view switching
  - Toggle between Month/Day maintains exact datetime
  - No separate state management per view
  - Single source of truth: `externalXYFloat`

**Technical Implementation:**
- Lines 944-951: Calculate masterDateTime Date object from probe position (CalendarScreen.jsx)
- Lines 972-994: Unified header with banner button for both views
- Lines 996-1026: handlePreviousMonth and handleNextMonth functions
- Lines 1028-1087: renderMonthView uses masterDateTime

**User Experience:**
- User can view current datetime in banner on both Month and Day views
- Switching between views preserves the exact date/time
- Month navigation updates the shared datetime state
- Date picker works consistently in both views

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

### Calendar Frontend - Swipeable Month View (2025-11-06)
- [x] Replaced static month view with swipeable calendar
- [x] Implemented PanResponder for horizontal swipe gestures
- [x] Always renders 6 rows (matches standard calendar layout)
- [x] Smooth momentum scrolling with friction (0.93)
- [x] Snap-to-month animation (220ms duration with cubic easing)
- [x] Renders 5 months simultaneously (center ± 2)
- [x] Updates masterDateTime when swiping to new month
- [x] Two-level highlighting system:
  - Today: Light blue background (#e3f2fd) with blue border
  - MasterDateTime: Light purple background (#f3e5f5) with purple border
- [x] Tappable day cells navigate to Day view at 12pm
- [x] Outside month days shown in light gray

**Technical Implementation:**
- Lines 996-1009: Month view constants and state
- Lines 1011-1031: getMonthMatrix (always 6 rows)
- Lines 1033-1039: getAdjacentMonths helper
- Lines 1041-1046: useMemo for 5 months array
- Lines 1048-1088: Month swipe animation loop
- Lines 1090-1107: Snap animation with cubic easing
- Lines 1109-1129: PanResponder for swipe gestures
- Lines 1131-1143: handleDayTap navigation
- Lines 1145-1201: renderSingleMonthView with highlighting
- Lines 1203-1225: renderMonthView with transform

**Animation Details:**
- Same approach as Day view (PanResponder + requestAnimationFrame)
- Velocity multiplier: 18 (matches Day view feel)
- Friction: 0.93 (smooth deceleration)
- Snap threshold: 8px horizontal movement
- Transform: translateX for smooth 60fps scrolling

**User Experience:**
- Swipe left → next month
- Swipe right → previous month
- Tap any day → jump to that day at 12pm in Day view
- Purple highlight shows selected date (masterDateTime)
- Blue highlight shows today's date
- Gray text for days outside current month

**Files modified:**
- `mobile-main/src/screens/calendar/CalendarScreen.jsx`

## Calendar Tasks Status

### Completed
- [x] Make child event lines tappable (navigate to edit screen)
- [x] Create EditChildEventScreen with delete functionality
- [x] Event dots in Month view cells
- [x] Child event lines rendering with overlap algorithm

### UI Only (Backend Integration Deferred to Phase 6)
- [ ] Handoff indicator at event end time (UI placeholder exists)
- [ ] Event color coding by category/member (uses default colors)
- [ ] Member tagging to events for notifications
- [ ] Event reminder/notification settings

### Backend Integration (Phase 6 - AWS Deployment)
- [ ] Push notification delivery
- [ ] Email notification delivery
- [ ] Event approval workflows for admin-restricted groups

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

## Photo/Video Upload Implementation (COMPLETE)

### Status (2025-11-24)
**All mobile app upload features implemented and tested.**

**Backend - Complete:**
- ✅ Admin storage tracking in localStorageService
  - Tracks storage against ALL admins in group
  - Updates storage_usage table per user+group+mediaType
  - Updates users.storageUsedBytes for billing
  - Returns chargedAdminIds for audit logging
- ✅ File upload endpoints with authentication
  - requireAuth middleware on all upload routes
  - Group membership validation
  - File size limits per category (5MB-100MB)
  - Category support: messages, gift-registry, wiki, item-registry, profile-photos
- ✅ Audit logging for all uploads

**Frontend - Complete:**
- ✅ MediaPicker component (Expo ImagePicker)
- ✅ Photo/Video upload in Messages (with preview and send)
- ✅ Photo upload in Gift Registry items
- ✅ Profile photo upload (My Account/Settings)

### Future: Admin File Deletion (Web App Only)

**CRITICAL REQUIREMENT**: Admins need ability to delete files to free storage quota.

**Key Business Rules**:
- **Web App Only**: File deletion ONLY in web-admin Storage Management page
- **Mobile Apps**: NO deletion capability (prevents accidents)
- **Approval Required**: >50% admin approval needed
- **24-Hour Grace Period**: Soft delete → wait 24hrs → hard delete
- **Permanent Deletion**: File content permanently deleted (not recoverable)
- **Audit Trail**: Filenames preserved in audit logs forever
- **Multiple Warnings**: Show MULTIPLE warnings before requesting approval

**Implementation Details**:
See `PHOTO_VIDEO_UPLOAD_PLAN.md` Section 8 for complete specification:
- Approval workflow (request → vote → soft delete → grace period → hard delete)
- Storage recalculation (decrement for all admins)
- UI/UX considerations (batch selection, preview, impact calculator)
- Database schema updates (hard_deleted_at, deletion_approval_id)
- Comprehensive audit logging (5 separate log entries per deletion)
- UI updates for deleted files ("🗑️ File deleted (filename.jpg)")

**Dependencies**:
- Requires approval system fully implemented
- Web-admin Storage Management page
- Email notification system
- Scheduled task system (for 24hr grace period)

## Next Phase: Web Admin App Development

**Mobile App Status: FEATURE COMPLETE** (as of 2025-11-24)

All core features for mobile-main are implemented:
- Authentication (Kinde)
- Groups & Members management
- Messaging with media upload
- Calendar (Month/Day views, events, child responsibilities)
- Finance tracking
- Gift Registry with photos
- Wiki with document management
- Secure Document Storage
- Profile photos
- Support/Feedback form
- Audit logging (all actions)

**Not Implemented (Deferred to Phase 6):**
- Push notifications (requires AWS SNS)
- Email notifications (requires AWS SES)
- Event approval workflows

**Next Steps:**
1. Begin web-admin app development (React)
2. Implement subscription management with Stripe
3. Create admin dashboard and storage management
4. Build audit log export functionality
5. Test web-mobile integration (subscribe on web → access on mobile)

## Future Features: Call Recording & Storage Management

### Call Recording Format Requirements (2025-12-03)
**Phone Call Recordings:**
- Must be converted to MP3 format (universal playback)
- Use same audioConverter service as voice messages
- Storage category: `phonecall` (distinct from `audio` for voice messages)

**Video Call Recordings:**
- Must be converted to MP4 format (universal playback)
- Need to create videoConverter service (similar to audioConverter)
- Storage category: `videocall` (distinct from `video` for uploaded videos)

### Storage Management by Type (Web Admin)
**Requirement:** Admins must be able to view, filter, and delete files by type in Storage Management screen.

**Storage Types (MediaType enum values):**
1. `image` - Uploaded photos
2. `video` - Uploaded videos
3. `audio` - Voice message recordings
4. `phonecall` - Phone call recordings (even though they're audio)
5. `videocall` - Video call recordings (even though they're videos)
6. `document` - PDFs, docs, etc.

**Features Required:**
- Filter by media type (dropdown or tabs)
- Show file list with:
  - Thumbnail/icon
  - Filename
  - Size
  - Upload date
  - Uploader name
- Delete functionality with "Deleted by [admin name]" shown to all users
- Group by group (show which group each file belongs to)

**User-Facing Display:**
- When file is deleted, show: "🗑️ [filename] - Deleted by [Admin Name]"
- Keep filename visible in audit logs forever
- File content is permanently deleted (not recoverable)

**Database Considerations:**
- MessageMedia.mediaType already exists (varchar 20)
- Need to ensure 'phonecall' and 'videocall' are valid values
- Storage usage should track by these types separately
