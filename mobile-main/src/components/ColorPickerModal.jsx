/**
 * Color Picker Modal Component
 *
 * A reusable color picker modal with RGB sliders and live preview.
 * Features:
 * - Circular color preview on the left
 * - RGB sliders (0-255) on the right
 * - Real-time color updates
 * - OK/Cancel buttons
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, Platform } from 'react-native';
import { Title, Text, Button } from 'react-native-paper';
import Slider from '@react-native-community/slider';

/**
 * Convert RGB to hex color
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {string} Hex color (e.g., "#FF5733")
 */
const rgbToHex = (r, g, b) => {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16).padStart(2, '0');
    return hex.toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Convert hex color to RGB
 * @param {string} hex - Hex color (e.g., "#FF5733")
 * @returns {{r: number, g: number, b: number}} RGB object
 */
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 98, g: 0, b: 238 }; // Default purple
};

/**
 * @typedef {Object} ColorPickerModalProps
 * @property {boolean} visible - Whether modal is visible
 * @property {string} initialColor - Initial hex color
 * @property {function} onConfirm - Callback when OK is pressed with selected hex color
 * @property {function} onCancel - Callback when Cancel is pressed
 */

/**
 * ColorPickerModal component
 * @param {ColorPickerModalProps} props
 * @returns {JSX.Element}
 */
export default function ColorPickerModal({ visible, initialColor, onConfirm, onCancel }) {
  const [r, setR] = useState(98);
  const [g, setG] = useState(0);
  const [b, setB] = useState(238);

  // Update RGB values when initial color changes
  useEffect(() => {
    if (initialColor) {
      const rgb = hexToRgb(initialColor);
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
    }
  }, [initialColor]);

  // Get current hex color
  const currentColor = rgbToHex(r, g, b);

  const handleConfirm = () => {
    onConfirm(currentColor);
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Title style={styles.title}>Choose Color</Title>

          <View style={styles.content}>
            {/* Color Preview Circle */}
            <View style={styles.previewContainer}>
              <View style={[styles.colorCircle, { backgroundColor: currentColor }]} />
              <Text style={styles.hexText}>{currentColor}</Text>
            </View>

            {/* RGB Sliders */}
            <View style={styles.slidersContainer}>
              {/* Red Slider */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.labelText}>Red</Text>
                  <Text style={styles.valueText}>{Math.round(r)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={r}
                  onValueChange={setR}
                  minimumTrackTintColor="#ff0000"
                  maximumTrackTintColor="#cccccc"
                  thumbTintColor="#ff0000"
                />
              </View>

              {/* Green Slider */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.labelText}>Green</Text>
                  <Text style={styles.valueText}>{Math.round(g)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={g}
                  onValueChange={setG}
                  minimumTrackTintColor="#00ff00"
                  maximumTrackTintColor="#cccccc"
                  thumbTintColor="#00ff00"
                />
              </View>

              {/* Blue Slider */}
              <View style={styles.sliderGroup}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.labelText}>Blue</Text>
                  <Text style={styles.valueText}>{Math.round(b)}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={255}
                  value={b}
                  onValueChange={setB}
                  minimumTrackTintColor="#0000ff"
                  maximumTrackTintColor="#cccccc"
                  thumbTintColor="#0000ff"
                />
              </View>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleConfirm}
              style={[styles.button, styles.confirmButton]}
            >
              OK
            </Button>
          </View>
        </View>
      </View>
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
    maxWidth: 500,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  content: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  colorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  hexText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 1,
  },
  slidersContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  sliderGroup: {
    marginBottom: 8,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  labelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 35,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#6200ee',
  },
});
