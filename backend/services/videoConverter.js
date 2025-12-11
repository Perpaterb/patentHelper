/**
 * Video Converter Service
 *
 * Converts video files to universally compatible formats.
 * Routes to:
 * - Local ffmpeg (if available)
 * - Media Processor Docker container (development)
 * - Media Processor Lambda (production)
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Optional dependencies - only available in Media Processor Lambda
let ffmpeg = null;
let localFfmpegAvailable = false;

try {
  ffmpeg = require('fluent-ffmpeg');

  // Try bundled ffmpeg first, fall back to system ffmpeg
  try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
  } catch (installerErr) {
    // Use system ffmpeg/ffprobe (must be in PATH)
    console.log('[VideoConverter] Using system ffmpeg');
  }

  localFfmpegAvailable = true;
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
 * Check if video processing is available (any method)
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  if (localFfmpegAvailable) {
    return true;
  }
  if (mediaProcessor) {
    return mediaProcessor.isAvailable();
  }
  return false;
}

/**
 * Check if local ffmpeg is available
 * @throws {Error} If ffmpeg is not available
 */
function requireLocalFfmpeg() {
  if (!localFfmpegAvailable) {
    throw new Error('Local video processing not available. FFmpeg could not be loaded.');
  }
}

/**
 * Convert video file to MP4 format using local ffmpeg
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string}>} Converted file info
 */
async function convertToMp4Local(inputPath, outputDir) {
  requireLocalFfmpeg();
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
        '-preset ultrafast', // Fast encoding for server-side processing
        '-crf 28', // Slightly lower quality for faster encoding
        '-movflags +faststart', // Enable streaming
        '-profile:v baseline', // Wide compatibility (iOS, Android, web)
        '-level 3.1', // Wide device support
        '-pix_fmt yuv420p', // Required for QuickTime/iOS compatibility
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
 * Get video duration in milliseconds using local ffprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} Duration in milliseconds
 */
async function getVideoDurationLocal(filePath) {
  requireLocalFfmpeg();
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
 * Remux WebM file to fix duration metadata
 * Uses ffmpeg -c copy to re-package without re-encoding
 * This fixes the missing duration issue in MediaRecorder WebM files
 * @param {string} inputPath - Path to input WebM file
 * @param {string} outputDir - Directory to save remuxed file
 * @param {number} durationMs - Duration in milliseconds (from client)
 * @returns {Promise<{path: string, fileName: string, mimeType: string, durationMs: number}>}
 */
async function remuxWebm(inputPath, outputDir, durationMs = 0) {
  requireLocalFfmpeg();
  const outputFileName = `${uuidv4()}.webm`;
  const outputPath = path.join(outputDir, outputFileName);

  const inputStats = await fs.stat(inputPath);
  console.log(`[VideoConverter] Remuxing WebM to fix duration. Input size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-c', 'copy']) // Copy streams without re-encoding
      .on('start', (commandLine) => {
        console.log('[VideoConverter] FFmpeg remux command:', commandLine);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[VideoConverter] FFmpeg remux error:', err);
        console.error('[VideoConverter] FFmpeg stderr:', stderr);
        reject(new Error(`WebM remux failed: ${err.message}`));
      })
      .on('end', async () => {
        try {
          const outputStats = await fs.stat(outputPath);
          console.log(`[VideoConverter] Remux complete. Output size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

          // Try to get duration from remuxed file
          let finalDurationMs = durationMs;
          try {
            finalDurationMs = await getVideoDurationLocal(outputPath);
            console.log(`[VideoConverter] Duration from remuxed file: ${finalDurationMs}ms`);
          } catch (probeErr) {
            console.warn(`[VideoConverter] Could not probe duration, using provided: ${durationMs}ms`);
          }

          resolve({
            path: outputPath,
            fileName: outputFileName,
            mimeType: 'video/webm',
            durationMs: finalDurationMs || durationMs,
          });
        } catch (err) {
          reject(new Error(`Failed to read remuxed file: ${err.message}`));
        }
      })
      .save(outputPath);
  });
}

/**
 * Check if file needs conversion (is not mp4)
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} True if conversion needed
 */
function needsConversion(mimeType) {
  // WebM is widely supported now - skip conversion to reduce server load
  // Only convert legacy formats that truly need it
  const incompatibleFormats = [
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    // 'video/webm' - removed: WebM is supported by modern browsers/apps
    // 'video/ogg' - removed: also widely supported
  ];
  return incompatibleFormats.includes(mimeType);
}

/**
 * Convert video via Media Processor service
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string, durationMs: number}>}
 */
async function convertToMp4ViaMediaProcessor(inputPath, outputDir) {
  if (!mediaProcessor) {
    throw new Error('Media processor service not available');
  }

  const result = await mediaProcessor.convertVideo({
    filePath: inputPath,
  });

  // Media processor saves file to /app/uploads/ which maps to ./backend/uploads/
  // Translate container path to host path
  const fileName = result.outputFileName;
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
    mimeType: 'video/mp4',
    durationMs: result.durationMs || 0,
  };
}

/**
 * Convert video file to MP4 format
 * Uses local ffmpeg if available, otherwise routes to media processor
 * @param {string} inputPath - Path to input video file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string}>} Converted file info
 */
async function convertToMp4(inputPath, outputDir) {
  if (localFfmpegAvailable) {
    return convertToMp4Local(inputPath, outputDir);
  }
  return convertToMp4ViaMediaProcessor(inputPath, outputDir);
}

/**
 * Get video duration in milliseconds
 * Uses local ffprobe if available, otherwise returns 0
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} Duration in milliseconds
 */
async function getVideoDuration(filePath) {
  if (localFfmpegAvailable) {
    return getVideoDurationLocal(filePath);
  }
  // Can't get duration without ffmpeg, return 0
  console.log('[VideoConverter] Cannot get duration - local ffmpeg not available');
  return 0;
}

/**
 * Convert video if needed, otherwise return original
 * For WebM files, remux to fix duration metadata
 * @param {string} filePath - Path to video file
 * @param {string} mimeType - Original MIME type
 * @param {string} outputDir - Directory for converted file
 * @param {number} clientDurationMs - Duration from client (optional, for WebM files)
 * @returns {Promise<{path: string, mimeType: string, wasConverted: boolean, durationMs: number}>}
 */
async function convertIfNeeded(filePath, mimeType, outputDir, clientDurationMs = 0) {
  let resultPath = filePath;
  let resultMimeType = mimeType;
  let wasConverted = false;
  let durationMs = 0;

  if (needsConversion(mimeType)) {
    // Convert incompatible formats to MP4
    console.log(`Converting ${mimeType} to MP4...`);
    const result = await convertToMp4(filePath, outputDir);
    resultPath = result.path;
    resultMimeType = result.mimeType;
    wasConverted = true;
    durationMs = result.durationMs || 0;

    // Delete original file after successful conversion
    try {
      await fs.unlink(filePath);
      console.log(`Deleted original file: ${filePath}`);
    } catch (err) {
      console.warn(`Could not delete original file: ${err.message}`);
    }
  } else if (mimeType === 'video/webm' && localFfmpegAvailable) {
    // Remux WebM files to fix duration metadata
    // MediaRecorder WebM files don't have proper duration headers
    console.log(`[VideoConverter] Remuxing WebM to fix duration metadata...`);
    try {
      const result = await remuxWebm(filePath, outputDir, clientDurationMs);
      resultPath = result.path;
      resultMimeType = result.mimeType;
      wasConverted = true; // Mark as converted so caller knows to use new file
      durationMs = result.durationMs;

      // Delete original file after successful remux
      try {
        await fs.unlink(filePath);
        console.log(`Deleted original file: ${filePath}`);
      } catch (err) {
        console.warn(`Could not delete original file: ${err.message}`);
      }
    } catch (remuxErr) {
      console.error(`[VideoConverter] Remux failed, using original file:`, remuxErr.message);
      // Fall back to original file if remux fails
    }
  }

  // Get duration if we haven't already
  if (!durationMs) {
    try {
      durationMs = await getVideoDuration(resultPath);
    } catch (err) {
      console.warn(`[VideoConverter] Could not get duration: ${err.message}`);
      durationMs = clientDurationMs || 0;
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
  convertToMp4,
  getVideoDuration,
  needsConversion,
  convertIfNeeded,
  isAvailable,
  remuxWebm,
};
