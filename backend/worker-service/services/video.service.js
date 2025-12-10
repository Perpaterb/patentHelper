/**
 * Video Conversion Service
 *
 * Converts video files to universally compatible MP4 format using ffmpeg.
 * Supports: webm, mov, avi, mkv, ogg -> mp4
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Convert video file to MP4 format
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string, durationMs: number}>}
 */
async function convertToMp4(inputPath, outputDir) {
  const outputFileName = `${uuidv4()}.mp4`;
  const outputPath = path.join(outputDir, outputFileName);

  // Get input file info
  const inputStats = await fs.stat(inputPath);
  console.log(`[VideoService] Input file size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Get duration first
  const durationMs = await getVideoDuration(inputPath);

  // Convert video
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp4')
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions([
        '-preset fast',
        '-crf 23',
        '-movflags +faststart',
        '-profile:v baseline',
        '-level 3.1',
        '-pix_fmt yuv420p',
      ])
      .on('start', (commandLine) => {
        console.log('[VideoService] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[VideoService] Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[VideoService] FFmpeg error:', err);
        console.error('[VideoService] FFmpeg stderr:', stderr);
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('[VideoService] Conversion complete');
        resolve();
      })
      .save(outputPath);
  });

  const outputStats = await fs.stat(outputPath);
  console.log(`[VideoService] Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

  return {
    path: outputPath,
    fileName: outputFileName,
    mimeType: 'video/mp4',
    durationMs,
  };
}

/**
 * Get video duration in milliseconds
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>}
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[VideoService] Probe error:', err);
        reject(new Error(`Failed to get video duration: ${err.message}`));
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
  });
}

/**
 * Check if video needs conversion (not already MP4)
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean}
 */
function needsConversion(mimeType) {
  const incompatibleFormats = [
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/ogg',
  ];
  return incompatibleFormats.includes(mimeType);
}

module.exports = {
  convertToMp4,
  getVideoDuration,
  needsConversion,
};
