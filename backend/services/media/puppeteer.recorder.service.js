/**
 * Puppeteer Recording Service - Local/Unified
 *
 * Uses a headless browser to join calls as a "ghost" participant
 * and record all audio/video streams server-side.
 *
 * This is the DIRECT version that runs in the unified server (Lightsail),
 * not requiring a separate container or HTTP calls.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Track active recording sessions
const activeRecordings = new Map();

// In unified server, puppeteer uses bundled Chromium
// In Docker, we may need to specify the path
const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || null;

/**
 * Start recording a call
 *
 * @param {Object} options - Recording options
 * @param {string} options.groupId - Group ID
 * @param {string} options.callId - Call ID
 * @param {string} options.callType - 'phone' or 'video'
 * @param {string} options.authToken - Auth token for API access
 * @param {string} options.apiUrl - Backend API URL
 * @param {string} options.uploadsDir - Directory to save recordings
 * @returns {Promise<Object>} Recording session info
 */
async function startRecording({ groupId, callId, callType, authToken, apiUrl, uploadsDir }) {
  const sessionKey = `${callType}-${callId}`;

  // Check if already recording
  if (activeRecordings.has(sessionKey)) {
    console.log(`[Recorder] Already recording ${sessionKey}`);
    return { success: true, message: 'Recording already in progress' };
  }

  console.log(`[Recorder] Starting recording for ${sessionKey}`);

  try {
    // Launch headless browser with proper audio support
    const launchOptions = {
      headless: 'new',
      // Increase protocol timeout for long-running operations like chunk uploads
      protocolTimeout: 300000, // 5 minutes
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream', // Auto-allow media permissions
        '--use-fake-device-for-media-stream', // Use fake audio device for local stream
        '--disable-web-security',
        '--allow-file-access-from-files',
        // Audio processing flags
        '--autoplay-policy=no-user-gesture-required', // Allow autoplay without user gesture
        '--disable-features=AudioServiceOutOfProcess', // Keep audio in main process
        '--enable-features=AudioServiceSandbox', // Enable audio sandbox
        // WebRTC specific flags
        '--enable-webrtc-hide-local-ips-with-mdns=false',
        '--disable-rtc-smoothness-algorithm',
        // Additional audio flags for headless mode
        '--ignore-autoplay-restrictions',
      ],
    };

    // Only set executablePath if explicitly specified (otherwise use bundled Chromium)
    if (CHROMIUM_PATH) {
      launchOptions.executablePath = CHROMIUM_PATH;
    }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();

    // Set longer timeout for page operations (needed for chunked recording uploads)
    page.setDefaultTimeout(120000); // 2 minutes

    // Set up console logging from the page
    page.on('console', msg => {
      console.log(`[Recorder Page] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.error(`[Recorder Page Error] ${err.message}`);
    });

    // Navigate to the appropriate recorder page based on call type
    // In unified server, we use the same process so localhost works directly
    const recorderPage = callType === 'video' ? '/videoRecorder.html' : '/recorder.html';
    const recorderUrl = new URL(recorderPage, apiUrl);
    recorderUrl.searchParams.set('apiUrl', apiUrl);
    recorderUrl.searchParams.set('groupId', groupId);
    recorderUrl.searchParams.set('callId', callId);
    recorderUrl.searchParams.set('callType', callType);
    recorderUrl.searchParams.set('token', authToken);

    console.log(`[Recorder] API URL: ${apiUrl}`);
    console.log(`[Recorder] Loading recorder page: ${recorderUrl.toString()}`);
    await page.goto(recorderUrl.toString(), { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for recorder to initialize
    await page.waitForFunction('window.recorderReady === true', { timeout: 30000 });

    console.log(`[Recorder] Recording started for ${sessionKey}`);

    // Store the session
    activeRecordings.set(sessionKey, {
      browser,
      page,
      groupId,
      callId,
      callType,
      startedAt: new Date(),
      uploadsDir,
    });

    return {
      success: true,
      message: 'Recording started',
      sessionKey,
    };

  } catch (err) {
    console.error(`[Recorder] Failed to start recording:`, err);
    throw new Error(`Failed to start recording: ${err.message}`);
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
  const sessionKey = `${callType}-${callId}`;
  const session = activeRecordings.get(sessionKey);

  if (!session) {
    console.log(`[Recorder] No active recording for ${sessionKey}`);
    return { success: false, message: 'No active recording found' };
  }

  console.log(`[Recorder] Stopping recording for ${sessionKey}`);

  try {
    const { browser, page } = session;
    const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

    // Get recording status before stopping
    const recordingStatus = await page.evaluate(() => ({
      isRecording: window.isRecording,
      chunks: typeof recordedChunks !== 'undefined' ? recordedChunks.length : 0,
    }));
    console.log(`[Recorder] Recording status before stop:`, recordingStatus);

    // Tell the page to stop recording and wait for upload
    if (recordingStatus.isRecording) {
      console.log(`[Recorder] Stopping MediaRecorder...`);
      // stopRecording now handles chunked recording - stops all recorders and waits for uploads
      await page.evaluate(() => window.stopRecording());

      // Wait for upload to complete (longer wait for chunked uploads)
      console.log(`[Recorder] Waiting for upload to complete...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      console.log(`[Recorder] Recording was not active`);
    }

    // Cleanup
    console.log(`[Recorder] Running cleanup...`);
    await page.evaluate(() => window.cleanup());
    await browser.close();

    activeRecordings.delete(sessionKey);

    console.log(`[Recorder] Recording stopped for ${sessionKey}. Duration: ${duration}s`);

    return {
      success: true,
      message: 'Recording stopped and uploaded',
      duration,
    };

  } catch (err) {
    console.error(`[Recorder] Error stopping recording:`, err);

    // Force cleanup
    try {
      const session = activeRecordings.get(sessionKey);
      if (session?.browser) {
        await session.browser.close();
      }
    } catch (cleanupErr) {
      console.error(`[Recorder] Cleanup error:`, cleanupErr);
    }

    activeRecordings.delete(sessionKey);
    return { success: false, message: err.message };
  }
}

/**
 * Check if a call is being recorded
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {boolean}
 */
function isRecording(callId, callType) {
  const sessionKey = `${callType}-${callId}`;
  return activeRecordings.has(sessionKey);
}

/**
 * Get recording status
 *
 * @param {string} callId - Call ID
 * @param {string} callType - 'phone' or 'video'
 * @returns {Object|null}
 */
function getRecordingStatus(callId, callType) {
  const sessionKey = `${callType}-${callId}`;
  const session = activeRecordings.get(sessionKey);

  if (!session) {
    return null;
  }

  return {
    isRecording: true,
    startedAt: session.startedAt,
    duration: Math.floor((Date.now() - session.startedAt.getTime()) / 1000),
  };
}

/**
 * Stop all active recordings (for graceful shutdown)
 */
async function stopAllRecordings() {
  console.log(`[Recorder] Stopping all active recordings (${activeRecordings.size} sessions)`);

  const promises = [];
  for (const [sessionKey, session] of activeRecordings) {
    promises.push(
      stopRecording(session.callId, session.callType).catch(err => {
        console.error(`[Recorder] Failed to stop ${sessionKey}:`, err);
      })
    );
  }

  await Promise.all(promises);
  console.log(`[Recorder] All recordings stopped`);
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
  getRecordingStatus,
  stopAllRecordings,
};
