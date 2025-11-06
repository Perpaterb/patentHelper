# Calendar Event Rendering Implementation

**Last Updated**: 2025-11-06

## Overview

The calendar Day view implements a sophisticated event rendering system with smart overlap detection and layout optimization. Events are split into hourly segments and positioned using a scan-line algorithm to efficiently handle overlapping events.

## Architecture

### Infinite Diagonal Grid

The calendar uses a unique diagonal grid structure:
- **Rows**: Hours (0-23, repeating infinitely)
- **Columns**: Days (extending infinitely in both directions)
- **Base Date**: October 31, 2023 (reference point for day calculations)

**Grid Structure Example**:
```
Row 0:  │ 12am Oct 31 │ 12am Nov 1 │ 12am Nov 2 │ ...
Row 1:  │  1am Oct 31 │  1am Nov 1 │  1am Nov 2 │ ...
Row 23: │ 11pm Oct 31 │ 11pm Nov 1 │ 11pm Nov 2 │ ...
Row 24: │ 12am Nov 1  │ 12am Nov 2 │ 12am Nov 3 │ ...
```

The same date/time can appear in multiple grid positions due to the diagonal day shift logic.

### Event Positioning

Events occupy the **RIGHT HALF** of each day column (50% width):
- **Left half**: Reserved for child responsibility lines (future feature)
- **Right half**: Events area (can be subdivided for overlapping events)

## Event Rendering Algorithm

### Three-Phase Process

#### Phase 1: Scan-Line Algorithm (Column Assignment)

Uses an interval graph scan-line algorithm to assign columns to overlapping events:

1. **Create Scan Events**: Generate start/end points for all events
2. **Sort by Time**: Process chronologically (starts before ends at same time)
3. **Sweep Timeline**: Maintain list of active events
4. **Assign Columns**:
   - When event starts → assign leftmost available column
   - When event ends → free the column for reuse

**Example**:
```
Timeline: 4pm -------- 5pm -- 6pm ------- 10pm
Event A:  [===================]  (4-10pm) → Column 0
Event B:       [======]            (5-6pm) → Column 1

At 4pm: Event A starts, assigned column 0
At 5pm: Event B starts, column 0 occupied, assigned column 1
At 6pm: Event B ends, column 1 freed
At 10pm: Event A ends, column 0 freed
```

**Code Location**: `CalendarScreen.jsx` lines 371-417

#### Phase 2: Expansion Calculation

After column assignment, determine if events can expand rightward:

1. **Find Overlapping Events**: Get all events that overlap with current event's duration
2. **Calculate Max Columns**: Maximum simultaneous events during this event's lifetime
3. **Check Right Columns**: Attempt to expand into unused columns to the right
4. **Stop at First Conflict**: Expansion stops when encountering an occupied column

**Result**: Each event has `{column, maxColumns, columnsToUse}`

**Code Location**: `CalendarScreen.jsx` lines 419-452

#### Phase 3: Hourly Segment Rendering

Events are split into 1-hour segments for rendering:

1. **Iterate Visible Cells**: For each hour slot in the viewport
2. **Find Overlapping Events**: Check which events overlap with this hour
3. **Calculate Segment**: Determine visible portion of event in this hour
4. **Apply Pre-calculated Layout**: Use column/width from phases 1-2
5. **Render First Segment Only**: Show title/description only where event starts

**Segment Calculation**:
```javascript
segmentStart = max(eventStart, cellStart)
segmentEnd = min(eventEnd, cellEnd)
height = (segmentEnd - segmentStart) in hours × CELL_HEIGHT
```

**Code Location**: `CalendarScreen.jsx` lines 454-559

## Key Features

### 1. Consistent Layout Across Scrolling

- Fetches **ALL events** for the group (no date range filtering)
- Layout calculated once per render using all events
- Events maintain consistent width/position no matter where user scrolls

### 2. Hourly Segmentation

- Long events split into 1-hour rectangles
- Prevents text cutoff when scrolling
- Only first segment shows event title/description

### 3. Smart Overlap Handling

- Minimal column usage (optimal packing)
- Events expand rightward when space available
- Consistent 50/50 split for 2 overlapping events
- Equal division for 3+ overlapping events

### 4. Auto-Refresh on Navigation

- Calendar refreshes when returning from Create/Edit screens
- Scroll position preserved (doesn't reset to current time)
- Uses React Navigation `focus` listener

**Code Location**: `CalendarScreen.jsx` lines 596-607

## Visual Design

### Event Styling

```javascript
{
  backgroundColor: '#e3f2fd',      // Light blue
  borderLeftWidth: 3,
  borderLeftColor: '#2196f3',      // Blue accent
  padding: 2,
  zIndex: 5,                        // Below sticky headers
}
```

- **No rounded corners**: Sharp edges for cleaner grid alignment
- **3px left border**: Visual accent and event separation
- **Minimal padding**: Maximizes space for text in narrow events

### Text Display Rules

- **Title**: Always shown on first segment (11px bold, 1 line max)
- **Description**: Only shown if event uses >1 column AND is first segment (9px, 2 lines max)

## Performance Considerations

### Algorithm Complexity

- **Scan-line**: O(n log n) for sorting events
- **Expansion**: O(n²) worst case (all events overlap)
- **Rendering**: O(visible cells × events) per frame

### Optimization Strategies

1. **Single Fetch**: All events loaded once on calendar open
2. **Viewport Culling**: Only render events in visible hour cells
3. **Key-based Reconciliation**: React efficiently updates only changed segments
4. **Stable Layout**: No recalculation during scrolling

### Future Optimizations (if needed)

- Memoize layout calculation (only recalc when events change)
- Implement event virtualization for groups with 1000+ events
- Add incremental date range loading with smart cache invalidation

## File Structure

```
mobile-main/src/screens/calendar/
├── CalendarScreen.jsx           # Main calendar with Day/Month views
│   ├── InfiniteGrid component   # Virtual scrolling grid
│   └── Event rendering logic    # Scan-line algorithm (lines 366-559)
├── CreateEventScreen.jsx        # Event creation form
├── EditEventScreen.jsx          # Event editing + delete
└── CALENDAR_EVENT_RENDERING.md  # This documentation
```

## Related Files

- **AppNavigator.jsx**: Navigation registration for Create/Edit screens
- **api.js**: API service for fetching/creating/updating events
- **Backend**: `backend/controllers/calendar.controller.js` (event CRUD endpoints)

## API Integration

### Fetch Events
```javascript
GET /groups/:groupId/calendar/events
// No date range params - returns ALL events
Response: { success: true, events: [...] }
```

### Create Event
```javascript
POST /groups/:groupId/calendar/events
Body: {
  title, description, startTime, endTime,
  isRecurring, recurrenceRule, recurrenceEndDate
}
```

### Update Event
```javascript
PUT /groups/:groupId/calendar/events/:eventId
```

### Delete Event
```javascript
DELETE /groups/:groupId/calendar/events/:eventId
Query params: ?deleteSeries=true&fromDate=ISO
```

## Recurrence Support

Events support 6 recurrence frequencies:
- **DAILY**: Every day
- **WEEKLY**: Every week
- **FORTNIGHTLY**: Every 2 weeks (FREQ=WEEKLY;INTERVAL=2)
- **MONTHLY**: Every month
- **QUARTERLY**: Every 3 months (FREQ=MONTHLY;INTERVAL=3)
- **YEARLY**: Every year

**Recurrence Rules**: iCalendar RFC 5545 format
- Example: `FREQ=WEEKLY;INTERVAL=2;UNTIL=20251231`

## Testing Scenarios

### Overlap Cases to Test

1. **No Overlap**: Single event → full 50% width
2. **2 Events Same Time**: Each gets 25% width
3. **3 Events Same Time**: Each gets ~16.7% width
4. **Partial Overlap**:
   - Event A: 4pm-10pm
   - Event B: 5pm-6pm
   - Both get 25% width (share space during 5-6pm)
5. **Sequential Events**:
   - Event A: 4pm-5pm → full 50% width
   - Event B: 5pm-6pm → full 50% width (no overlap)

### Edge Cases

- Event spanning midnight (crosses day boundary)
- Event spanning multiple days (72+ hours)
- Events with same start time but different durations
- Events starting/ending at non-hour boundaries (e.g., 2:30pm)

## Child Responsibility Events

### Overview

Child responsibility events track which adult is responsible for which child during a specific time period. These render as **lines** (not rectangles) on the **LEFT HALF** of the day column.

### Data Structure

Backend uses the `ChildResponsibilityEvent` model with the following fields:

**Per Child/Adult Pairing:**
- `childId`: Reference to child group member
- `startResponsibilityType`: Either "member" or "other"
- `startResponsibleMemberId`: Group member ID (if type = "member")
- `startResponsibleOtherName`: Manual entry name (if type = "other", e.g., "School")
- `startResponsibleOtherIconLetters`: Icon letters for manual entry
- `startResponsibleOtherColor`: Color for manual entry
- `endResponsibilityType`: Same options as start (for handoff)
- `endResponsibleMemberId`, `endResponsibleOtherName`, etc.: Handoff person

**Code Location**: `backend/prisma/schema.prisma` - `ChildResponsibilityEvent` model

### UI Requirements

**Creation Screen** (`CreateChildEventScreen.jsx`):
1. **Children Selection**: Multi-select checkboxes for all children in group
   - Validation: At least 1 child required
2. **Responsible Adult**: Two options
   - Group Member: Dropdown of Admin/Parent/Caregiver roles
   - Manual Entry: Text input + color picker (e.g., "School", "Afterschool Care")
   - Validation: Exactly 1 required
3. **Optional Handoff**: Checkbox to enable handoff at end time
   - Same options as responsible adult (member or manual entry)
   - Handoff occurs exactly at event end time
4. **Recurrence Support**: Same as normal events (6 frequencies)

**Color Picker**: 16 predefined colors for manual entries
- Ensures consistent, visible colors across the app
- Used for both responsible adult and handoff person

### Line Rendering (Left Half)

**Structure:**
- Each child/adult pairing = **2 lines** stacked vertically
  - Line 1: Child's member color
  - Line 2: Adult's color (from member profile or manual entry)
- Small gap between different child/adult groups
- Lines span full height of event duration
- Use LEFT HALF of day column (0-50% width)

**Example Layout:**
```
├─ Left Half (Child Events) ─┤ ├─ Right Half (Normal Events) ─┤
│ Child1 color ──────────────│ │                              │
│ Adult1 color ──────────────│ │    Normal Event             │
│ (gap)                      │ │                              │
│ Child2 color ──────────────│ ├──────────────────────────────┤
│ Adult1 color ──────────────│ │    Normal Event             │
│ (gap)                      │ │                              │
│ Child3 color ──────────────│ └──────────────────────────────┘
│ Adult2 color ──────────────│
└────────────────────────────┘
```

**Overlap Handling:**
- Use same scan-line algorithm as normal events
- Applied independently to left half
- Lines can be subdivided into columns if overlapping

**Color Sources:**
- Child color: From `GroupMember.iconColor` field
- Adult color (member): From `GroupMember.iconColor` field
- Adult color (manual): From `startResponsibleOtherColor` field

**No Text Labels:**
- Lines are purely color-coded (no names displayed)
- Users identify children/adults by memorizing colors
- Tap line to see details in edit screen

### Implementation Status

**✅ Completed:**
- Backend schema already supports child events (no changes needed)
- `CreateChildEventScreen.jsx` with full UI
  - Children multi-select
  - Responsible adult picker (member or manual)
  - Manual entry with color picker
  - Optional handoff support
  - Recurrence support
- Navigation routes registered
- **Line rendering on left half of day column** (CalendarScreen.jsx lines 561-755)
  - Flattens `responsibilityEvents` from calendar events
  - Each child/adult pair = 2 stacked lines (50/50 split)
  - Child color (top), adult color (bottom)
  - Supports member colors AND manual entry colors
- **Scan-line algorithm for child event overlaps** (CalendarScreen.jsx lines 585-664)
  - Column assignment using interval graph scan-line
  - Expansion calculation for optimal width usage
  - Independent layout from normal events (left half only)
- **Hourly segment rendering** (CalendarScreen.jsx lines 666-754)
  - Lines split into 1-hour segments (prevents cutoff during scroll)
  - Rendered at zIndex: 4 (below normal events)
  - Consistent layout across all scroll positions

**✅ Completed:**
- ✅ Make bars tappable (navigate to edit screen)
- ✅ Edit child event screen (EditChildEventScreen.jsx)
- ✅ Delete child event functionality (single, series, or from date)
- ✅ Tappable bars with TouchableOpacity overlay (zIndex: 7)
- ✅ View child/adult assignments in edit screen

**📋 TODO:**
- Handoff indicator at end time (visual marker on bar)
- Show tooltip/details on long-press (child name, adult name)

## Known Limitations

1. **No Color Coding for Normal Events**: All normal events use same blue color (future: event types/categories)
2. **No Drag-and-Drop**: Events not draggable (future: quick reschedule)
3. **Single Group Only**: Layout calculated per-group, not across groups
4. **No Touch Target Expansion**: Touch area = visual size (may be small for narrow lines/events)

## Future Enhancements

- [ ] Event color coding by category/member
- [ ] Drag-and-drop event rescheduling
- [ ] Long-press for quick actions menu
- [ ] Event search/filter
- [ ] Month view event indicators
- [ ] Week view layout
- [ ] Export to iCal/Google Calendar
