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
  Platform,
} from 'react-native';
import { WheelPicker } from 'react-native-infinite-wheel-picker';

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
  const [pickerKey, setPickerKey] = useState(0);
  const [dayPickerKey, setDayPickerKey] = useState(0);

  // Sync tempDate when value changes or modal opens
  useEffect(() => {
    if (visible && value) {
      setTempDate(initializeFromDate(value));
      // Force re-render of all pickers when modal opens
      setPickerKey(prev => prev + 1);
      setDayPickerKey(prev => prev + 1);
    }
  }, [visible, value]);

  // Update day picker key when year/month changes (with small delay to prevent flash)
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setDayPickerKey(prev => prev + 1);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [tempDate.year, tempDate.month, visible]);

  // Helper to get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Adjust day when month or year changes (e.g., 31 -> 28 for Feb)
  const adjustDayForMonth = (newYear, newMonth, currentDay) => {
    const maxDays = getDaysInMonth(newYear, newMonth);
    return Math.min(currentDay, maxDays);
  };

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
  const days = generateDays(tempDate.year, tempDate.month);
  const monthOptions = format === 3 ? monthsFull : monthsShort;

  // Get current indices for each picker
  const getYearIndex = () => {
    const idx = years.indexOf(tempDate.year.toString());
    return idx >= 0 ? idx : 50;
  };

  const getMonthIndex = () => tempDate.month;

  const getDayIndex = () => {
    const idx = days.indexOf(String(tempDate.day).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  };

  const getHourIndex = () => {
    const idx = hours.indexOf(String(tempDate.hour).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  };

  const getMinuteIndex = () => {
    const idx = minutes5.indexOf(String(tempDate.minute).padStart(2, '0'));
    return idx >= 0 ? idx : 0;
  };

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

  // Shared styles for selection indicator (top and bottom lines only)
  const selectedLayoutStyle = {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333333',
  };

  // Shared text style for picker items
  const elementTextStyle = {
    fontSize: 16,
    color: '#333',
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          // Offset for web-admin sidebar (240px / 2 = 120px)
          Platform.OS === 'web' && { transform: [{ translateX: 120 }] }
        ]}>
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
                <WheelPicker
                  key={`year-${pickerKey}`}
                  data={years}
                  selectedIndex={getYearIndex()}
                  initialSelectedIndex={getYearIndex()}
                  onChangeValue={(index, value) => {
                    const newYear = parseInt(value);
                    const adjustedDay = adjustDayForMonth(newYear, tempDate.month, tempDate.day);
                    setTempDate({ ...tempDate, year: newYear, day: adjustedDay });
                  }}
                  elementHeight={36}
                  restElements={2}
                  infiniteScroll={false}
                  containerStyle={styles.wheelContainer}
                  selectedLayoutStyle={selectedLayoutStyle}
                  elementTextStyle={elementTextStyle}
                />
              </View>

              {/* Month Picker */}
              <View style={[styles.pickerColumn, format === 3 && styles.wideColumn]}>
                <Text style={styles.pickerLabel}>Month</Text>
                <WheelPicker
                  key={`month-${pickerKey}`}
                  data={monthOptions}
                  selectedIndex={getMonthIndex()}
                  initialSelectedIndex={getMonthIndex()}
                  onChangeValue={(index) => {
                    const adjustedDay = adjustDayForMonth(tempDate.year, index, tempDate.day);
                    setTempDate({ ...tempDate, month: index, day: adjustedDay });
                  }}
                  elementHeight={36}
                  restElements={2}
                  infiniteScroll={false}
                  containerStyle={styles.wheelContainer}
                  selectedLayoutStyle={selectedLayoutStyle}
                  elementTextStyle={elementTextStyle}
                />
              </View>

              {/* Day Picker */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Day</Text>
                <WheelPicker
                  key={`day-${dayPickerKey}`}
                  data={days}
                  selectedIndex={getDayIndex()}
                  initialSelectedIndex={getDayIndex()}
                  onChangeValue={(index, value) => {
                    const newDay = parseInt(value);
                    setTempDate({ ...tempDate, day: newDay });
                  }}
                  elementHeight={36}
                  restElements={2}
                  infiniteScroll={false}
                  containerStyle={styles.wheelContainer}
                  selectedLayoutStyle={selectedLayoutStyle}
                  elementTextStyle={elementTextStyle}
                />
              </View>

              {/* Hour Picker (Format 1 and 2 only) */}
              {format !== 3 && (
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Hour</Text>
                  <WheelPicker
                    key={`hour-${pickerKey}`}
                    data={hours}
                    selectedIndex={getHourIndex()}
                    initialSelectedIndex={getHourIndex()}
                    onChangeValue={(index, value) => {
                      const newHour = parseInt(value);
                      setTempDate({ ...tempDate, hour: newHour });
                    }}
                    elementHeight={36}
                    restElements={2}
                    infiniteScroll={false}
                    containerStyle={styles.wheelContainer}
                    selectedLayoutStyle={selectedLayoutStyle}
                    elementTextStyle={elementTextStyle}
                  />
                </View>
              )}

              {/* Minute Picker (Format 1 only) */}
              {format === 1 && (
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>Min</Text>
                  <WheelPicker
                    key={`minute-${pickerKey}`}
                    data={minutes5}
                    selectedIndex={getMinuteIndex()}
                    initialSelectedIndex={getMinuteIndex()}
                    onChangeValue={(index, value) => {
                      const newMinute = parseInt(value);
                      setTempDate({ ...tempDate, minute: newMinute });
                    }}
                    elementHeight={36}
                    restElements={2}
                    infiniteScroll={false}
                    containerStyle={styles.wheelContainer}
                    selectedLayoutStyle={selectedLayoutStyle}
                    elementTextStyle={elementTextStyle}
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
    minHeight: SCREEN_HEIGHT * 0.38,
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
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  wideColumn: {
    flex: 1.5,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#333',
  },
  wheelContainer: {
    backgroundColor: 'transparent',
    width: '140%',
    height: 180, // elementHeight (36) * (restElements (2) * 2 + 1) = 180
  },
});
