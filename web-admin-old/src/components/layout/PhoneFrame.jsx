/**
 * Phone Frame Component
 *
 * Wraps content in a phone-shaped container for mobile app simulation.
 * Works with both MUI and React Native Web content.
 */

import React from 'react';

function PhoneFrame({ children }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: 'calc(100vh - 100px)',
        padding: '16px 0',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          borderRadius: 40,
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: '#fff',
          border: '8px solid #1a1a1a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Phone notch */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 150,
            height: 28,
            backgroundColor: '#1a1a1a',
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            zIndex: 10,
          }}
        />
        {/* Phone content area */}
        <div
          style={{
            height: '100%',
            overflow: 'auto',
            paddingTop: 28, // Space for notch
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default PhoneFrame;
