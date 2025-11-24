/**
 * Phone Frame Component
 *
 * Wraps content in a phone-shaped container for mobile app simulation.
 * React Native version.
 *
 * CRITICAL: Sets fixed dimensions to override Dimensions.get('window')
 * which would otherwise return full browser window size.
 */

import React, { useEffect } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';

// Phone dimensions (matches iPhone 14)
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_BORDER = 8;
const NOTCH_HEIGHT = 28;

// Content area dimensions (phone minus borders and notch)
const CONTENT_WIDTH = PHONE_WIDTH - (PHONE_BORDER * 2);
const CONTENT_HEIGHT = PHONE_HEIGHT - (PHONE_BORDER * 2) - NOTCH_HEIGHT;

function PhoneFrame({ children }) {
  // Override Dimensions.get('window') for web to return phone dimensions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalGet = Dimensions.get;

      Dimensions.get = function(dimension) {
        if (dimension === 'window' || dimension === 'screen') {
          return {
            width: CONTENT_WIDTH,
            height: CONTENT_HEIGHT,
            scale: 2,
            fontScale: 1,
          };
        }
        return originalGet.call(Dimensions, dimension);
      };

      return () => {
        Dimensions.get = originalGet;
      };
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.phone}>
        {/* Phone notch */}
        <View style={styles.notch} />
        {/* Phone content area - constrained to phone dimensions */}
        <View style={styles.content}>
          <View style={styles.innerContent}>
            {children}
          </View>
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
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#fff',
    borderWidth: PHONE_BORDER,
    borderColor: '#1a1a1a',
    boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.3)',
    elevation: 16, // Keep for Android native support
  },
  notch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: [{ translateX: -75 }],
    width: 150,
    height: NOTCH_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingTop: NOTCH_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  innerContent: {
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
  },
});

export default PhoneFrame;
