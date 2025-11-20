/**
 * DateTimeSelector Component
 *
 * Reusable date/time picker with three format options.
 * See DATE_PICKER_STANDARDS.md for full documentation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * @typedef {Object} DateTimeSelectorProps
 * @property {Date} value - The current date value
 * @property {(date: Date) => void} onChange - Callback when date changes
 * @property {1 | 2 | 3} format - Format type:
 *   1 = Year → Month → Day → Hour → Min (5-min intervals)
 *   2 = Year → Month → Day → Hour (hour only)
 *   3 = Year → Month → Day (date only)
 * @property {boolean} visible - Whether the picker modal is visible
 * @property {() => void} onClose - Callback to close the modal
 * @property {string} [title] - Optional title for the picker
 * @property {Date} [minimumDate] - Optional minimum selectable date
 * @property {Date} [maximumDate] - Optional maximum selectable date
 */

/**
 * DateTimeSelector - A reusable date/time picker component
 *
 * @param {DateTimeSelectorProps} props
 * @returns {JSX.Element}
 */
export default function DateTimeSelector({
  value,
  onChange,
  format,
  visible,
  onClose,
  title = 'Select Date',
  minimumDate,
  maximumDate,
}) {
  const [tempDate, setTempDate] = useState(value || new Date());

  // Sync tempDate when value changes or modal opens
  useEffect(() => {
    if (visible && value) {
      setTempDate(value);
    }
  }, [visible, value]);

  /**
   * Round to nearest 5 minutes for Format 1
   */
  const roundToNearest5Minutes = (date) => {
    const rounded = new Date(date);
    const minutes = rounded.getMinutes();
    const roundedMinutes = Math.round(minutes / 5) * 5;
    rounded.setMinutes(roundedMinutes);
    rounded.setSeconds(0);
    rounded.setMilliseconds(0);
    return rounded;
  };

  /**
   * Clear minutes for Format 2
   */
  const clearMinutes = (date) => {
    const cleared = new Date(date);
    cleared.setMinutes(0);
    cleared.setSeconds(0);
    cleared.setMilliseconds(0);
    return cleared;
  };

  /**
   * Handle date change from picker
   */
  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      if (event.type === 'dismissed') {
        onClose();
        return;
      }
      if (event.type === 'set' && selectedDate) {
        let finalDate = selectedDate;
        if (format === 1) {
          finalDate = roundToNearest5Minutes(selectedDate);
        } else if (format === 2) {
          finalDate = clearMinutes(selectedDate);
        }
        onChange(finalDate);
        onClose();
      }
    } else {
      // iOS - update temp date, don't close
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  /**
   * Handle hour change for Format 2 (separate time picker)
   */
  const handleHourChange = (event, selectedDate) => {
    if (selectedDate) {
      // Preserve the date from tempDate, update only hour
      const updated = new Date(tempDate);
      updated.setHours(selectedDate.getHours());
      updated.setMinutes(0);
      updated.setSeconds(0);
      updated.setMilliseconds(0);
      setTempDate(updated);
    }
  };

  /**
   * Confirm selection (iOS only)
   */
  const handleConfirm = () => {
    let finalDate = tempDate;
    if (format === 1) {
      finalDate = roundToNearest5Minutes(tempDate);
    } else if (format === 2) {
      finalDate = clearMinutes(tempDate);
    }
    onChange(finalDate);
    onClose();
  };

  /**
   * Cancel selection
   */
  const handleCancel = () => {
    setTempDate(value || new Date());
    onClose();
  };

  /**
   * Format date for display
   */
  const formatDisplayDate = (date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const year = date.getFullYear();
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');

    switch (format) {
      case 1:
        return `${year} ${months[date.getMonth()]} ${day}, ${hour}:${minute}`;
      case 2:
        return `${year} ${months[date.getMonth()]} ${day}, ${hour}:00`;
      case 3:
        return `${year} ${fullMonths[date.getMonth()]} ${day}`;
      default:
        return date.toLocaleDateString();
    }
  };

  // Don't render if not visible
  if (!visible) return null;

  // Android uses native picker
  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={tempDate}
        mode={format === 3 ? 'date' : 'datetime'}
        display="default"
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        minuteInterval={format === 1 ? 5 : 1}
        is24Hour={true}
      />
    );
  }

  // iOS uses modal with spinner
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Picker Content */}
          <View style={styles.content}>
            {format === 2 ? (
              // Format 2: Side-by-side date and hour pickers
              <View style={styles.dateTimeRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.pickerLabel}>Date</Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    textColor="#000"
                    locale="sv-SE"
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                  />
                </View>
                <View style={styles.hourColumn}>
                  <Text style={styles.pickerLabel}>Hour</Text>
                  <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="spinner"
                    onChange={handleHourChange}
                    textColor="#000"
                    locale="sv-SE"
                    is24Hour={true}
                    minuteInterval={60}
                  />
                </View>
              </View>
            ) : (
              // Format 1 or 3: Single picker
              <DateTimePicker
                value={tempDate}
                mode={format === 3 ? 'date' : 'datetime'}
                display="spinner"
                onChange={handleDateChange}
                textColor="#000"
                locale="sv-SE"
                is24Hour={true}
                minuteInterval={format === 1 ? 5 : 1}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Helper function to format a date based on format type
 * Can be used externally for display purposes
 *
 * @param {Date} date - The date to format
 * @param {1 | 2 | 3} format - The format type
 * @returns {string} Formatted date string
 */
export function formatDateByType(date, format) {
  if (!date) return 'Select date';

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  switch (format) {
    case 1:
      return `${day} ${months[date.getMonth()]} ${year}, ${hour}:${minute}`;
    case 2:
      return `${day} ${months[date.getMonth()]} ${year}, ${hour}:00`;
    case 3:
      return `${day} ${fullMonths[date.getMonth()]} ${year}`;
    default:
      return date.toLocaleDateString();
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingVertical: 20,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateColumn: {
    flex: 2,
  },
  hourColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
});
