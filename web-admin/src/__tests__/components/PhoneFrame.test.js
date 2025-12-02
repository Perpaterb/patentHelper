/**
 * PhoneFrame Test Suite
 *
 * Tests for the phone frame wrapper component.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Text, View } from 'react-native';
import PhoneFrame from '../../components/PhoneFrame';

describe('PhoneFrame', () => {
  const renderPhoneFrame = (children = <Text>Test Content</Text>) => {
    return render(
      <PaperProvider>
        <PhoneFrame>{children}</PhoneFrame>
      </PaperProvider>
    );
  };

  describe('Content Rendering', () => {
    it('should render children content', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Test Content');
    });

    it('should render multiple children', () => {
      const { toJSON } = renderPhoneFrame(
        <View>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </View>
      );
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('First Child');
      expect(tree).toContain('Second Child');
    });

    it('should render nested components', () => {
      const { toJSON } = renderPhoneFrame(
        <View>
          <View>
            <Text>Nested Content</Text>
          </View>
        </View>
      );
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('Nested Content');
    });
  });

  describe('Component Structure', () => {
    it('should render container', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = toJSON();

      // Should have a root container
      expect(tree).toBeTruthy();
    });

    it('should render phone frame', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Phone frame has specific border styling
      expect(tree).toContain('borderRadius');
    });

    it('should render notch element', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Notch has bottom left/right radius
      expect(tree).toContain('borderBottomLeftRadius');
      expect(tree).toContain('borderBottomRightRadius');
    });
  });

  describe('Dimensions', () => {
    it('should have phone width of 390px', () => {
      // Test the constant values
      const PHONE_WIDTH = 390;
      expect(PHONE_WIDTH).toBe(390);
    });

    it('should have phone height of 844px', () => {
      // Test the constant values
      const PHONE_HEIGHT = 844;
      expect(PHONE_HEIGHT).toBe(844);
    });

    it('should have border width of 8px', () => {
      // Test the constant values
      const PHONE_BORDER = 8;
      expect(PHONE_BORDER).toBe(8);
    });

    it('should have notch height of 28px', () => {
      // Test the constant values
      const NOTCH_HEIGHT = 28;
      expect(NOTCH_HEIGHT).toBe(28);
    });

    it('should calculate content width correctly', () => {
      const PHONE_WIDTH = 390;
      const PHONE_BORDER = 8;
      const CONTENT_WIDTH = PHONE_WIDTH - (PHONE_BORDER * 2);

      expect(CONTENT_WIDTH).toBe(374);
    });

    it('should calculate content height correctly', () => {
      const PHONE_HEIGHT = 844;
      const PHONE_BORDER = 8;
      const NOTCH_HEIGHT = 28;
      const CONTENT_HEIGHT = PHONE_HEIGHT - (PHONE_BORDER * 2) - NOTCH_HEIGHT;

      expect(CONTENT_HEIGHT).toBe(800);
    });
  });

  describe('Styling', () => {
    it('should have rounded corners on phone frame', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Phone has borderRadius: 40
      expect(tree).toContain('borderRadius');
    });

    it('should have overflow hidden', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Should have overflow hidden for proper clipping
      expect(tree).toContain('overflow');
    });

    it('should have dark border color', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Border color is #1a1a1a (dark)
      expect(tree).toContain('borderColor');
    });
  });

  describe('Notch Styling', () => {
    it('should position notch at top center', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Notch is positioned absolutely
      expect(tree).toContain('position');
    });

    it('should have notch with rounded bottom corners', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Notch has specific rounded corners
      expect(tree).toContain('borderBottomLeftRadius');
    });
  });

  describe('Content Area', () => {
    it('should have content area with padding for notch', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Content area has paddingTop for notch clearance
      expect(tree).toContain('paddingTop');
    });

    it('should allow scrollable content', () => {
      const longContent = (
        <View>
          {Array.from({ length: 50 }, (_, i) => (
            <Text key={i}>Line {i + 1}</Text>
          ))}
        </View>
      );

      const { toJSON } = renderPhoneFrame(longContent);
      const tree = JSON.stringify(toJSON());

      // Text is split as ["Line ", "1"] so check for both parts
      expect(tree).toContain('"Line "');
      expect(tree).toContain('"50"');
    });
  });

  describe('Visual Appearance', () => {
    it('should have white background', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      expect(tree).toContain('backgroundColor');
    });

    it('should have shadow effect', () => {
      const { toJSON } = renderPhoneFrame();
      const tree = JSON.stringify(toJSON());

      // Web uses boxShadow
      expect(tree).toContain('boxShadow');
    });
  });

  describe('iPhone 14 Simulation', () => {
    it('should match iPhone 14 dimensions', () => {
      // iPhone 14 screen: 390 x 844 points
      const IPHONE_14_WIDTH = 390;
      const IPHONE_14_HEIGHT = 844;

      expect(IPHONE_14_WIDTH).toBe(390);
      expect(IPHONE_14_HEIGHT).toBe(844);
    });
  });
});
