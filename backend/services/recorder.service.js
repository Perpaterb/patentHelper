/**
 * Recorder Service
 *
 * Routes call recording requests to:
 * 1. Local Puppeteer (unified server / Lightsail) - Direct in-process recording
 * 2. HTTP Recorder Service (legacy Docker setup) - For backward compatibility
 *
 * In unified Lightsail mode, recording happens directly in this process
 * using the local Puppeteer service.
 */

const axios = require('axios');

// Configuration
// USE_LOCAL_RECORDER: Set to 'true' for unified Lightsail mode (direct Puppeteer)
// RECORDER_HTTP_URL: URL for legacy HTTP-based recorder service
const USE_LOCAL_RECORDER = process.env.USE_LOCAL_RECORDER === 'true' ||
                           process.env.NODE_ENV === 'production' && !process.env.RECORDER_HTTP_URL;
const RECORDER_HTTP_URL = process.env.RECORDER_HTTP_URL || process.env.RECORDER_FARGATE_URL || 'http://localhost:3001';
const UPLOADS_DIR = process.env.UPLOADS_DIR || require('path').join(__dirname, '../uploads');

// Local Puppeteer recorder (lazy loaded)
let localRecorder = null;
function getLocalRecorder() {
  if (!localRecorder) {
    localRecorder = require('./media/puppeteer.recorder.service');
  }
  return localRecorder;
}

// Log mode at startup
console.log(`[Recorder] Mode: ${USE_LOCAL_RECORDER ? 'Local Puppeteer (unified)' : 'HTTP (' + RECORDER_HTTP_URL + ')'}`);


/**
 * Check if recording service is available
 *
 * Modes:
 * 1. Local Puppeteer (unified/Lightsail) - Always available if puppeteer is installed
 * 2. HTTP Recorder Service (legacy Docker) - Requires health check
 *
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  // Local Puppeteer mode - always available (puppeteer is a dependency)
  if (USE_LOCAL_RECORDER) {
    console.log('[Recorder] Local Puppeteer mode - available');
    return true;
  }

  // HTTP mode - check health endpoint
  try {
    const response = await axios.get(`${RECORDER_HTTP_URL}/health`, { timeout: 5000 });
    const hasRecordingCapability = response.data.status === 'healthy' &&
                                   response.data.capabilities?.includes('recording');
    console.log(`[Recorder] HTTP service available: ${hasRecordingCapability}, capabilities: ${response.data.capabilities}`);
    return hasRecordingCapability;
  } catch (error) {
    console.log('[Recorder] HTTP service not available:', error.message);
    return false;
  }
}

/**
 * Start recording a call
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

  // Local Puppeteer mode (unified/Lightsail)
  if (USE_LOCAL_RECORDER) {
    console.log('[Recorder] Using local Puppeteer');
    const recorder = getLocalRecorder();
    return recorder.startRecording({
      groupId,
      callId,
      callType,
      authToken,
      apiUrl,
      uploadsDir: UPLOADS_DIR,
    });
  }

  // HTTP mode (legacy Docker)
  console.log(`[Recorder] Using HTTP mode - ${RECORDER_HTTP_URL}`);
  try {
    const response = await axios.post(
      `${RECORDER_HTTP_URL}/recording/start`,
      { groupId, callId, callType, authToken, apiUrl },
      { timeout: 60000 } // 1 minute timeout for browser launch
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start recording');
    }

    console.log('[Recorder] Recording started successfully via HTTP');
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
 * Stop recording a call
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<Object>} Recording result
 */
async function stopRecording(callId, callType) {
  console.log(`[Recorder] Stopping recording for ${callType}-${callId}`);

  // Local Puppeteer mode (unified/Lightsail)
  if (USE_LOCAL_RECORDER) {
    console.log('[Recorder] Using local Puppeteer');
    const recorder = getLocalRecorder();
    return recorder.stopRecording(callId, callType);
  }

  // HTTP mode (legacy Docker)
  console.log(`[Recorder] Using HTTP mode - ${RECORDER_HTTP_URL}`);
  try {
    const response = await axios.post(
      `${RECORDER_HTTP_URL}/recording/stop`,
      { callId, callType },
      { timeout: 30000 } // 30 second timeout
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to stop recording');
    }

    console.log('[Recorder] Recording stopped successfully via HTTP');
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
 * Check if a call is being recorded
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<boolean>}
 */
async function isRecording(callId, callType) {
  // Local Puppeteer mode
  if (USE_LOCAL_RECORDER) {
    const recorder = getLocalRecorder();
    return recorder.isRecording(callId, callType);
  }

  // HTTP mode
  try {
    const response = await axios.get(
      `${RECORDER_HTTP_URL}/recording/status/${callType}/${callId}`,
      { timeout: 5000 }
    );
    return response.data.isRecording === true;
  } catch (error) {
    console.log('[Recorder] isRecording check failed:', error.message);
    return false;
  }
}

/**
 * Get recording status
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Promise<Object|null>}
 */
async function getRecordingStatus(callId, callType) {
  // Local Puppeteer mode
  if (USE_LOCAL_RECORDER) {
    const recorder = getLocalRecorder();
    return recorder.getRecordingStatus(callId, callType);
  }

  // HTTP mode
  try {
    const response = await axios.get(
      `${RECORDER_HTTP_URL}/recording/status/${callType}/${callId}`,
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
 */
async function stopAllRecordings() {
  if (USE_LOCAL_RECORDER) {
    const recorder = getLocalRecorder();
    return recorder.stopAllRecordings();
  }
  console.log('[Recorder] stopAllRecordings - HTTP mode does not support this operation');
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
  getRecordingStatus,
  stopAllRecordings,
  isAvailable,
};
