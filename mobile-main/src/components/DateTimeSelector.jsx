/**
 * DateTimeSelector Component
 *
 * Reusable date/time picker with three format options using wheel pickers.
 * See DATE_PICKER_STANDARDS.md for full documentation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Picker } from 'react-native-wheel-pick';

const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * DateTimeSelector - A reusable date/time picker component
 *
 * @param {Object} props
 * @param {Date} props.value - The current date value
 * @param {Function} props.onChange - Callback when date changes
 * @param {number} props.format - Format type: 1=full datetime, 2=hour only, 3=date only
 * @param {boolean} props.visible - Whether the picker modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} [props.title] - Optional title for the picker
 * @param {Date} [props.minimumDate] - Optional minimum selectable date
 * @param {Date} [props.maximumDate] - Optional maximum selectable date
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
  // Initialize temp state from value
  const initializeFromDate = (date) => {
    const d = date || new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      hour: d.getHours(),
      minute: Math.round(d.getMinutes() / 5) * 5,
    };
  };

  const [tempDate, setTempDate] = useState(initializeFromDate(value));

  // Sync tempDate when value changes or modal opens
  useEffect(() => {
    if (visible && value) {
      setTempDate(initializeFromDate(value));
    }
  }, [visible, value]);

  // Month name arrays
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate arrays for pickers
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 50; i <= currentYear + 50; i++) {
      years.push(i.toString());
    }
    return years;
  };

  const generateDays = (year, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) =>
      String(i + 1).padStart(2, '0')
    );
  };

  const generateHours = () => {
    return Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  };

  const generateMinutes5 = () => {
    return Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
  };

  const years = generateYears();
  const hours = generateHours();
  const minutes5 = generateMinutes5();

  /**
   * Confirm selection
   */
  const handleConfirm = () => {
    const newDate = new Date(
      tempDate.year,
      tempDate.month,
      tempDate.day,
      format === 3 ? 0 : tempDate.hour,
      format === 3 ? 0 : (format === 2 ? 0 : tempDate.minute),
      0,
      0
    );
    onChange(newDate);
    onClose();
  };

  /**
   * Cancel selection
   */
  const handleCancel = () => {
    setTempDate(initializeFromDate(value));
    onClose();
  };

  // Don't render if not visible
  if (!visible) return null;

  const days = generateDays(tempDate.year, tempDate.month);

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
            <View style={styles.pickersRow}>
              {/* Year Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Year</Text>
                <Picker
                  style={styles.picker}
                  selectedValue={tempDate.year.toString()}
                  pickerData={years}
                  onValueChange={(val) => {
                    const newYear = parseInt(val);
                    setTempDate({ ...tempDate, year: newYear });
                  }}
                  selectLineColor="#6200ee"
                  selectLineSize={2}
                  isShowSelectBackground={false}
                />
              </View>

              {/* Month Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Month</Text>
                <Picker
                  style={styles.picker}
                  selectedValue={format === 3 ? monthsFull[tempDate.month] : monthsShort[tempDate.month]}
                  pickerData={format === 3 ? monthsFull : monthsShort}
                  onValueChange={(val) => {
                    const monthArray = format === 3 ? monthsFull : monthsShort;
                    const monthIndex = monthArray.indexOf(val);
                    setTempDate({ ...tempDate, month: monthIndex });
                  }}
                  selectLineColor="#6200ee"
                  selectLineSize={2}
                  isShowSelectBackground={false}
                />
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <Picker
                  style={styles.picker}
                  selectedValue={String(tempDate.day).padStart(2, '0')}
                  pickerData={days}
                  onValueChange={(val) => {
                    setTempDate({ ...tempDate, day: parseInt(val) });
                  }}
                  selectLineColor="#6200ee"
                  selectLineSize={2}
                  isShowSelectBackground={false}
                />
              </View>

              {/* Hour Picker (Format 1 and 2 only) */}
              {format !== 3 && (
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Hour</Text>
                  <Picker
                    style={styles.picker}
                    selectedValue={String(tempDate.hour).padStart(2, '0')}
                    pickerData={hours}
                    onValueChange={(val) => {
                      setTempDate({ ...tempDate, hour: parseInt(val) });
                    }}
                    selectLineColor="#6200ee"
                    selectLineSize={2}
                    isShowSelectBackground={false}
                  />
                </View>
              )}

              {/* Minute Picker (Format 1 only) */}
              {format === 1 && (
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Min</Text>
                  <Picker
                    style={styles.picker}
                    selectedValue={String(tempDate.minute).padStart(2, '0')}
                    pickerData={minutes5}
                    onValueChange={(val) => {
                      setTempDate({ ...tempDate, minute: parseInt(val) });
                    }}
                    selectLineColor="#6200ee"
                    selectLineSize={2}
                    isShowSelectBackground={false}
                  />
                </View>
              )}
            </View>
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
 * @param {number} format - The format type
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
    padding: 10,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    minHeight: SCREEN_HEIGHT * 0.4,
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
    fontSize: 18,
    fontWeight: '600',
  },
  doneText: {
    color: '#6200ee',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingVertical: 30,
    paddingHorizontal: 10,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  picker: {
    width: '150%',
    height: 200,
    backgroundColor: 'transparent',
  },
});
