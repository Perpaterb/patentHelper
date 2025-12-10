/**
 * Worker Service Abstraction (formerly Media Processor)
 *
 * Routes heavy processing requests to:
 * - Local: HTTP server at localhost:3001 (Docker container "worker-service")
 * - Production: AWS Lambda (ECR container)
 *
 * Handles: video/audio conversion (ffmpeg), image conversion (sharp),
 * PDF generation, and call recording (puppeteer).
 *
 * This abstraction allows the same backend code to work
 * in both development and production environments.
 *
 * @module services/mediaProcessor
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// AWS SDK (only used in production)
let LambdaClient, InvokeCommand;
try {
  const awsLambda = require('@aws-sdk/client-lambda');
  LambdaClient = awsLambda.LambdaClient;
  InvokeCommand = awsLambda.InvokeCommand;
} catch (err) {
  // AWS SDK not available in local development - expected behavior
}

// Configuration (supports both new WORKER_SERVICE_* and legacy MEDIA_PROCESSOR_* env vars)
const isProduction = process.env.NODE_ENV === 'production';
const WORKER_SERVICE_URL = process.env.WORKER_SERVICE_URL || process.env.MEDIA_PROCESSOR_URL || 'http://localhost:3001';
const WORKER_SERVICE_LAMBDA = process.env.WORKER_SERVICE_LAMBDA || process.env.MEDIA_PROCESSOR_LAMBDA || 'family-helper-worker-service-prod';
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_S3_REGION || 'ap-southeast-2';

// Lambda client (initialized lazily)
let lambdaClient = null;

function getLambdaClient() {
  if (!lambdaClient && LambdaClient) {
    lambdaClient = new LambdaClient({ region: AWS_REGION });
  }
  return lambdaClient;
}

/**
 * Invoke Lambda function
 * @param {Object} payload - Lambda event payload
 * @returns {Promise<Object>} Lambda response
 */
async function invokeLambda(payload) {
  const client = getLambdaClient();
  if (!client) {
    throw new Error('AWS Lambda client not available');
  }

  const command = new InvokeCommand({
    FunctionName: WORKER_SERVICE_LAMBDA,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  });

  const response = await client.send(command);
  const responsePayload = JSON.parse(Buffer.from(response.Payload).toString());

  if (!responsePayload.success) {
    throw new Error(responsePayload.error || 'Lambda invocation failed');
  }

  return responsePayload;
}

/**
 * Call local worker service HTTP endpoint
 * @param {string} endpoint - Endpoint path
 * @param {Object} options - Request options
 * @returns {Promise<Object>} Response data
 */
async function callLocalProcessor(endpoint, options = {}) {
  const url = `${WORKER_SERVICE_URL}${endpoint}`;

  try {
    const response = await axios({
      method: options.method || 'POST',
      url,
      data: options.data,
      headers: options.headers,
      timeout: options.timeout || 300000, // 5 minute timeout
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Media processing failed');
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || `HTTP ${error.response.status}`);
    }
    throw error;
  }
}

/**
 * Call local worker service with file upload
 * @param {string} endpoint - Endpoint path
 * @param {string} filePath - Path to file to upload
 * @param {Object} additionalFields - Additional form fields
 * @returns {Promise<Object>} Response data
 */
async function callLocalProcessorWithFile(endpoint, filePath, additionalFields = {}) {
  const url = `${WORKER_SERVICE_URL}${endpoint}`;

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  for (const [key, value] of Object.entries(additionalFields)) {
    form.append(key, value);
  }

  try {
    const response = await axios.post(url, form, {
      headers: form.getHeaders(),
      timeout: 300000, // 5 minute timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Media processing failed');
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data?.error || `HTTP ${error.response.status}`);
    }
    throw error;
  }
}

// ============================================
// Public API
// ============================================

/**
 * Convert video to MP4
 *
 * Local: Uploads file to local processor, receives converted file path
 * Production: Invokes Lambda with S3 keys
 *
 * @param {Object} options
 * @param {string} [options.filePath] - Local file path (local mode)
 * @param {string} [options.inputS3Key] - S3 key for input file (production)
 * @param {string} [options.outputS3Key] - S3 key for output file (production)
 * @param {boolean} [options.deleteOriginal] - Delete original after conversion
 * @returns {Promise<Object>}
 */
async function convertVideo(options) {
  console.log('[MediaProcessor] Converting video...', { isProduction });

  if (isProduction) {
    return invokeLambda({
      operation: 'convert_video',
      inputS3Key: options.inputS3Key,
      outputS3Key: options.outputS3Key,
      deleteOriginal: options.deleteOriginal,
    });
  }

  // Local mode
  if (!options.filePath) {
    throw new Error('filePath is required for local video conversion');
  }

  return callLocalProcessorWithFile('/convert/video', options.filePath);
}

/**
 * Convert audio to MP3
 *
 * @param {Object} options
 * @param {string} [options.filePath] - Local file path (local mode)
 * @param {string} [options.inputS3Key] - S3 key for input file (production)
 * @param {string} [options.outputS3Key] - S3 key for output file (production)
 * @param {boolean} [options.deleteOriginal] - Delete original after conversion
 * @returns {Promise<Object>}
 */
async function convertAudio(options) {
  console.log('[MediaProcessor] Converting audio...', { isProduction });

  if (isProduction) {
    return invokeLambda({
      operation: 'convert_audio',
      inputS3Key: options.inputS3Key,
      outputS3Key: options.outputS3Key,
      deleteOriginal: options.deleteOriginal,
    });
  }

  // Local mode
  if (!options.filePath) {
    throw new Error('filePath is required for local audio conversion');
  }

  return callLocalProcessorWithFile('/convert/audio', options.filePath);
}

/**
 * Convert image to PNG/JPEG
 *
 * @param {Object} options
 * @param {string} [options.filePath] - Local file path (local mode)
 * @param {string} [options.mimeType] - Original MIME type
 * @param {string} [options.inputS3Key] - S3 key for input file (production)
 * @param {string} [options.outputS3Key] - S3 key for output file (production)
 * @param {boolean} [options.deleteOriginal] - Delete original after conversion
 * @returns {Promise<Object>}
 */
async function convertImage(options) {
  console.log('[MediaProcessor] Converting image...', { isProduction });

  if (isProduction) {
    return invokeLambda({
      operation: 'convert_image',
      inputS3Key: options.inputS3Key,
      outputS3Key: options.outputS3Key,
      mimeType: options.mimeType,
      deleteOriginal: options.deleteOriginal,
    });
  }

  // Local mode
  if (!options.filePath) {
    throw new Error('filePath is required for local image conversion');
  }

  return callLocalProcessorWithFile('/convert/image', options.filePath, {
    mimeType: options.mimeType || 'image/unknown',
  });
}

/**
 * Generate PDF
 *
 * @param {Object} options
 * @param {string} options.type - PDF type (e.g., 'audit-log')
 * @param {Object} options.data - PDF generation data
 * @param {string} [options.outputS3Key] - S3 key for output (production)
 * @returns {Promise<Object>}
 */
async function generatePDF(options) {
  console.log('[MediaProcessor] Generating PDF...', { isProduction, type: options.type });

  if (isProduction) {
    return invokeLambda({
      operation: 'generate_pdf',
      pdfType: options.type,
      pdfData: options.data,
      outputS3Key: options.outputS3Key,
    });
  }

  // Local mode
  return callLocalProcessor('/generate/pdf', {
    method: 'POST',
    data: {
      type: options.type,
      data: options.data,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Check if worker service is available
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  if (isProduction) {
    // In production, assume Lambda is available
    return true;
  }

  try {
    const response = await axios.get(`${WORKER_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return response.data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

/**
 * Get worker service health status
 * @returns {Promise<Object>}
 */
async function getHealth() {
  if (isProduction) {
    return {
      status: 'healthy',
      mode: 'lambda',
      functionName: WORKER_SERVICE_LAMBDA,
    };
  }

  try {
    const response = await axios.get(`${WORKER_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    return {
      ...response.data,
      mode: 'local',
      url: WORKER_SERVICE_URL,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      mode: 'local',
      url: WORKER_SERVICE_URL,
      error: error.message,
    };
  }
}

/**
 * Check worker service status and log capabilities at startup
 * This consolidates all media processing capability logs into one place
 * @returns {Promise<Object>} Health status with capabilities
 */
async function checkAndLogStatus() {
  const capabilities = {
    video: false,
    audio: false,
    image: false,
    pdf: false,
    callRecording: false,
  };

  let statusMessage = '';
  let containerUp = false;

  if (isProduction) {
    // In production, Lambda handles all processing
    statusMessage = '☁️  Worker Service (heavy processing) via AWS Lambda';
    capabilities.video = true;
    capabilities.audio = true;
    capabilities.image = true;
    capabilities.pdf = true;
    capabilities.callRecording = true;
    containerUp = true;
  } else {
    // Check local Docker container
    try {
      const response = await axios.get(`${WORKER_SERVICE_URL}/health`, {
        timeout: 5000,
      });

      if (response.data.status === 'healthy') {
        containerUp = true;
        const caps = response.data.capabilities || [];
        capabilities.video = caps.includes('video');
        capabilities.audio = caps.includes('audio');
        capabilities.image = caps.includes('image');
        capabilities.pdf = caps.includes('pdf');
        capabilities.callRecording = caps.includes('recording') || caps.includes('puppeteer');

        // Build status message
        const enabledCaps = [];
        if (capabilities.video) enabledCaps.push('video');
        if (capabilities.audio) enabledCaps.push('audio');
        if (capabilities.image) enabledCaps.push('image');
        if (capabilities.pdf) enabledCaps.push('PDF');
        if (capabilities.callRecording) enabledCaps.push('call recording');

        statusMessage = `✅ Worker Service (Docker) - ${enabledCaps.join(', ')} ready`;
      } else {
        statusMessage = '❌ Worker Service (Docker) - unhealthy';
      }
    } catch (error) {
      statusMessage = `❌ Worker Service (Docker) - not running (${WORKER_SERVICE_URL})`;
    }
  }

  console.log(statusMessage);

  return {
    containerUp,
    capabilities,
    url: WORKER_SERVICE_URL,
    isProduction,
  };
}

module.exports = {
  convertVideo,
  convertAudio,
  convertImage,
  generatePDF,
  isAvailable,
  getHealth,
  checkAndLogStatus,
  // Export config for debugging
  config: {
    isProduction,
    workerServiceUrl: WORKER_SERVICE_URL,
    workerServiceLambda: WORKER_SERVICE_LAMBDA,
  },
};
