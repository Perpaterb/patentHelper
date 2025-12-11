/**
 * Audio Converter Service
 *
 * Converts audio files to universally compatible formats.
 * Routes to:
 * - Local ffmpeg (if available)
 * - Media Processor Docker container (development)
 * - Media Processor Lambda (production)
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const FormData = require('form-data');
const fsSync = require('fs');

// Configuration
const MEDIA_PROCESSOR_URL = process.env.MEDIA_PROCESSOR_URL || 'http://localhost:3001';

// Optional local dependencies - only available if ffmpeg is installed locally
let ffmpeg = null;
let ffmpegAvailable = false;

try {
  ffmpeg = require('fluent-ffmpeg');

  // Try npm-installed ffmpeg first, fall back to system ffmpeg
  try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
  } catch (installerErr) {
    // @ffmpeg-installer not available, try system ffmpeg
    const { execSync } = require('child_process');
    try {
      const systemFfmpeg = execSync('which ffmpeg', { encoding: 'utf8' }).trim();
      const systemFfprobe = execSync('which ffprobe', { encoding: 'utf8' }).trim();
      if (systemFfmpeg && systemFfprobe) {
        ffmpeg.setFfmpegPath(systemFfmpeg);
        ffmpeg.setFfprobePath(systemFfprobe);
        console.log('[AudioConverter] Using system ffmpeg:', systemFfmpeg);
      } else {
        throw new Error('System ffmpeg not found');
      }
    } catch (sysErr) {
      throw new Error('Neither @ffmpeg-installer nor system ffmpeg available');
    }
  }
  ffmpegAvailable = true;
} catch (err) {
  console.log('[AudioConverter] ffmpeg not available:', err.message);
}

// Path to shared uploads directory (mounted in Docker as /app/uploads)
const UPLOADS_DIR = path.join(__dirname, '../uploads');

/**
 * Convert audio using the Media Processor Docker container
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file (ignored, uses shared volume)
 * @returns {Promise<{path: string, mimeType: string}>} Converted file info
 */
async function convertViaMPediaProcessor(inputPath, outputDir) {
  const form = new FormData();
  form.append('file', fsSync.createReadStream(inputPath));

  try {
    const response = await axios.post(`${MEDIA_PROCESSOR_URL}/convert/audio`, form, {
      headers: form.getHeaders(),
      timeout: 120000, // 2 minute timeout
      responseType: 'json',
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Audio conversion failed');
    }

    // Media processor saves file to /app/uploads/ which maps to ./backend/uploads/
    // Translate container path to host path
    const containerPath = response.data.outputPath; // e.g., /app/uploads/xxx.mp3
    const fileName = response.data.outputFileName;  // e.g., xxx.mp3
    const hostPath = path.join(UPLOADS_DIR, fileName);

    // Copy to the requested output directory if different
    const finalPath = path.join(outputDir, fileName);
    if (outputDir !== UPLOADS_DIR) {
      await fs.copyFile(hostPath, finalPath);
      // Clean up the file in shared uploads
      await fs.unlink(hostPath).catch(() => {});
    }

    return {
      path: outputDir === UPLOADS_DIR ? hostPath : finalPath,
      fileName: fileName,
      mimeType: 'audio/mpeg',
      durationMs: response.data.durationMs || 0,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Media processor error: ${error.response.data?.error || error.response.status}`);
    }
    throw error;
  }
}

/**
 * Convert audio file to MP3 format using local ffmpeg
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, mimeType: string}>} Converted file info
 */
async function convertToMp3Local(inputPath, outputDir) {
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
 * Convert audio file to MP3 format
 * Uses local ffmpeg if available, otherwise routes to media processor
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, mimeType: string}>} Converted file info
 */
async function convertToMp3(inputPath, outputDir) {
  if (ffmpegAvailable) {
    return convertToMp3Local(inputPath, outputDir);
  }
  return convertViaMPediaProcessor(inputPath, outputDir);
}

/**
 * Get audio duration in milliseconds
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>} Duration in milliseconds
 */
async function getAudioDuration(filePath) {
  if (!ffmpegAvailable) {
    // Can't get duration without ffmpeg, return 0
    console.log('[AudioConverter] Cannot get duration - ffmpeg not available');
    return 0;
  }

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
 * Check if audio conversion is available
 * @returns {boolean} True if conversion is available (locally or via service)
 */
async function isAvailable() {
  if (ffmpegAvailable) {
    return true;
  }

  // Check if media processor is available
  try {
    const response = await axios.get(`${MEDIA_PROCESSOR_URL}/health`, { timeout: 5000 });
    return response.data.status === 'healthy' && response.data.capabilities?.includes('audio');
  } catch (error) {
    return false;
  }
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
  let durationMs = 0;

  if (needsConversion(mimeType)) {
    console.log(`Converting ${mimeType} to MP3...`);
    const result = await convertToMp3(filePath, outputDir);
    resultPath = result.path;
    resultMimeType = result.mimeType;
    wasConverted = true;
    durationMs = result.durationMs || 0;

    // Delete original webm file after successful conversion
    try {
      await fs.unlink(filePath);
      console.log(`Deleted original file: ${filePath}`);
    } catch (err) {
      console.warn(`Could not delete original file: ${err.message}`);
    }
  }

  // Get duration if we haven't already
  if (!durationMs && ffmpegAvailable) {
    try {
      durationMs = await getAudioDuration(resultPath);
    } catch (err) {
      console.warn('Could not get audio duration:', err.message);
    }
  }

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
  isAvailable,
};
