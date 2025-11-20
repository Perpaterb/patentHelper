# Date Picker Standards

All date/time pickers in this app follow consistent formatting and positioning standards.

## Positioning

All date picker modals are **centered on screen** using:

```javascript
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
}
```

## Date/Time Formats

There are three standard formats used throughout the app:

### Format 1: Full DateTime with Minutes
**Layout (left to right):** Year → Month (full name) → Day → Hour (24hr) → Minutes (5 min intervals)

**Use case:** Calendar events (start time, end time)

**Implementation:**
```javascript
<DateTimePicker
  value={date}
  mode="datetime"
  display="spinner"
  textColor="#000"
  locale="en-GB"
  is24Hour={true}
  minuteInterval={5}
/>
```

### Format 2: DateTime with Hour Only (No Minutes)
**Layout (left to right):** Year → Month (full name) → Day → Hour (24hr)

**Use case:** Secret Santa exchange date, reveal names date

**Implementation:**
The standard `@react-native-community/datetimepicker` does NOT support hiding the minutes wheel in `datetime` mode. To achieve hour-only selection, use **two separate pickers**:

```javascript
// Date picker
<DateTimePicker
  value={date}
  mode="date"
  display="spinner"
  textColor="#000"
  locale="en-GB"
/>

// Time picker (hour only)
<DateTimePicker
  value={date}
  mode="time"
  display="spinner"
  textColor="#000"
  locale="en-GB"
  is24Hour={true}
  minuteInterval={60}
/>
```

**Alternative:** Use a custom hour picker component with ScrollView/FlatList.

### Format 3: Date Only
**Layout (left to right):** Year → Month (full name) → Day

**Use case:** Recurrence end dates, birthdays

**Implementation:**
```javascript
<DateTimePicker
  value={date}
  mode="date"
  display="spinner"
  textColor="#000"
  locale="en-GB"
/>
```

## Key Props Explained

| Prop | Value | Purpose |
|------|-------|---------|
| `mode` | `"datetime"`, `"date"`, `"time"` | Determines which wheels to show |
| `display` | `"spinner"` | Shows iOS-style picker wheels |
| `locale` | `"en-GB"` | British English - provides 24hr format and Day/Month/Year order |
| `is24Hour` | `true` | Forces 24-hour time format (no AM/PM) |
| `minuteInterval` | `5` or `60` | Interval between minute options |
| `textColor` | `"#000"` | Black text for visibility |

## Important Notes

### Locale Selection
- `en-GB` (British English) is used because it:
  - Defaults to 24-hour time
  - Shows full month names
  - Uses Day/Month/Year order

- `en-AU` (Australian English) uses 12-hour format by default
- `en-US` (American English) uses Month/Day/Year order

### Consistency Requirement
**CRITICAL:** All DateTimePicker components across the app MUST use the same props (`locale`, `is24Hour`, etc.) to prevent the "contamination" issue where viewing one picker affects others.

### minuteInterval Limitation
Setting `minuteInterval={60}` does NOT hide the minutes wheel - it only shows `:00` as the only option. The minutes wheel will still be visible.

To truly hide minutes, you must:
1. Use separate date and time pickers, OR
2. Build a custom picker component

## Files Using Date Pickers

### Calendar Screens (Format 1 - with minutes)
- `src/screens/calendar/CreateEventScreen.jsx`
- `src/screens/calendar/EditEventScreen.jsx`
- `src/screens/calendar/CreateChildEventScreen.jsx`
- `src/screens/calendar/EditChildEventScreen.jsx`

### Secret Santa Screens (Format 2 - hour only, needs refactor)
- `src/screens/groups/CreateSecretSantaScreen.jsx`

### Recurrence End Dates (Format 3 - date only)
- Used within the Calendar screens above for "Repeat Until" picker

## Refactoring Notes

The Secret Santa screen currently uses `datetime` mode with `minuteInterval={60}`, which still shows the minutes wheel. To properly implement Format 2 (hour only), this screen needs to be refactored to use either:

1. Two separate pickers (date + time with minuteInterval=60)
2. A custom hour picker component

This refactor is pending.
