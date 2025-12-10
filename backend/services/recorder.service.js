/**
 * Recorder Service
 *
 * Routes call recording requests to the Media Processor Docker container (local)
 * or Media Processor Lambda (production).
 *
 * The actual Puppeteer/Chrome recording happens in the media-processor service,
 * not in the main API backend.
 */

const axios = require('axios');

// Configuration
const MEDIA_PROCESSOR_URL = process.env.MEDIA_PROCESSOR_URL || 'http://localhost:3001';
const MEDIA_PROCESSOR_LAMBDA = process.env.MEDIA_PROCESSOR_LAMBDA;
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

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
 * Note: The Media Processor Lambda only supports file conversion (audio/video),
 * NOT live WebRTC call recording. Live recording requires a continuously running
 * service (Docker/EC2) with Puppeteer to join calls as a participant.
 *
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    // Lambda mode does NOT support recording - only file conversion
    // Live WebRTC recording requires a continuously running Puppeteer service
    if (MEDIA_PROCESSOR_LAMBDA) {
      console.log(`[Recorder] Lambda mode does not support live recording - MEDIA_PROCESSOR_LAMBDA=${MEDIA_PROCESSOR_LAMBDA}`);
      return false;
    }

    // HTTP mode - check health endpoint and verify recording capability
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
 * Start recording a call via Media Processor
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

  try {
    // Use Lambda if configured
    if (MEDIA_PROCESSOR_LAMBDA) {
      console.log(`[Recorder] Using Lambda mode for start recording`);
      const result = await invokeLambda('start', payload);
      console.log(`[Recorder] Recording started successfully via Lambda`);
      return result;
    }

    // Fallback to HTTP mode
    console.log(`[Recorder] Using HTTP mode - ${MEDIA_PROCESSOR_URL}`);
    const response = await axios.post(
      `${MEDIA_PROCESSOR_URL}/recording/start`,
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
      throw new Error(`Media processor error: ${error.response.data?.error || error.response.status}`);
    }
    throw error;
  }
}

/**
 * Stop recording a call via Media Processor
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

  try {
    // Use Lambda if configured
    if (MEDIA_PROCESSOR_LAMBDA) {
      console.log(`[Recorder] Using Lambda mode for stop recording`);
      const result = await invokeLambda('stop', payload);
      console.log(`[Recorder] Recording stopped successfully via Lambda`);
      return result;
    }

    // Fallback to HTTP mode
    console.log(`[Recorder] Using HTTP mode - ${MEDIA_PROCESSOR_URL}`);
    const response = await axios.post(
      `${MEDIA_PROCESSOR_URL}/recording/stop`,
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
      throw new Error(`Media processor error: ${error.response.data?.error || error.response.status}`);
    }
    throw error;
  }
}

/**
 * Check if a call is being recorded via Media Processor
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<boolean>}
 */
async function isRecording(callId, callType) {
  try {
    // Use Lambda if configured
    if (MEDIA_PROCESSOR_LAMBDA) {
      const result = await invokeLambda('status', { callId, callType });
      return result.isRecording === true;
    }

    // Fallback to HTTP mode
    const response = await axios.get(
      `${MEDIA_PROCESSOR_URL}/recording/status/${callType}/${callId}`,
      { timeout: 5000 }
    );
    return response.data.isRecording === true;
  } catch (error) {
    console.log('[Recorder] isRecording check failed:', error.message);
    return false;
  }
}

/**
 * Get recording status via Media Processor
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<Object|null>}
 */
async function getRecordingStatus(callId, callType) {
  try {
    // Use Lambda if configured
    if (MEDIA_PROCESSOR_LAMBDA) {
      const result = await invokeLambda('status', { callId, callType });
      if (!result.isRecording) {
        return null;
      }
      return {
        isRecording: result.isRecording,
        startedAt: result.startedAt,
        duration: result.duration,
      };
    }

    // Fallback to HTTP mode
    const response = await axios.get(
      `${MEDIA_PROCESSOR_URL}/recording/status/${callType}/${callId}`,
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
