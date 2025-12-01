/**
 * Image Conversion Service
 *
 * Converts non-standard image formats (HEIC, WebP, AVIF, etc.) to PNG
 * for universal browser compatibility.
 *
 * @module services/imageConversion
 */

const sharp = require('sharp');

/**
 * MIME types that don't need conversion (already universally supported)
 */
const PASSTHROUGH_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
];

/**
 * MIME types that can be converted to PNG
 */
const CONVERTIBLE_TYPES = [
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
  'image/bmp',
  'image/x-ms-bmp',
];

/**
 * Check if a MIME type needs conversion
 * @param {string} mimeType - The file's MIME type
 * @returns {boolean} True if conversion is needed
 */
function needsConversion(mimeType) {
  const normalizedType = mimeType.toLowerCase();
  return !PASSTHROUGH_TYPES.includes(normalizedType) &&
         CONVERTIBLE_TYPES.includes(normalizedType);
}

/**
 * Check if a MIME type is a supported image format
 * @param {string} mimeType - The file's MIME type
 * @returns {boolean} True if it's a supported image format
 */
function isSupportedImage(mimeType) {
  const normalizedType = mimeType.toLowerCase();
  return PASSTHROUGH_TYPES.includes(normalizedType) ||
         CONVERTIBLE_TYPES.includes(normalizedType);
}

/**
 * Convert an image buffer to PNG format
 * @param {Buffer} inputBuffer - The original image buffer
 * @param {string} originalMimeType - The original MIME type
 * @returns {Promise<{buffer: Buffer, mimeType: string, converted: boolean}>}
 */
async function convertToPng(inputBuffer, originalMimeType) {
  const normalizedType = originalMimeType.toLowerCase();

  // If it's already a supported format, return as-is
  if (PASSTHROUGH_TYPES.includes(normalizedType)) {
    return {
      buffer: inputBuffer,
      mimeType: originalMimeType,
      converted: false,
    };
  }

  // If it's not a convertible type, throw an error
  if (!CONVERTIBLE_TYPES.includes(normalizedType)) {
    throw new Error(`Unsupported image format: ${originalMimeType}`);
  }

  try {
    // Convert to PNG using sharp
    const outputBuffer = await sharp(inputBuffer)
      .png({
        quality: 90,
        compressionLevel: 6,
      })
      .toBuffer();

    return {
      buffer: outputBuffer,
      mimeType: 'image/png',
      converted: true,
    };
  } catch (error) {
    console.error('Image conversion error:', error);
    throw new Error(`Failed to convert image from ${originalMimeType} to PNG: ${error.message}`);
  }
}

/**
 * Get new filename with .png extension
 * @param {string} originalFilename - The original filename
 * @returns {string} Filename with .png extension
 */
function getConvertedFilename(originalFilename) {
  if (!originalFilename) return 'converted.png';

  // Remove the original extension and add .png
  const lastDotIndex = originalFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalFilename}.png`;
  }

  return `${originalFilename.substring(0, lastDotIndex)}.png`;
}

module.exports = {
  needsConversion,
  isSupportedImage,
  convertToPng,
  getConvertedFilename,
  PASSTHROUGH_TYPES,
  CONVERTIBLE_TYPES,
};
