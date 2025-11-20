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
**Layout (left to right):** Year → Month (3-letter abbr) → Day → Hour (24hr) → Minutes (5 min intervals)

**Use case:** Calendar events (start time, end time)

**Implementation:**
```javascript
<DateTimePicker
  value={date}
  mode="datetime"
  display="spinner"
  textColor="#000"
  locale="sv-SE"
  is24Hour={true}
  minuteInterval={5}
/>
```

### Format 2: DateTime with Hour Only (No Minutes)
**Layout (left to right):** Year → Month (3-letter abbr) → Day → Hour (24hr)

**Use case:** Secret Santa exchange date, reveal names date

**Implementation:**
The standard `@react-native-community/datetimepicker` does NOT support hiding the minutes wheel in `datetime` mode. To achieve hour-only selection, use **two separate pickers side by side**:

```javascript
<View style={styles.dateTimeRow}>
  {/* Date picker */}
  <View style={styles.datePickerColumn}>
    <Text style={styles.pickerLabel}>Date</Text>
    <DateTimePicker
      value={date}
      mode="date"
      display="spinner"
      textColor="#000"
      locale="sv-SE"
    />
  </View>

  {/* Hour picker */}
  <View style={styles.hourPickerColumn}>
    <Text style={styles.pickerLabel}>Hour</Text>
    <DateTimePicker
      value={date}
      mode="time"
      display="spinner"
      textColor="#000"
      locale="sv-SE"
      is24Hour={true}
      minuteInterval={60}
    />
  </View>
</View>
```

**Required styles:**
```javascript
dateTimeRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
datePickerColumn: {
  flex: 2,
},
hourPickerColumn: {
  flex: 1,
},
pickerLabel: {
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 8,
  color: '#333',
},
```

### Format 3: Date Only
**Layout (left to right):** Year → Month (3-letter abbr) → Day

**Use case:** Calendar banner date picker, recurrence end dates, birthdays

**Implementation:**
```javascript
<DateTimePicker
  value={date}
  mode="date"
  display="spinner"
  textColor="#000"
  locale="sv-SE"
/>
```

## Key Props Explained

| Prop | Value | Purpose |
|------|-------|---------|
| `mode` | `"datetime"`, `"date"`, `"time"` | Determines which wheels to show |
| `display` | `"spinner"` | Shows iOS-style picker wheels |
| `locale` | `"sv-SE"` | Swedish - provides Year/Month/Day order and 24hr format |
| `is24Hour` | `true` | Forces 24-hour time format (no AM/PM) |
| `minuteInterval` | `5` or `60` | Interval between minute options |
| `textColor` | `"#000"` | Black text for visibility |

## Important Notes

### Locale Selection
- `sv-SE` (Swedish) is used because it provides:
  - **Year → Month → Day** order (required)
  - 24-hour time format by default
  - 3-letter month abbreviations (jan, feb, mar, etc.)

- `en-GB` (British English) uses **Day/Month/Year** order (not what we want)
- `en-AU` (Australian English) uses 12-hour format by default
- `en-US` (American English) uses **Month/Day/Year** order

### Consistency Requirement
**CRITICAL:** All DateTimePicker components across the app MUST use the same `locale="sv-SE"` to prevent the "contamination" issue where viewing one picker affects others.

### minuteInterval Limitation
Setting `minuteInterval={60}` does NOT hide the minutes wheel - it only shows `:00` as the only option. The minutes wheel will still be visible.

To truly hide minutes, you must use separate date and time pickers as shown in Format 2.

## Files Using Date Pickers

### Calendar Banner (Format 3 - date only)
- `src/screens/calendar/CalendarScreen.jsx`

### Calendar Event Screens (Format 1 - with 5-min intervals)
- `src/screens/calendar/CreateEventScreen.jsx`
- `src/screens/calendar/EditEventScreen.jsx`
- `src/screens/calendar/CreateChildEventScreen.jsx`
- `src/screens/calendar/EditChildEventScreen.jsx`

### Secret Santa Screens (Format 2 - hour only, separate pickers)
- `src/screens/groups/CreateSecretSantaScreen.jsx`

### Recurrence End Dates (Format 3 - date only)
- Used within the Calendar event screens above for "Repeat Until" picker
