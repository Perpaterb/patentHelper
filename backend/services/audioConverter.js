/**
 * Audio Converter Service
 *
 * Converts audio files to universally compatible formats.
 * Uses ffmpeg to convert webm (from web browsers) to mp3.
 *
 * NOTE: This service requires ffmpeg dependencies which are only available
 * in the Media Processor Lambda (container image). The main API Lambda
 * will throw an error if these functions are called directly.
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Optional dependencies - only available in Media Processor Lambda
let ffmpeg = null;
let ffmpegAvailable = false;

try {
  ffmpeg = require('fluent-ffmpeg');
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const ffprobePath = require('@ffprobe-installer/ffprobe').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  ffmpegAvailable = true;
} catch (err) {
  console.log('[AudioConverter] ffmpeg not available - media processing disabled');
}

/**
 * Check if ffmpeg is available
 * @throws {Error} If ffmpeg is not available
 */
function requireFfmpeg() {
  if (!ffmpegAvailable) {
    throw new Error('Audio processing not available. This feature requires the Media Processor Lambda.');
  }
}

/**
 * Convert audio file to MP3 format
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, mimeType: string}>} Converted file info
 */
async function convertToMp3(inputPath, outputDir) {
  requireFfmpeg();
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
 * Get audio duration in milliseconds
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} Duration in milliseconds
 */
async function getAudioDuration(filePath) {
  requireFfmpeg();
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Audio probe error:', err);
        reject(new Error(`Failed to get audio duration: ${err.message}`));
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
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
 * @returns {Promise<{path: string, mimeType: string, wasConverted: boolean, durationMs: number}>}
 */
async function convertIfNeeded(filePath, mimeType, outputDir) {
  let resultPath = filePath;
  let resultMimeType = mimeType;
  let wasConverted = false;

  if (needsConversion(mimeType)) {
    console.log(`Converting ${mimeType} to MP3...`);
    const result = await convertToMp3(filePath, outputDir);
    resultPath = result.path;
    resultMimeType = result.mimeType;
    wasConverted = true;

    // Delete original webm file after successful conversion
    try {
      await fs.unlink(filePath);
      console.log(`Deleted original file: ${filePath}`);
    } catch (err) {
      console.warn(`Could not delete original file: ${err.message}`);
    }
  }

  // Get duration
  const durationMs = await getAudioDuration(resultPath);

  return {
    path: resultPath,
    mimeType: resultMimeType,
    wasConverted,
    durationMs,
  };
}

module.exports = {
  convertToMp3,
  getAudioDuration,
  needsConversion,
  convertIfNeeded,
};
