/**
 * Web polyfill for @react-navigation/native
 *
 * Provides web-compatible versions of React Navigation hooks.
 */

import { useEffect, useCallback } from 'react';

/**
 * useFocusEffect - runs callback when screen is focused
 * On web, this always runs since screens don't have focus/blur lifecycle
 */
export function useFocusEffect(callback) {
  useEffect(() => {
    const cleanup = callback();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, []);
}

export default {
  useFocusEffect,
};
