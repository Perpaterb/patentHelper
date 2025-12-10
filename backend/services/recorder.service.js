/**
 * Recorder Service
 *
 * Routes call recording requests to:
 * 1. Fargate Recorder Service (production) - Always-warm container for 2-3s start time
 * 2. Local Docker container (development) - For local testing
 *
 * The actual Puppeteer/Chrome recording happens in the recorder-service container,
 * not in the main API backend. Media Processor Lambda is for file conversion only.
 */

const axios = require('axios');

// Configuration
// Priority: RECORDER_FARGATE_URL > MEDIA_PROCESSOR_URL (local)
const RECORDER_FARGATE_URL = process.env.RECORDER_FARGATE_URL;
const MEDIA_PROCESSOR_URL = process.env.MEDIA_PROCESSOR_URL || 'http://localhost:3001';
const MEDIA_PROCESSOR_LAMBDA = process.env.MEDIA_PROCESSOR_LAMBDA;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

// Get the active recorder URL (Fargate if set, otherwise local)
function getRecorderUrl() {
  return RECORDER_FARGATE_URL || MEDIA_PROCESSOR_URL;
}

// Use Lambda SDK only when MEDIA_PROCESSOR_LAMBDA is set
let lambdaClient = null;
if (MEDIA_PROCESSOR_LAMBDA) {
  const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
  lambdaClient = new LambdaClient({ region: AWS_REGION });
}

/**
 * Invoke the Media Processor Lambda function
 * @param {string} action - The action to perform (start, stop, status)
 * @param {Object} payload - The payload to send
 * @returns {Promise<Object>} The response from the Lambda
 */
async function invokeLambda(action, payload) {
  if (!lambdaClient) {
    throw new Error('Lambda client not initialized - MEDIA_PROCESSOR_LAMBDA not set');
  }

  const { InvokeCommand } = require('@aws-sdk/client-lambda');

  console.log(`[Recorder] Invoking Lambda ${MEDIA_PROCESSOR_LAMBDA} with action: ${action}`);

  const command = new InvokeCommand({
    FunctionName: MEDIA_PROCESSOR_LAMBDA,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify({
      action,
      ...payload,
    }),
  });

  const response = await lambdaClient.send(command);

  // Parse the response
  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));

  // Check for Lambda execution errors
  if (response.FunctionError) {
    console.error('[Recorder] Lambda execution error:', responsePayload);
    throw new Error(responsePayload.errorMessage || 'Lambda execution failed');
  }

  // Handle API Gateway-style response (statusCode + body)
  if (responsePayload.statusCode && responsePayload.body) {
    const body = typeof responsePayload.body === 'string'
      ? JSON.parse(responsePayload.body)
      : responsePayload.body;

    if (responsePayload.statusCode >= 400) {
      throw new Error(body.error || body.message || 'Media processor error');
    }

    return body;
  }

  return responsePayload;
}

/**
 * Check if recording service is available
 *
 * Priority:
 * 1. Fargate Recorder Service (RECORDER_FARGATE_URL) - Production
 * 2. Local Docker container (MEDIA_PROCESSOR_URL) - Development
 *
 * Note: The Media Processor Lambda only supports file conversion (audio/video),
 * NOT live WebRTC call recording. Live recording requires a continuously running
 * service with Puppeteer.
 *
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    // Check Fargate recorder service first (production)
    if (RECORDER_FARGATE_URL) {
      try {
        const response = await axios.get(`${RECORDER_FARGATE_URL}/health`, { timeout: 5000 });
        const hasRecordingCapability = response.data.status === 'healthy' && response.data.capabilities?.includes('recording');
        console.log(`[Recorder] Fargate service available: ${hasRecordingCapability}, capabilities: ${response.data.capabilities}`);
        return hasRecordingCapability;
      } catch (error) {
        console.log(`[Recorder] Fargate service not available: ${error.message}`);
        // Fall through to check local service
      }
    }

    // Lambda mode does NOT support recording - only file conversion
    // Live WebRTC recording requires a continuously running Puppeteer service
    if (MEDIA_PROCESSOR_LAMBDA && !RECORDER_FARGATE_URL) {
      console.log(`[Recorder] Lambda mode does not support live recording - MEDIA_PROCESSOR_LAMBDA=${MEDIA_PROCESSOR_LAMBDA}`);
      return false;
    }

    // HTTP mode (local docker) - check health endpoint and verify recording capability
    const response = await axios.get(`${MEDIA_PROCESSOR_URL}/health`, { timeout: 5000 });
    const hasRecordingCapability = response.data.status === 'healthy' && response.data.capabilities?.includes('recording');
    console.log(`[Recorder] HTTP mode available: ${hasRecordingCapability}, capabilities: ${response.data.capabilities}`);
    return hasRecordingCapability;
  } catch (error) {
    console.log('[Recorder] Service not available:', error.message);
    return false;
  }
}

/**
 * Start recording a call via Recorder Service
 *
 * Priority:
 * 1. Fargate Recorder Service (RECORDER_FARGATE_URL) - Production
 * 2. Local Docker container (MEDIA_PROCESSOR_URL) - Development
 *
 * @param {Object} options - Recording options
 * @param {string} options.groupId - Group ID
 * @param {string} options.callId - Call ID
 * @param {string} options.callType - 'phone' or 'video'
 * @param {string} options.authToken - Auth token for API access
 * @param {string} options.apiUrl - Backend API URL
 * @returns {Promise<Object>} Recording session info
 */
async function startRecording({ groupId, callId, callType, authToken, apiUrl }) {
  console.log(`[Recorder] Starting recording for ${callType}-${callId}`);

  const payload = {
    groupId,
    callId,
    callType,
    authToken,
    apiUrl,
  };

  const recorderUrl = getRecorderUrl();

  try {
    // Use HTTP mode (Fargate or local Docker)
    console.log(`[Recorder] Using HTTP mode - ${recorderUrl}`);
    const response = await axios.post(
      `${recorderUrl}/recording/start`,
      payload,
      {
        timeout: 60000, // 1 minute timeout for browser launch
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start recording');
    }

    console.log(`[Recorder] Recording started successfully via HTTP`);
    return response.data;
  } catch (error) {
    console.error('[Recorder] Start recording error:', error.message);
    if (error.response) {
      throw new Error(`Recorder service error: ${error.response.data?.error || error.response.status}`);
    }
    throw error;
  }
}

/**
 * Stop recording a call via Recorder Service
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<Object>} Recording result
 */
async function stopRecording(callId, callType) {
  console.log(`[Recorder] Stopping recording for ${callType}-${callId}`);

  const payload = {
    callId,
    callType,
  };

  const recorderUrl = getRecorderUrl();

  try {
    // Use HTTP mode (Fargate or local Docker)
    console.log(`[Recorder] Using HTTP mode - ${recorderUrl}`);
    const response = await axios.post(
      `${recorderUrl}/recording/stop`,
      payload,
      {
        timeout: 30000, // 30 second timeout
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to stop recording');
    }

    console.log(`[Recorder] Recording stopped successfully via HTTP`);
    return response.data;
  } catch (error) {
    console.error('[Recorder] Stop recording error:', error.message);
    if (error.response) {
      throw new Error(`Recorder service error: ${error.response.data?.error || error.response.status}`);
    }
    throw error;
  }
}

/**
 * Check if a call is being recorded via Recorder Service
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<boolean>}
 */
async function isRecording(callId, callType) {
  const recorderUrl = getRecorderUrl();

  try {
    // Use HTTP mode (Fargate or local Docker)
    const response = await axios.get(
      `${recorderUrl}/recording/status/${callType}/${callId}`,
      { timeout: 5000 }
    );
    return response.data.isRecording === true;
  } catch (error) {
    console.log('[Recorder] isRecording check failed:', error.message);
    return false;
  }
}

/**
 * Get recording status via Recorder Service
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<Object|null>}
 */
async function getRecordingStatus(callId, callType) {
  const recorderUrl = getRecorderUrl();

  try {
    // Use HTTP mode (Fargate or local Docker)
    const response = await axios.get(
      `${recorderUrl}/recording/status/${callType}/${callId}`,
      { timeout: 5000 }
    );

    if (!response.data.isRecording) {
      return null;
    }

    return {
      isRecording: response.data.isRecording,
      startedAt: response.data.startedAt,
      duration: response.data.duration,
    };
  } catch (error) {
    console.log('[Recorder] getRecordingStatus failed:', error.message);
    return null;
  }
}

/**
 * Stop all active recordings (for graceful shutdown)
 * Note: This is a no-op in the routing service - the media processor handles its own cleanup
 */
async function stopAllRecordings() {
  console.log(`[Recorder] stopAllRecordings called - media processor handles its own cleanup`);
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
  getRecordingStatus,
  stopAllRecordings,
  isAvailable,
};
