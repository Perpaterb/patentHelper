/**
 * Media Processor Lambda Handler (for AWS ECR deployment)
 *
 * This is the Lambda entry point when deployed to AWS ECR.
 * Handles video/audio conversion, image conversion, and PDF generation.
 *
 * Invoked asynchronously by the main API Lambda.
 *
 * Input event:
 * {
 *   operation: 'convert_video' | 'convert_audio' | 'convert_image' | 'generate_pdf',
 *   inputS3Key?: string,   // For file conversions
 *   outputS3Key?: string,  // For file conversions
 *   mimeType?: string,     // Original MIME type
 *   deleteOriginal?: boolean,
 *   pdfType?: string,      // For PDF generation
 *   pdfData?: object       // For PDF generation
 * }
 *
 * Output:
 * {
 *   success: boolean,
 *   outputS3Key?: string,
 *   mimeType?: string,
 *   durationMs?: number,
 *   error?: string
 * }
 */

const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Import processing services
const videoService = require('./services/video.service');
const audioService = require('./services/audio.service');
const imageService = require('./services/image.service');
const pdfService = require('./services/pdf.service');

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
 * Upload buffer to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} s3Key - S3 key
 * @param {string} contentType - MIME type
 */
async function uploadBufferToS3(buffer, s3Key, contentType) {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
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

  const { operation, inputS3Key, outputS3Key, mimeType, deleteOriginal, pdfType, pdfData } = event;

  let inputPath = null;

  try {
    // Handle PDF generation (no S3 input file)
    if (operation === 'generate_pdf') {
      if (!pdfType || !pdfData) {
        throw new Error('PDF generation requires pdfType and pdfData');
      }

      let pdfBuffer;
      if (pdfType === 'audit-log') {
        pdfBuffer = pdfService.generateAuditLogPDF(pdfData);
      } else {
        throw new Error(`Unknown PDF type: ${pdfType}`);
      }

      await uploadBufferToS3(pdfBuffer, outputS3Key, 'application/pdf');

      return {
        success: true,
        outputS3Key,
        mimeType: 'application/pdf',
        size: pdfBuffer.length,
      };
    }

    // For file conversions, download from S3 first
    console.log(`[MediaProcessor] Downloading from S3: ${inputS3Key}`);
    inputPath = await downloadFromS3(inputS3Key);
    console.log(`[MediaProcessor] Downloaded to: ${inputPath}`);

    let result;
    let outputMimeType;
    let outputPath;

    if (operation === 'convert_video') {
      const converted = await videoService.convertToMp4(inputPath, os.tmpdir());
      outputPath = converted.path;
      outputMimeType = converted.mimeType;
      result = { durationMs: converted.durationMs };
    } else if (operation === 'convert_audio') {
      const converted = await audioService.convertToMp3(inputPath, os.tmpdir());
      outputPath = converted.path;
      outputMimeType = converted.mimeType;
      result = { durationMs: converted.durationMs };
    } else if (operation === 'convert_image') {
      const inputBuffer = await fsPromises.readFile(inputPath);
      const converted = await imageService.convertImage(inputBuffer, mimeType, os.tmpdir());
      outputPath = converted.path;
      outputMimeType = converted.mimeType;
      result = { converted: converted.converted };
    } else {
      throw new Error(`Unknown operation: ${operation}`);
    }

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
      ...result,
    };
  } catch (error) {
    console.error('[MediaProcessor] Error:', error);

    // Cleanup temp files on error
    if (inputPath) await cleanup(inputPath);

    return {
      success: false,
      error: error.message,
    };
  }
};
