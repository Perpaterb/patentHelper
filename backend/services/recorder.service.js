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

/**
 * Check if recording service is available
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    const response = await axios.get(`${MEDIA_PROCESSOR_URL}/health`, { timeout: 5000 });
    return response.data.status === 'healthy' && response.data.capabilities?.includes('recording');
  } catch (error) {
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
  console.log(`[Recorder] Starting recording via media processor for ${callType}-${callId}`);

  try {
    const response = await axios.post(
      `${MEDIA_PROCESSOR_URL}/recording/start`,
      {
        groupId,
        callId,
        callType,
        authToken,
        apiUrl,
      },
      {
        timeout: 60000, // 1 minute timeout for browser launch
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start recording');
    }

    console.log(`[Recorder] Recording started successfully`);
    return response.data;
  } catch (error) {
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
  console.log(`[Recorder] Stopping recording via media processor for ${callType}-${callId}`);

  try {
    const response = await axios.post(
      `${MEDIA_PROCESSOR_URL}/recording/stop`,
      {
        callId,
        callType,
      },
      {
        timeout: 30000, // 30 second timeout
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to stop recording');
    }

    console.log(`[Recorder] Recording stopped successfully`);
    return response.data;
  } catch (error) {
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
    const response = await axios.get(
      `${MEDIA_PROCESSOR_URL}/recording/status/${callType}/${callId}`,
      { timeout: 5000 }
    );
    return response.data.isRecording === true;
  } catch (error) {
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
