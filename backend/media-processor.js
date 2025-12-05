/**
 * Media Processor Lambda Handler
 *
 * Handles video and audio conversion using ffmpeg.
 * Invoked asynchronously by the main API Lambda.
 *
 * Input event:
 * {
 *   operation: 'convert_video' | 'convert_audio',
 *   inputS3Key: 'path/to/input/file',
 *   outputS3Key: 'path/to/output/file',
 *   mimeType: 'video/webm' | 'audio/webm' | etc
 * }
 *
 * Output:
 * {
 *   success: boolean,
 *   outputS3Key: string,
 *   mimeType: string,
 *   durationMs: number,
 *   error?: string
 * }
 */

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Readable } = require('stream');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');

// S3 client
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION,
});

const S3_BUCKET = process.env.S3_BUCKET;

/**
 * Download file from S3 to temp directory
 * @param {string} s3Key - S3 key
 * @returns {Promise<string>} Local file path
 */
async function downloadFromS3(s3Key) {
  const tempPath = path.join(os.tmpdir(), `input-${uuidv4()}${path.extname(s3Key)}`);

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  const response = await s3Client.send(command);
  const stream = response.Body;

  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(tempPath);
    stream.pipe(writeStream);
    writeStream.on('finish', () => resolve(tempPath));
    writeStream.on('error', reject);
  });
}

/**
 * Upload file to S3
 * @param {string} localPath - Local file path
 * @param {string} s3Key - S3 key
 * @param {string} contentType - MIME type
 */
async function uploadToS3(localPath, s3Key, contentType) {
  const fileContent = await fsPromises.readFile(localPath);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileContent,
    ContentType: contentType,
  });

  await s3Client.send(command);
}

/**
 * Delete file from S3
 * @param {string} s3Key - S3 key
 */
async function deleteFromS3(s3Key) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  await s3Client.send(command);
}

/**
 * Convert video to MP4 format
 * @param {string} inputPath - Local input file path
 * @returns {Promise<{outputPath: string, durationMs: number}>}
 */
async function convertVideoToMp4(inputPath) {
  const outputPath = path.join(os.tmpdir(), `output-${uuidv4()}.mp4`);

  const durationMs = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error('Video probe error:', err);
        reject(err);
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
  });

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
        console.log('[MediaProcessor] FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log(`[MediaProcessor] Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('error', (err, stdout, stderr) => {
        console.error('[MediaProcessor] FFmpeg error:', err);
        console.error('[MediaProcessor] FFmpeg stderr:', stderr);
        reject(new Error(`Video conversion failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('[MediaProcessor] Video conversion complete');
        resolve();
      })
      .save(outputPath);
  });

  return { outputPath, durationMs };
}

/**
 * Convert audio to MP3 format
 * @param {string} inputPath - Local input file path
 * @returns {Promise<{outputPath: string, durationMs: number}>}
 */
async function convertAudioToMp3(inputPath) {
  const outputPath = path.join(os.tmpdir(), `output-${uuidv4()}.mp3`);

  const durationMs = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        console.error('Audio probe error:', err);
        reject(err);
        return;
      }
      const durationSeconds = metadata.format?.duration || 0;
      resolve(Math.round(durationSeconds * 1000));
    });
  });

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .audioChannels(1)
      .on('error', (err) => {
        console.error('[MediaProcessor] Audio conversion error:', err);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on('end', () => {
        console.log('[MediaProcessor] Audio conversion complete');
        resolve();
      })
      .save(outputPath);
  });

  return { outputPath, durationMs };
}

/**
 * Clean up temp files
 * @param {...string} paths - File paths to delete
 */
async function cleanup(...paths) {
  for (const p of paths) {
    try {
      await fsPromises.unlink(p);
    } catch (e) {
      // Ignore errors
    }
  }
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log('[MediaProcessor] Received event:', JSON.stringify(event, null, 2));

  const { operation, inputS3Key, outputS3Key, mimeType, deleteOriginal } = event;

  let inputPath = null;
  let outputPath = null;

  try {
    // Download input file from S3
    console.log(`[MediaProcessor] Downloading from S3: ${inputS3Key}`);
    inputPath = await downloadFromS3(inputS3Key);
    console.log(`[MediaProcessor] Downloaded to: ${inputPath}`);

    let result;
    let outputMimeType;

    if (operation === 'convert_video') {
      result = await convertVideoToMp4(inputPath);
      outputMimeType = 'video/mp4';
    } else if (operation === 'convert_audio') {
      result = await convertAudioToMp3(inputPath);
      outputMimeType = 'audio/mpeg';
    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

    outputPath = result.outputPath;

    // Upload converted file to S3
    console.log(`[MediaProcessor] Uploading to S3: ${outputS3Key}`);
    await uploadToS3(outputPath, outputS3Key, outputMimeType);

    // Delete original file if requested
    if (deleteOriginal) {
      console.log(`[MediaProcessor] Deleting original: ${inputS3Key}`);
      await deleteFromS3(inputS3Key);
    }

    // Cleanup temp files
    await cleanup(inputPath, outputPath);

    return {
      success: true,
      outputS3Key,
      mimeType: outputMimeType,
      durationMs: result.durationMs,
    };
  } catch (error) {
    console.error('[MediaProcessor] Error:', error);

    // Cleanup temp files on error
    if (inputPath) await cleanup(inputPath);
    if (outputPath) await cleanup(outputPath);

    return {
      success: false,
      error: error.message,
    };
  }
};
