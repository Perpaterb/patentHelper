/**
 * Phone Frame Component
 *
 * Wraps content in a phone-shaped container for mobile app simulation.
 * React Native version.
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';

function PhoneFrame({ children }) {
  return (
    <View style={styles.container}>
      <View style={styles.phone}>
        {/* Phone notch */}
        <View style={styles.notch} />
        {/* Phone content area */}
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 16,
  },
  phone: {
    width: 390,
    height: 844,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: 8,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -75 }],
    width: 150,
    height: 28,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingTop: 28, // Space for notch
  },
});

export default PhoneFrame;
