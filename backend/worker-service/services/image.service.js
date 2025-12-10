/**
 * Image Conversion Service
 *
 * Converts non-standard image formats to browser-compatible formats using sharp.
 * Supports: HEIC/HEIF, WebP, AVIF, TIFF, BMP -> JPEG/PNG
 */

const sharp = require('sharp');
const heicConvert = require('heic-convert');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * MIME types that don't need conversion
 */
const PASSTHROUGH_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
];

/**
 * MIME types that can be converted
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
 * Check for HEIC/HEIF magic bytes
 * @param {Buffer} buffer - File buffer
 * @returns {boolean}
 */
function isHeicBuffer(buffer) {
  if (buffer.length < 12) return false;

  const ftyp = buffer.toString('ascii', 4, 8);
  if (ftyp !== 'ftyp') return false;

  const brand = buffer.toString('ascii', 8, 12);
  const heicBrands = ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'avif'];

  return heicBrands.includes(brand.toLowerCase());
}

/**
 * Detect image format from buffer
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<{format: string, mimeType: string, isImage: boolean}>}
 */
async function detectImageFormat(buffer) {
  // Check for HEIC first (Sharp doesn't support it)
  if (isHeicBuffer(buffer)) {
    return {
      format: 'heic',
      mimeType: 'image/heic',
      isImage: true,
    };
  }

  // Try Sharp for other formats
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.format) {
      const formatToMime = {
        'jpeg': 'image/jpeg',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'heif': 'image/heic',
        'avif': 'image/avif',
        'tiff': 'image/tiff',
      };

      return {
        format: metadata.format,
        mimeType: formatToMime[metadata.format] || `image/${metadata.format}`,
        isImage: true,
        width: metadata.width,
        height: metadata.height,
      };
    }
  } catch (error) {
    // Not an image
  }

  return { format: null, mimeType: null, isImage: false };
}

/**
 * Convert HEIC buffer to JPEG
 * @param {Buffer} inputBuffer - HEIC file buffer
 * @returns {Promise<Buffer>}
 */
async function convertHeicToJpeg(inputBuffer) {
  const outputBuffer = await heicConvert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.9,
  });
  return Buffer.from(outputBuffer);
}

/**
 * Convert image to browser-compatible format
 * @param {Buffer} inputBuffer - Image buffer
 * @param {string} originalMimeType - Original MIME type
 * @param {string} outputDir - Output directory
 * @returns {Promise<{path: string, fileName: string, mimeType: string, converted: boolean}>}
 */
async function convertImage(inputBuffer, originalMimeType, outputDir) {
  const normalizedType = originalMimeType.toLowerCase();

  // Detect actual format from buffer
  const detected = await detectImageFormat(inputBuffer);
  const actualMimeType = detected.mimeType || normalizedType;

  // If already a supported format, save as-is
  if (PASSTHROUGH_TYPES.includes(actualMimeType)) {
    const ext = actualMimeType === 'image/png' ? '.png' : '.jpg';
    const fileName = `${uuidv4()}${ext}`;
    const outputPath = path.join(outputDir, fileName);

    await fs.writeFile(outputPath, inputBuffer);

    return {
      path: outputPath,
      fileName,
      mimeType: actualMimeType,
      converted: false,
    };
  }

  // Convert HEIC/HEIF
  if (actualMimeType === 'image/heic' || actualMimeType === 'image/heif') {
    console.log('[ImageService] Converting HEIC to JPEG...');
    const jpegBuffer = await convertHeicToJpeg(inputBuffer);
    const fileName = `${uuidv4()}.jpg`;
    const outputPath = path.join(outputDir, fileName);

    await fs.writeFile(outputPath, jpegBuffer);

    return {
      path: outputPath,
      fileName,
      mimeType: 'image/jpeg',
      converted: true,
    };
  }

  // Convert other formats to PNG using Sharp
  console.log(`[ImageService] Converting ${actualMimeType} to PNG...`);
  const pngBuffer = await sharp(inputBuffer)
    .png({
      quality: 90,
      compressionLevel: 6,
    })
    .toBuffer();

  const fileName = `${uuidv4()}.png`;
  const outputPath = path.join(outputDir, fileName);

  await fs.writeFile(outputPath, pngBuffer);

  return {
    path: outputPath,
    fileName,
    mimeType: 'image/png',
    converted: true,
  };
}

/**
 * Check if image needs conversion
 * @param {string} mimeType - MIME type
 * @returns {boolean}
 */
function needsConversion(mimeType) {
  const normalizedType = mimeType.toLowerCase();
  return !PASSTHROUGH_TYPES.includes(normalizedType) &&
         CONVERTIBLE_TYPES.includes(normalizedType);
}

/**
 * Resize image
 * @param {Buffer} inputBuffer - Image buffer
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Promise<Buffer>}
 */
async function resizeImage(inputBuffer, maxWidth, maxHeight) {
  return sharp(inputBuffer)
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();
}

/**
 * Generate thumbnail
 * @param {Buffer} inputBuffer - Image buffer
 * @param {number} size - Thumbnail size (square)
 * @returns {Promise<Buffer>}
 */
async function generateThumbnail(inputBuffer, size = 200) {
  return sharp(inputBuffer)
    .resize(size, size, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toBuffer();
}

module.exports = {
  convertImage,
  detectImageFormat,
  needsConversion,
  resizeImage,
  generateThumbnail,
  PASSTHROUGH_TYPES,
  CONVERTIBLE_TYPES,
};
