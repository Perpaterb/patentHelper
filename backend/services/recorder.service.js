/**
 * Puppeteer Recording Service
 *
 * Uses a headless browser to join calls as a "ghost" participant
 * and record all audio/video streams server-side.
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Track active recording sessions
const activeRecordings = new Map();

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
  const sessionKey = `${callType}-${callId}`;

  // Check if already recording
  if (activeRecordings.has(sessionKey)) {
    console.log(`[Recorder] Already recording ${sessionKey}`);
    return { success: true, message: 'Recording already in progress' };
  }

  console.log(`[Recorder] Starting recording for ${sessionKey}`);

  try {
    // Launch headless browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--use-fake-ui-for-media-stream', // Auto-allow media permissions
        '--use-fake-device-for-media-stream', // Use fake audio device
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    });

    const page = await browser.newPage();

    // Set up console logging from the page
    page.on('console', msg => {
      console.log(`[Recorder Page] ${msg.text()}`);
    });

    page.on('pageerror', err => {
      console.error(`[Recorder Page Error] ${err.message}`);
    });

    // Navigate to the recorder page
    const recorderUrl = new URL('/recorder.html', apiUrl);
    recorderUrl.searchParams.set('apiUrl', apiUrl);
    recorderUrl.searchParams.set('groupId', groupId);
    recorderUrl.searchParams.set('callId', callId);
    recorderUrl.searchParams.set('callType', callType);
    recorderUrl.searchParams.set('token', authToken);

    console.log(`[Recorder] Loading recorder page...`);
    await page.goto(recorderUrl.toString(), { waitUntil: 'networkidle0' });

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

    // Tell the page to stop recording and wait for upload
    const hasRecording = await page.evaluate(() => window.isRecording);

    if (hasRecording) {
      await page.evaluate(() => window.stopRecording());
      // Wait a bit for upload to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Cleanup
    await page.evaluate(() => window.cleanup());
    await browser.close();

    activeRecordings.delete(sessionKey);

    const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
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
