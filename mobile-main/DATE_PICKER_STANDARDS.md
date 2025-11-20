# Date Picker Standards

All date/time pickers in this app follow consistent formatting and positioning standards.

## Package

We use `react-native-wheel-pick` for all date pickers via the `DateTimeSelector` component. This gives us full control over:
- Column order (Year → Month → Day → Hour → Min)
- Which columns to show/hide
- Month display format (3-letter vs full name)
- No locale contamination issues

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

**Display example:** `20 Nov 2025, 14:30`

### Format 2: DateTime with Hour Only (No Minutes)
**Layout (left to right):** Year → Month (3-letter abbr) → Day → Hour (24hr)

**Use case:** Secret Santa exchange date, reveal names date

**Display example:** `20 Nov 2025, 14:00`

### Format 3: Date Only
**Layout (left to right):** Year → Month (Full name) → Day

**Use case:** Calendar banner date picker, recurrence end dates, birthdays

**Display example:** `20 November 2025`

## Using DateTimeSelector Component

The `DateTimeSelector` component (`src/components/DateTimeSelector.jsx`) is the standard way to implement date pickers. It handles all format types and modal behavior.

### Basic Usage

```javascript
import DateTimeSelector, { formatDateByType } from '../../components/DateTimeSelector';

// In your component:
const [date, setDate] = useState(new Date());
const [showPicker, setShowPicker] = useState(false);

// Display the formatted date
<Text>{formatDateByType(date, 1)}</Text>

// The picker component
<DateTimeSelector
  value={date}
  onChange={setDate}
  format={1}  // 1, 2, or 3
  visible={showPicker}
  onClose={() => setShowPicker(false)}
  title="Select Date"
/>
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `Date` | Yes | The current date value |
| `onChange` | `(date: Date) => void` | Yes | Callback when date is confirmed |
| `format` | `1 \| 2 \| 3` | Yes | Format type (see above) |
| `visible` | `boolean` | Yes | Whether the picker modal is visible |
| `onClose` | `() => void` | Yes | Callback to close the modal |
| `title` | `string` | No | Modal title (default: "Select Date") |
| `minimumDate` | `Date` | No | Minimum selectable date (not yet implemented) |
| `maximumDate` | `Date` | No | Maximum selectable date (not yet implemented) |

### formatDateByType Helper

Use this function to display dates in the correct format:

```javascript
import { formatDateByType } from '../../components/DateTimeSelector';

// Format 1: "20 Nov 2025, 14:30"
formatDateByType(myDate, 1);

// Format 2: "20 Nov 2025, 14:00"
formatDateByType(myDate, 2);

// Format 3: "20 November 2025"
formatDateByType(myDate, 3);
```

## Files Using Date Pickers

### Using DateTimeSelector Component (Recommended)

**Files using DateTimeSelector:**
- `src/screens/calendar/CalendarScreen.jsx` - Format 3 (date only for banner navigation)
- `src/screens/groups/CreateSecretSantaScreen.jsx` - Format 2 (hour only for exchange/reveal dates)

### Legacy Implementation (Direct @react-native-community/datetimepicker)

These files still use `@react-native-community/datetimepicker` directly. They should be migrated to DateTimeSelector when time permits:

**Calendar Event Screens (Format 1 - with 5-min intervals):**
- `src/screens/calendar/CreateEventScreen.jsx`
- `src/screens/calendar/EditEventScreen.jsx`
- `src/screens/calendar/CreateChildEventScreen.jsx`
- `src/screens/calendar/EditChildEventScreen.jsx`

**Recurrence End Dates (Format 3 - date only):**
- Used within the Calendar event screens above for "Repeat Until" picker

## Migration Notes

When migrating legacy screens to use DateTimeSelector:

1. Remove the `@react-native-community/datetimepicker` import
2. Import `DateTimeSelector` and `formatDateByType`
3. Remove temp state management (DateTimeSelector handles this internally)
4. Remove confirm/cancel handlers (DateTimeSelector handles these)
5. Update display text to use `formatDateByType(date, format)`
6. Replace Modal + DateTimePicker with single DateTimeSelector component
