/**
 * Image Conversion Service
 *
 * Converts non-standard image formats (HEIC, WebP, AVIF, etc.) to PNG/JPEG
 * for universal browser compatibility.
 *
 * Routes to:
 * - Local sharp/heic-convert (if available)
 * - Media Processor Docker container (development)
 * - Media Processor Lambda (production)
 *
 * @module services/imageConversion
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Optional dependencies - may not be available in all Lambda environments
let sharp = null;
let heicConvert = null;
let localProcessingAvailable = false;

try {
  sharp = require('sharp');
  heicConvert = require('heic-convert');
  localProcessingAvailable = true;
  // Startup log suppressed - consolidated in mediaProcessor.service.js checkAndLogStatus()
} catch (err) {
  // Startup log suppressed - consolidated in mediaProcessor.service.js checkAndLogStatus()
}

// Media processor service for remote processing
let mediaProcessor = null;
try {
  mediaProcessor = require('./mediaProcessor.service');
} catch (err) {
  // Startup log suppressed - consolidated in mediaProcessor.service.js checkAndLogStatus()
}

// Path to shared uploads directory (mounted in Docker as /app/uploads)
const UPLOADS_DIR = path.join(__dirname, '../uploads');

/**
 * Check if any form of image processing is available
 * @returns {boolean} True if processing is available (locally or via service)
 */
async function isImageProcessingAvailable() {
  if (localProcessingAvailable) {
    return true;
  }
  if (mediaProcessor) {
    return mediaProcessor.isAvailable();
  }
  return false;
}

/**
 * Check if image processing is available (local only)
 * @throws {Error} If dependencies are not available
 */
function requireLocalProcessing() {
  if (!localProcessingAvailable) {
    throw new Error('Local image conversion not available. Sharp module could not be loaded.');
  }
}

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
 * All supported image MIME types
 */
const ALL_IMAGE_TYPES = [...PASSTHROUGH_TYPES, ...CONVERTIBLE_TYPES];

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
 * Check for HEIC/HEIF magic bytes manually
 * HEIC files start with 'ftyp' at offset 4, followed by brand markers
 * @param {Buffer} buffer - File buffer
 * @returns {boolean} True if HEIC/HEIF file
 */
function isHeicBuffer(buffer) {
  if (buffer.length < 12) return false;

  // Check for 'ftyp' box at offset 4
  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp !== 'ftyp') return false;

  // Check for HEIC/HEIF brand markers
  const brand = buffer.toString('ascii', 8, 12);
  const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'];

  return heicBrands.includes(brand.toLowerCase());
}

/**
 * Detect image format from buffer
 * First checks for HEIC (since Sharp can't handle it), then uses Sharp for other formats
 * @param {Buffer} buffer - The file buffer
 * @returns {Promise<{format: string, mimeType: string, isImage: boolean}>}
 */
async function detectImageFormat(buffer) {
  requireLocalProcessing();
  // First check for HEIC/HEIF manually (Sharp doesn't support it)
  if (isHeicBuffer(buffer)) {
    return {
      format: 'heic',
      mimeType: 'image/heic',
      isImage: true,
      width: null,
      height: null,
    };
  }

  // Try Sharp for other formats
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format) {
      // Map sharp format to mimeType
      const formatToMime = {
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heif': 'image/heic',
        'heic': 'image/heic',
        'avif': 'image/avif',
        'tiff': 'image/tiff',
        'svg': 'image/svg+xml',
        'raw': 'image/raw',
      };

      const mimeType = formatToMime[metadata.format] || `image/${metadata.format}`;
      return {
        format: metadata.format,
        mimeType: mimeType,
        isImage: true,
        width: metadata.width,
        height: metadata.height,
      };
    }
    return { format: null, mimeType: null, isImage: false };
  } catch (error) {
    // Not an image or couldn't be read by Sharp
    return { format: null, mimeType: null, isImage: false };
  }
}

/**
 * Check if this buffer might be an image based on content (magic bytes)
 * Use this when mimeType is unreliable
 * @param {Buffer} buffer - The file buffer
 * @returns {Promise<boolean>}
 */
async function isImageBuffer(buffer) {
  requireLocalProcessing();
  const result = await detectImageFormat(buffer);
  return result.isImage;
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
 * Convert HEIC/HEIF buffer to JPEG using heic-convert (local only)
 * @param {Buffer} inputBuffer - HEIC file buffer
 * @returns {Promise<Buffer>} JPEG buffer
 */
async function convertHeicToJpegLocal(inputBuffer) {
  requireLocalProcessing();
  try {
    const outputBuffer = await heicConvert({
      buffer: inputBuffer,
      format: 'JPEG',
      quality: 0.9,
    });
    return Buffer.from(outputBuffer);
  } catch (error) {
    console.error('HEIC conversion error:', error);
    throw new Error(`Failed to convert HEIC: ${error.message}`);
  }
}

/**
 * Convert an image buffer to a browser-compatible format (PNG or JPEG) using local processing
 * @param {Buffer} inputBuffer - The original image buffer
 * @param {string} originalMimeType - The original MIME type
 * @returns {Promise<{buffer: Buffer, mimeType: string, converted: boolean}>}
 */
async function convertToPngLocal(inputBuffer, originalMimeType) {
  requireLocalProcessing();
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
    // HEIC/HEIF requires special handling - Sharp doesn't support it natively
    if (normalizedType === 'image/heic' || normalizedType === 'image/heif') {
      console.log('Converting HEIC/HEIF using heic-convert...');
      const jpegBuffer = await convertHeicToJpegLocal(inputBuffer);

      // Optionally convert JPEG to PNG for consistency
      // For now, return JPEG since it's smaller and universally supported
      return {
        buffer: jpegBuffer,
        mimeType: 'image/jpeg',
        converted: true,
      };
    }

    // For other formats (WebP, AVIF, TIFF, BMP), use Sharp
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
 * Convert image via Media Processor service
 * @param {Buffer} inputBuffer - The original image buffer
 * @param {string} originalMimeType - The original MIME type
 * @returns {Promise<{buffer: Buffer, mimeType: string, converted: boolean}>}
 */
async function convertViaMediaProcessor(inputBuffer, originalMimeType) {
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

  if (!mediaProcessor) {
    throw new Error('Media processor service not available');
  }

  // Write buffer to temp file for media processor
  const tempDir = os.tmpdir();
  const tempInputName = `image_input_${uuidv4()}`;
  const tempInputPath = path.join(tempDir, tempInputName);

  try {
    await fs.writeFile(tempInputPath, inputBuffer);

    const result = await mediaProcessor.convertImage({
      filePath: tempInputPath,
      mimeType: originalMimeType,
    });

    // Media processor saves file to /app/uploads/ which maps to ./backend/uploads/
    // Translate container path to host path
    const fileName = result.outputFileName;
    const hostPath = path.join(UPLOADS_DIR, fileName);

    // Read converted file from shared volume
    const outputBuffer = await fs.readFile(hostPath);

    // Clean up the file in shared uploads
    await fs.unlink(hostPath).catch(() => {});

    return {
      buffer: outputBuffer,
      mimeType: result.mimeType || 'image/png',
      converted: true,
    };
  } finally {
    // Clean up temp input file
    await fs.unlink(tempInputPath).catch(() => {});
  }
}

/**
 * Convert an image buffer to a browser-compatible format (PNG or JPEG)
 * Uses local processing if available, otherwise routes to media processor
 * @param {Buffer} inputBuffer - The original image buffer
 * @param {string} originalMimeType - The original MIME type
 * @returns {Promise<{buffer: Buffer, mimeType: string, converted: boolean}>}
 */
async function convertToPng(inputBuffer, originalMimeType) {
  if (localProcessingAvailable) {
    return convertToPngLocal(inputBuffer, originalMimeType);
  }
  return convertViaMediaProcessor(inputBuffer, originalMimeType);
}

/**
 * Get new filename with appropriate extension based on source format
 * @param {string} originalFilename - The original filename
 * @param {string} [sourceMimeType] - Original MIME type (optional, for determining output extension)
 * @returns {string} Filename with new extension
 */
function getConvertedFilename(originalFilename, sourceMimeType = '') {
  if (!originalFilename) return 'converted.jpg';

  // HEIC/HEIF converts to JPEG, others convert to PNG
  const normalizedType = sourceMimeType.toLowerCase();
  const newExtension = (normalizedType === 'image/heic' || normalizedType === 'image/heif')
    ? '.jpg'
    : '.png';

  // Remove the original extension and add the new one
  const lastDotIndex = originalFilename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${originalFilename}${newExtension}`;
  }

  return `${originalFilename.substring(0, lastDotIndex)}${newExtension}`;
}

module.exports = {
  needsConversion,
  isSupportedImage,
  convertToPng,
  getConvertedFilename,
  detectImageFormat,
  isImageBuffer,
  isImageProcessingAvailable,
  isLocalProcessingAvailable: () => localProcessingAvailable,
  PASSTHROUGH_TYPES,
  ALL_IMAGE_TYPES,
  CONVERTIBLE_TYPES,
};
