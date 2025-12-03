/**
 * Audio Converter Service
 *
 * Converts audio files to universally compatible formats.
 * Uses ffmpeg to convert webm (from web browsers) to mp3.
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Convert audio file to MP3 format
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, mimeType: string}>} Converted file info
 */
async function convertToMp3(inputPath, outputDir) {
  const outputFileName = `${uuidv4()}.mp3`;
  const outputPath = path.join(outputDir, outputFileName);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(1) // Mono for voice messages
      .on('error', (err) => {
        console.error('Audio conversion error:', err);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on('end', () => {
        resolve({
          path: outputPath,
          fileName: outputFileName,
          mimeType: 'audio/mpeg',
        });
      })
      .save(outputPath);
  });
}

/**
 * Check if file needs conversion (is webm or other incompatible format)
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} True if conversion needed
 */
function needsConversion(mimeType) {
  const incompatibleFormats = [
    'audio/webm',
    'audio/ogg',
    'audio/opus',
  ];
  return incompatibleFormats.includes(mimeType);
}

/**
 * Convert audio if needed, otherwise return original
 * @param {string} filePath - Path to audio file
 * @param {string} mimeType - Original MIME type
 * @param {string} outputDir - Directory for converted file
 * @returns {Promise<{path: string, mimeType: string, wasConverted: boolean}>}
 */
async function convertIfNeeded(filePath, mimeType, outputDir) {
  if (!needsConversion(mimeType)) {
    return {
      path: filePath,
      mimeType: mimeType,
      wasConverted: false,
    };
  }

  console.log(`Converting ${mimeType} to MP3...`);
  const result = await convertToMp3(filePath, outputDir);

  // Delete original webm file after successful conversion
  try {
    await fs.unlink(filePath);
    console.log(`Deleted original file: ${filePath}`);
  } catch (err) {
    console.warn(`Could not delete original file: ${err.message}`);
  }

  return {
    ...result,
    wasConverted: true,
  };
}

module.exports = {
  convertToMp3,
  needsConversion,
  convertIfNeeded,
};
