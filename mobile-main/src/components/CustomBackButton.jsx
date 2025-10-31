/**
 * Custom Back Button Component
 *
 * Renders only a back arrow without any text
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * CustomBackButton component
 *
 * @param {Object} props
 * @param {Function} props.onPress - Callback when back button is pressed
 * @returns {JSX.Element}
 */
export default function CustomBackButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backButton, { marginLeft: 4 }}>
      <Ionicons name="chevron-back" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backButton: {
    marginLeft: 10,
    padding: 5,
  },
});
