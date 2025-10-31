# Next Steps - Parenting Helper Development

## Current Status (Updated: 2025-10-31)

Currently working on: **Calendar Feature - Frontend UI**

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
6. `feat: Transform Day view to grid layout with hidden datetime` (pending)

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
