/**
 * DateTimeSelector Component (Web Version)
 *
 * Web-friendly date/time picker using standard select dropdowns.
 * This replaces the wheel picker from mobile-main for better web UX.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

/**
 * DateTimeSelector - Web-friendly date/time picker
 *
 * @param {Object} props
 * @param {Date} props.value - The current date value
 * @param {Function} props.onChange - Callback when date changes
 * @param {number} props.format - Format type: 1=full datetime, 2=hour only, 3=date only
 * @param {boolean} props.visible - Whether the picker modal is visible
 * @param {Function} props.onClose - Callback to close the modal
 * @param {string} [props.title] - Optional title for the picker
 * @returns {JSX.Element}
 */
export default function DateTimeSelector({
  value,
  onChange,
  format,
  visible,
  onClose,
  title = 'Select Date',
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

  // Helper to get days in a month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Month name arrays
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Generate arrays for selects
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 50; i <= currentYear + 50; i++) {
      years.push(i);
    }
    return years;
  };

  const generateDays = (year, month) => {
    const daysInMonth = getDaysInMonth(year, month);
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const generateHours = () => {
    return Array.from({ length: 24 }, (_, i) => i);
  };

  const generateMinutes5 = () => {
    return Array.from({ length: 12 }, (_, i) => i * 5);
  };

  const years = generateYears();
  const days = generateDays(tempDate.year, tempDate.month);
  const hours = generateHours();
  const minutes5 = generateMinutes5();
  const monthOptions = format === 3 ? monthsFull : monthsShort;

  // Adjust day when month or year changes
  useEffect(() => {
    const maxDays = getDaysInMonth(tempDate.year, tempDate.month);
    if (tempDate.day > maxDays) {
      setTempDate(prev => ({ ...prev, day: maxDays }));
    }
  }, [tempDate.year, tempDate.month]);

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

  const handleCancel = () => {
    setTempDate(initializeFromDate(value));
    onClose();
  };

  if (!visible) return null;

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
            <View style={styles.selectsRow}>
              {/* Year Select */}
              <View style={styles.selectColumn}>
                <Text style={styles.selectLabel}>Year</Text>
                <select
                  value={tempDate.year}
                  onChange={(e) => setTempDate({ ...tempDate, year: parseInt(e.target.value) })}
                  style={styles.select}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </View>

              {/* Month Select */}
              <View style={[styles.selectColumn, format === 3 && styles.wideColumn]}>
                <Text style={styles.selectLabel}>Month</Text>
                <select
                  value={tempDate.month}
                  onChange={(e) => setTempDate({ ...tempDate, month: parseInt(e.target.value) })}
                  style={styles.select}
                >
                  {monthOptions.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </View>

              {/* Day Select */}
              <View style={styles.selectColumn}>
                <Text style={styles.selectLabel}>Day</Text>
                <select
                  value={tempDate.day}
                  onChange={(e) => setTempDate({ ...tempDate, day: parseInt(e.target.value) })}
                  style={styles.select}
                >
                  {days.map(day => (
                    <option key={day} value={day}>{String(day).padStart(2, '0')}</option>
                  ))}
                </select>
              </View>

              {/* Hour Select (Format 1 and 2 only) */}
              {format !== 3 && (
                <View style={styles.selectColumn}>
                  <Text style={styles.selectLabel}>Hour</Text>
                  <select
                    value={tempDate.hour}
                    onChange={(e) => setTempDate({ ...tempDate, hour: parseInt(e.target.value) })}
                    style={styles.select}
                  >
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
                    ))}
                  </select>
                </View>
              )}

              {/* Minute Select (Format 1 only) */}
              {format === 1 && (
                <View style={styles.selectColumn}>
                  <Text style={styles.selectLabel}>Min</Text>
                  <select
                    value={tempDate.minute}
                    onChange={(e) => setTempDate({ ...tempDate, minute: parseInt(e.target.value) })}
                    style={styles.select}
                  >
                    {minutes5.map(min => (
                      <option key={min} value={min}>{String(min).padStart(2, '0')}</option>
                    ))}
                  </select>
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
    maxWidth: 500,
    // Offset for web-admin sidebar (240px / 2 = 120px)
    transform: [{ translateX: 120 }],
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
    padding: 24,
  },
  selectsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  selectColumn: {
    flex: 1,
    alignItems: 'center',
  },
  wideColumn: {
    flex: 1.5,
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  select: {
    width: '100%',
    height: 40,
    fontSize: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
});
