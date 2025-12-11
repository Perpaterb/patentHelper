/**
 * Audio Conversion Service
 *
 * Converts audio files to universally compatible MP3 format using ffmpeg.
 * Supports: webm, ogg, wav, m4a, aac -> mp3
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Convert audio file to MP3 format
 * @param {string} inputPath - Path to input audio file
 * @param {string} outputDir - Directory to save converted file
 * @returns {Promise<{path: string, fileName: string, mimeType: string, durationMs: number}>}
 */
async function convertToMp3(inputPath, outputDir) {
  const outputFileName = `${uuidv4()}.mp3`;
  const outputPath = path.join(outputDir, outputFileName);

  // Get input file info
  const inputStats = await fs.stat(inputPath);
  console.log(`[AudioService] Input file size: ${(inputStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Get duration first
  const durationMs = await getAudioDuration(inputPath);

  // Convert audio
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(2)
      .on('start', (commandLine) => {
        console.log('[AudioService] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[AudioService] Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[AudioService] FFmpeg error:', err);
        console.error('[AudioService] FFmpeg stderr:', stderr);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('[AudioService] Conversion complete');
        resolve();
      })
      .save(outputPath);
  });

  const outputStats = await fs.stat(outputPath);
  console.log(`[AudioService] Output file size: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

  return {
    path: outputPath,
    fileName: outputFileName,
    mimeType: 'audio/mpeg',
    durationMs,
  };
}

/**
 * Get audio duration in milliseconds
 * @param {string} filePath - Path to audio file
 * @returns {Promise<number>}
 */
function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('[AudioService] Probe error:', err);
        reject(new Error(`Failed to get audio duration: ${err.message}`));
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
  });
}

/**
 * Check if audio needs conversion (not already MP3)
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean}
 */
function needsConversion(mimeType) {
  const incompatibleFormats = [
    'audio/webm',
    'audio/ogg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ];
  return incompatibleFormats.includes(mimeType);
}

module.exports = {
  convertToMp3,
  getAudioDuration,
  needsConversion,
};
