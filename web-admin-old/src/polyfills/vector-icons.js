/**
 * Web polyfill for react-native-vector-icons
 *
 * Uses Material Icons from the web instead of native icons.
 * This is a simplified version that works with react-native-paper on web.
 */

import React from 'react';

// Simple icon component that uses emoji fallbacks
// react-native-paper will use this for icons on web
const MaterialCommunityIcons = ({ name, size = 24, color = '#000' }) => {
  const iconMap = {
    'pin': '📌',
    'magnify': '🔍',
    'email': '✉️',
    'plus': '+',
    'bell-off': '🔕',
    'ear-hearing': '👂',
    'ear-hearing-off': '🔇',
    'account-circle': '👤',
    'close': '✕',
    'check': '✓',
    'arrow-left': '←',
    'dots-vertical': '⋮',
    'send': '➤',
    'attachment': '📎',
    'image': '🖼️',
    'camera': '📷',
    'menu': '☰',
  };

  return (
    <span
      style={{
        fontSize: size,
        color: color,
        display: 'inline-block',
        textAlign: 'center',
        width: size,
        height: size,
        lineHeight: `${size}px`,
      }}
    >
      {iconMap[name] || '•'}
    </span>
  );
};

export default MaterialCommunityIcons;
