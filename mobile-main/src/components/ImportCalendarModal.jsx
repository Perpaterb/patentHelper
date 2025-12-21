/**
 * Import Calendar Modal Component
 *
 * Allows users to import external calendars via:
 * - iCal URL (e.g., Google Calendar, Outlook)
 * - File upload (.ics files)
 *
 * Users can set a custom name and color for the imported calendar.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { Title, Text, RadioButton, Button } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import ColorPickerModal from './ColorPickerModal';
import api from '../services/api';

const DEFAULT_COLORS = [
  '#6200ee', // Purple
  '#03DAC5', // Teal
  '#FF5722', // Orange
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#E91E63', // Pink
  '#9C27B0', // Deep Purple
  '#FF9800', // Amber
];

/**
 * @typedef {Object} ImportCalendarModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {string} groupId - Group ID
 * @property {function} onClose - Callback when modal is closed
 * @property {function} onImported - Callback when calendar is imported successfully
 */

/**
 * ImportCalendarModal component
 * @param {ImportCalendarModalProps} props
 * @returns {JSX.Element}
 */
export default function ImportCalendarModal({
  visible,
  groupId,
  onClose,
  onImported,
}) {
  const [name, setName] = useState('');
  const [sourceType, setSourceType] = useState('url'); // 'url' or 'file'
  const [url, setUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [syncInterval, setSyncInterval] = useState('6');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [colorPickerVisible, setColorPickerVisible] = useState(false);

  /**
   * Reset form state
   */
  const resetForm = () => {
    setName('');
    setSourceType('url');
    setUrl('');
    setSelectedFile(null);
    setColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
    setSyncInterval('6');
    setError('');
  };

  /**
   * Handle file selection
   */
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/calendar', 'application/ics', '*/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        // Validate file extension
        if (!file.name.toLowerCase().endsWith('.ics')) {
          setError('Please select an .ics file');
          return;
        }
        setSelectedFile(file);
        // Use filename (without extension) as default name if name is empty
        if (!name) {
          const baseName = file.name.replace(/\.ics$/i, '');
          setName(baseName);
        }
        setError('');
      }
    } catch (err) {
      console.error('Error picking file:', err);
      setError('Failed to pick file');
    }
  };

  /**
   * Validate form before submission
   * @returns {boolean}
   */
  const validateForm = () => {
    if (!name.trim()) {
      setError('Please enter a name for the calendar');
      return false;
    }

    if (sourceType === 'url') {
      if (!url.trim()) {
        setError('Please enter a calendar URL');
        return false;
      }
      // Basic URL validation
      try {
        new URL(url);
      } catch {
        setError('Please enter a valid URL');
        return false;
      }
    } else {
      if (!selectedFile) {
        setError('Please select an .ics file');
        return false;
      }
    }

    return true;
  };

  /**
   * Submit the import request
   */
  const handleImport = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      let response;

      if (sourceType === 'url') {
        // URL import
        response = await api.post(`/groups/${groupId}/calendar/imported`, {
          name: name.trim(),
          sourceType: 'url',
          sourceUrl: url.trim(),
          color,
          syncIntervalHours: parseInt(syncInterval, 10),
        });
      } else {
        // File import - read file content and send
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('sourceType', 'file');
        formData.append('color', color);
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: 'text/calendar',
        });

        response = await api.post(`/groups/${groupId}/calendar/imported`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (response.data.success) {
        resetForm();
        if (onImported) {
          onImported(response.data.calendar);
        }
        onClose();
      } else {
        setError(response.data.message || 'Failed to import calendar');
      }
    } catch (err) {
      console.error('Error importing calendar:', err);
      const message = err.response?.data?.message || err.message || 'Failed to import calendar';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Title style={styles.title}>Import Calendar</Title>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Name Input */}
            <Text style={styles.label}>Calendar Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Work Calendar"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />

            {/* Source Type Selection */}
            <Text style={styles.label}>Import From</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSourceType('url')}
                disabled={loading}
              >
                <RadioButton
                  value="url"
                  status={sourceType === 'url' ? 'checked' : 'unchecked'}
                  onPress={() => setSourceType('url')}
                  disabled={loading}
                />
                <Text style={styles.radioLabel}>URL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSourceType('file')}
                disabled={loading}
              >
                <RadioButton
                  value="file"
                  status={sourceType === 'file' ? 'checked' : 'unchecked'}
                  onPress={() => setSourceType('file')}
                  disabled={loading}
                />
                <Text style={styles.radioLabel}>File</Text>
              </TouchableOpacity>
            </View>

            {/* URL Input */}
            {sourceType === 'url' && (
              <>
                <Text style={styles.label}>Calendar URL</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="https://calendar.google.com/..."
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!loading}
                />

                <Text style={styles.label}>Sync Interval</Text>
                <View style={styles.syncIntervalRow}>
                  <TextInput
                    style={[styles.textInput, styles.syncInput]}
                    value={syncInterval}
                    onChangeText={setSyncInterval}
                    keyboardType="number-pad"
                    maxLength={2}
                    editable={!loading}
                  />
                  <Text style={styles.syncLabel}>hours</Text>
                </View>
              </>
            )}

            {/* File Picker */}
            {sourceType === 'file' && (
              <>
                <Text style={styles.label}>Select File</Text>
                <TouchableOpacity
                  style={styles.filePickerButton}
                  onPress={pickFile}
                  disabled={loading}
                >
                  <Text style={styles.filePickerText}>
                    {selectedFile ? selectedFile.name : 'Choose .ics file'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Color Selection */}
            <Text style={styles.label}>Calendar Color</Text>
            <View style={styles.colorRow}>
              {DEFAULT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorOptionSelected,
                  ]}
                  onPress={() => setColor(c)}
                  disabled={loading}
                />
              ))}
              <TouchableOpacity
                style={[styles.colorOption, styles.customColorButton]}
                onPress={() => setColorPickerVisible(true)}
                disabled={loading}
              >
                <Text style={styles.customColorText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Current selected color preview */}
            <View style={styles.selectedColorRow}>
              <View style={[styles.selectedColorPreview, { backgroundColor: color }]} />
              <Text style={styles.selectedColorText}>Selected: {color}</Text>
            </View>

            {/* Error Message */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.importButton, loading && styles.buttonDisabled]}
              onPress={handleImport}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.importButtonText}>Import</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Color Picker Modal */}
      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={color}
        onConfirm={(selectedColor) => {
          setColor(selectedColor);
          setColorPickerVisible(false);
        }}
        onCancel={() => setColorPickerVisible(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollContent: {
    flexGrow: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radioLabel: {
    fontSize: 16,
    color: '#333',
  },
  syncIntervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncInput: {
    width: 60,
    textAlign: 'center',
  },
  syncLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  filePickerButton: {
    borderWidth: 1,
    borderColor: '#6200ee',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#f9f6ff',
  },
  filePickerText: {
    color: '#6200ee',
    fontSize: 16,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
  },
  customColorButton: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customColorText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  selectedColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  selectedColorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedColorText: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: '#6200ee',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
