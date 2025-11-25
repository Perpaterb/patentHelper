/**
 * Patch Dimensions.get() for web to return phone frame dimensions
 *
 * CRITICAL: This must be imported BEFORE any screens that use Dimensions.get()
 *
 * This solves the problem where screens calculate layout based on full browser
 * window dimensions instead of the phone frame dimensions.
 */

import { Dimensions, Platform } from 'react-native';

// Phone dimensions (matches iPhone 14)
const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const PHONE_BORDER = 8;
const NOTCH_HEIGHT = 28;

// Content area dimensions (phone minus borders and notch)
const CONTENT_WIDTH = PHONE_WIDTH - (PHONE_BORDER * 2);
const CONTENT_HEIGHT = PHONE_HEIGHT - (PHONE_BORDER * 2) - NOTCH_HEIGHT;

// Only patch on web
if (Platform.OS === 'web') {
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

  console.log('[PhoneFrame] Dimensions.get() patched to return phone dimensions:', {
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
  });
}
