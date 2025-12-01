/**
 * Color Utility Functions
 *
 * Provides helper functions for color manipulation and contrast calculation.
 */

/**
 * Calculate the relative luminance of a color
 * Uses the W3C formula for relative luminance
 * @param {string} hexColor - Hex color string (e.g., "#FF5733")
 * @returns {number} Luminance value between 0 and 1
 */
const getLuminance = (hexColor) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

/**
 * Get contrasting text color (white or black) for a given background color
 * @param {string} backgroundColor - Hex color string (e.g., "#FF5733")
 * @returns {string} "#ffffff" for dark backgrounds, "#000000" for light backgrounds
 */
export const getContrastTextColor = (backgroundColor) => {
  if (!backgroundColor) {
    return '#ffffff'; // Default to white if no color provided
  }

  const luminance = getLuminance(backgroundColor);

  // W3C recommends 0.5 as the threshold, but 0.6 works better for most cases
  // Higher threshold means more colors get white text
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

/**
 * Check if a hex color string is valid
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
export const isValidHexColor = (color) => {
  return /^#[0-9A-F]{6}$/i.test(color);
};
