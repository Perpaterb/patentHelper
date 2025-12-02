/**
 * Color Utilities Test Suite
 *
 * Tests for color manipulation and contrast calculation functions.
 */

import { getContrastTextColor, isValidHexColor } from '../../utils/colorUtils';

describe('colorUtils', () => {
  describe('getContrastTextColor', () => {
    describe('returns white text for dark backgrounds', () => {
      it('should return white for black', () => {
        expect(getContrastTextColor('#000000')).toBe('#ffffff');
      });

      it('should return white for dark blue', () => {
        expect(getContrastTextColor('#000080')).toBe('#ffffff');
      });

      it('should return white for dark red', () => {
        expect(getContrastTextColor('#800000')).toBe('#ffffff');
      });

      it('should return white for dark green', () => {
        expect(getContrastTextColor('#006400')).toBe('#ffffff');
      });

      it('should return white for purple', () => {
        expect(getContrastTextColor('#6200ee')).toBe('#ffffff');
      });

      it('should return white for navy', () => {
        expect(getContrastTextColor('#001f3f')).toBe('#ffffff');
      });
    });

    describe('returns black text for light backgrounds', () => {
      it('should return black for white', () => {
        expect(getContrastTextColor('#ffffff')).toBe('#000000');
      });

      it('should return black for yellow', () => {
        expect(getContrastTextColor('#ffff00')).toBe('#000000');
      });

      it('should return black for light gray', () => {
        expect(getContrastTextColor('#cccccc')).toBe('#000000');
      });

      it('should return black for cyan', () => {
        expect(getContrastTextColor('#00ffff')).toBe('#000000');
      });

      it('should return black for lime', () => {
        expect(getContrastTextColor('#00ff00')).toBe('#000000');
      });

      it('should return black for light pink', () => {
        expect(getContrastTextColor('#ffb6c1')).toBe('#000000');
      });
    });

    describe('handles edge cases', () => {
      it('should return white for null input', () => {
        expect(getContrastTextColor(null)).toBe('#ffffff');
      });

      it('should return white for undefined input', () => {
        expect(getContrastTextColor(undefined)).toBe('#ffffff');
      });

      it('should return white for empty string', () => {
        expect(getContrastTextColor('')).toBe('#ffffff');
      });

      it('should handle color without # prefix', () => {
        // The function should still work but may produce unexpected results
        // This tests the current behavior
        const result = getContrastTextColor('000000');
        expect(result).toBe('#ffffff');
      });
    });

    describe('handles mid-tone colors correctly', () => {
      it('should handle medium gray appropriately', () => {
        // Medium gray (#808080) is right around the threshold
        const result = getContrastTextColor('#808080');
        expect(['#000000', '#ffffff']).toContain(result);
      });

      it('should handle orange', () => {
        const result = getContrastTextColor('#ff8c00');
        expect(['#000000', '#ffffff']).toContain(result);
      });
    });
  });

  describe('isValidHexColor', () => {
    describe('returns true for valid hex colors', () => {
      it('should accept uppercase hex', () => {
        expect(isValidHexColor('#FF5733')).toBe(true);
      });

      it('should accept lowercase hex', () => {
        expect(isValidHexColor('#ff5733')).toBe(true);
      });

      it('should accept mixed case hex', () => {
        expect(isValidHexColor('#Ff5733')).toBe(true);
      });

      it('should accept black', () => {
        expect(isValidHexColor('#000000')).toBe(true);
      });

      it('should accept white', () => {
        expect(isValidHexColor('#FFFFFF')).toBe(true);
      });

      it('should accept primary colors', () => {
        expect(isValidHexColor('#FF0000')).toBe(true); // Red
        expect(isValidHexColor('#00FF00')).toBe(true); // Green
        expect(isValidHexColor('#0000FF')).toBe(true); // Blue
      });
    });

    describe('returns false for invalid hex colors', () => {
      it('should reject color without # prefix', () => {
        expect(isValidHexColor('FF5733')).toBe(false);
      });

      it('should reject 3-digit shorthand', () => {
        expect(isValidHexColor('#F00')).toBe(false);
      });

      it('should reject 8-digit hex (with alpha)', () => {
        expect(isValidHexColor('#FF5733FF')).toBe(false);
      });

      it('should reject invalid characters', () => {
        expect(isValidHexColor('#GGGGGG')).toBe(false);
        expect(isValidHexColor('#ZZZZZZ')).toBe(false);
      });

      it('should reject empty string', () => {
        expect(isValidHexColor('')).toBe(false);
      });

      it('should reject null', () => {
        expect(isValidHexColor(null)).toBe(false);
      });

      it('should reject undefined', () => {
        expect(isValidHexColor(undefined)).toBe(false);
      });

      it('should reject named colors', () => {
        expect(isValidHexColor('red')).toBe(false);
        expect(isValidHexColor('blue')).toBe(false);
      });

      it('should reject RGB notation', () => {
        expect(isValidHexColor('rgb(255,0,0)')).toBe(false);
      });

      it('should reject too short hex', () => {
        expect(isValidHexColor('#12345')).toBe(false);
      });

      it('should reject too long hex', () => {
        expect(isValidHexColor('#1234567')).toBe(false);
      });
    });
  });
});
