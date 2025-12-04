/**
 * Video Converter Service
 *
 * Converts video files to universally compatible formats.
 * Uses ffmpeg to convert webm/mov/etc to mp4.
 */

const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Set ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

/**
 * Convert video file to MP4 format
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string}>} Converted file info
 */
async function convertToMp4(inputPath, outputDir) {
  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  // Log input file size
  const inputStats = await fs.stat(inputPath);
  console.log(`[VideoConverter] Input file size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp4')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23', // Good quality balance
        '-movflags +faststart', // Enable streaming
      ])
      .on('start', (commandLine) => {
        console.log('[VideoConverter] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[VideoConverter] Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[VideoConverter] FFmpeg error:', err);
        console.error('[VideoConverter] FFmpeg stderr:', stderr);
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .on('end', async () => {
        try {
          const outputStats = await fs.stat(outputPath);
          console.log(`[VideoConverter] Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`[VideoConverter] Conversion complete: ${outputPath}`);
          resolve({
            path: outputPath,
            fileName: outputFileName,
            mimeType: 'video/mp4',
          });
        } catch (err) {
          reject(new Error(`Failed to read converted file: ${err.message}`));
        }
      })
      .save(outputPath);
  });
}

/**
 * Get video duration in milliseconds
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} Duration in milliseconds
 */
async function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Video probe error:', err);
        reject(new Error(`Failed to get video duration: ${err.message}`));
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
  });
}

/**
 * Check if file needs conversion (is not mp4)
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} True if conversion needed
 */
function needsConversion(mimeType) {
  const incompatibleFormats = [
    'video/webm',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/ogg',
  ];
  return incompatibleFormats.includes(mimeType);
}

/**
 * Convert video if needed, otherwise return original
 * @param {string} filePath - Path to video file
 * @param {string} mimeType - Original MIME type
 * @param {string} outputDir - Directory for converted file
 * @returns {Promise<{path: string, mimeType: string, wasConverted: boolean, durationMs: number}>}
 */
async function convertIfNeeded(filePath, mimeType, outputDir) {
  let resultPath = filePath;
  let resultMimeType = mimeType;
  let wasConverted = false;

  if (needsConversion(mimeType)) {
    console.log(`Converting ${mimeType} to MP4...`);
    const result = await convertToMp4(filePath, outputDir);
    resultPath = result.path;
    resultMimeType = result.mimeType;
    wasConverted = true;

    // Delete original file after successful conversion
    try {
      await fs.unlink(filePath);
      console.log(`Deleted original file: ${filePath}`);
    } catch (err) {
      console.warn(`Could not delete original file: ${err.message}`);
    }
  }

  // Get duration
  const durationMs = await getVideoDuration(resultPath);

  return {
    path: resultPath,
    mimeType: resultMimeType,
    wasConverted,
    durationMs,
  };
}

module.exports = {
  convertToMp4,
  getVideoDuration,
  needsConversion,
  convertIfNeeded,
};
