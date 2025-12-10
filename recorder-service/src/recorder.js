/**
 * Recorder Module
 *
 * Manages Puppeteer browser instances for WebRTC call recording.
 * Each recording session launches headless Chrome, navigates to recorder.html,
 * which joins the call as a ghost peer and records all audio streams.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// S3 client for uploading recordings
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

const S3_BUCKET = process.env.S3_BUCKET;

// Active recording sessions: Map<callId, RecordingSession>
const activeSessions = new Map();

/**
 * Recording session state
 * @typedef {Object} RecordingSession
 * @property {string} sessionId
 * @property {string} callId
 * @property {string} callType
 * @property {string} groupId
 * @property {Browser} browser
 * @property {Page} page
 * @property {Date} startedAt
 * @property {string} status - 'starting' | 'recording' | 'stopping' | 'stopped'
 */

/**
 * Start recording a call
 *
 * @param {Object} options
 * @param {string} options.groupId
 * @param {string} options.callId
 * @param {string} options.callType
 * @param {string} options.authToken
 * @param {string} options.apiUrl
 * @param {PrismaClient} options.prisma
 * @returns {Promise<{sessionId: string}>}
 */
async function startRecording({ groupId, callId, callType, authToken, apiUrl, prisma }) {
  const sessionId = uuidv4();

  console.log(`[Recorder] Starting session ${sessionId} for ${callType}-${callId}`);

  // Create session entry
  const session = {
    sessionId,
    callId,
    callType,
    groupId,
    authToken,
    apiUrl,
    prisma,
    browser: null,
    page: null,
    startedAt: new Date(),
    status: 'starting',
  };

  activeSessions.set(callId, session);

  try {
    // Launch headless Chrome with audio support
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    });

    session.browser = browser;

    // Create a new page
    const page = await browser.newPage();
    session.page = page;

    // Enable console logging from the page
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Recorder]')) {
        console.log(`[Browser ${callId}]`, text);
      }
    });

    page.on('pageerror', (error) => {
      console.error(`[Browser ${callId}] Page error:`, error.message);
    });

    // Navigate to recorder.html with parameters
    const recorderUrl = buildRecorderUrl({
      apiUrl,
      groupId,
      callId,
      callType,
      authToken,
    });

    console.log(`[Recorder] Navigating to recorder URL for ${callId}`);
    await page.goto(recorderUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for recorder to initialize
    await page.waitForFunction('window.recorderReady === true', {
      timeout: 60000,
    });

    session.status = 'recording';
    console.log(`[Recorder] Session ${sessionId} is now recording`);

    return { sessionId };
  } catch (error) {
    console.error(`[Recorder] Failed to start session ${sessionId}:`, error);
    await cleanupSession(callId);
    throw error;
  }
}

/**
 * Build the recorder URL with parameters
 * Uses recorder.html for phone calls, videoRecorder.html for video calls
 */
function buildRecorderUrl({ apiUrl, groupId, callId, callType, authToken }) {
  // Use correct HTML based on call type
  const htmlFile = callType === 'video' ? 'videoRecorder.html' : 'recorder.html';
  const htmlPath = path.join(__dirname, '../public', htmlFile);
  const params = new URLSearchParams({
    apiUrl,
    groupId,
    callId,
    callType,
    token: authToken,
  });

  return `file://${htmlPath}?${params.toString()}`;
}

/**
 * Stop recording a call
 *
 * @param {string} callId
 * @returns {Promise<{recordingId: string, fileUrl: string, duration: number}>}
 */
async function stopRecording(callId) {
  const session = activeSessions.get(callId);

  if (!session) {
    throw new Error(`No active recording found for call ${callId}`);
  }

  console.log(`[Recorder] Stopping session ${session.sessionId}`);
  session.status = 'stopping';

  try {
    // Tell the page to stop recording
    if (session.page && !session.page.isClosed()) {
      // Call stopRecording in the browser context and wait for upload
      await session.page.evaluate(async () => {
        if (window.stopRecording) {
          await window.stopRecording();
        }
      });

      // Wait a bit for upload to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

    // Create recording record in database
    let recordingId = null;
    let fileUrl = null;

    try {
      // The recording was uploaded via the recorder.html to the backend API
      // We just need to record the session metadata
      console.log(`[Recorder] Recording completed, duration: ${duration}s`);
    } catch (dbError) {
      console.error('[Recorder] Database error:', dbError);
    }

    // Cleanup
    await cleanupSession(callId);

    session.status = 'stopped';

    return {
      recordingId,
      fileUrl,
      duration,
    };
  } catch (error) {
    console.error(`[Recorder] Error stopping session:`, error);
    await cleanupSession(callId);
    throw error;
  }
}

/**
 * Cleanup a recording session
 */
async function cleanupSession(callId) {
  const session = activeSessions.get(callId);

  if (!session) return;

  try {
    if (session.page && !session.page.isClosed()) {
      // Call cleanup in browser
      await session.page.evaluate(() => {
        if (window.cleanup) {
          window.cleanup();
        }
      }).catch(() => {});

      await session.page.close().catch(() => {});
    }

    if (session.browser) {
      await session.browser.close().catch(() => {});
    }
  } catch (error) {
    console.error(`[Recorder] Cleanup error for ${callId}:`, error);
  }

  activeSessions.delete(callId);
  console.log(`[Recorder] Session cleaned up for ${callId}`);
}

/**
 * Check if a call is being recorded
 */
function isRecording(callId) {
  return activeSessions.has(callId);
}

/**
 * Get recording status for a call
 */
function getRecordingStatus(callId) {
  const session = activeSessions.get(callId);

  if (!session) return null;

  const now = Date.now();
  const duration = Math.floor((now - session.startedAt.getTime()) / 1000);

  return {
    sessionId: session.sessionId,
    startedAt: session.startedAt,
    duration,
    status: session.status,
  };
}

/**
 * Get count of active recordings
 */
function getActiveRecordingCount() {
  return activeSessions.size;
}

/**
 * List all active recordings
 */
function listActiveRecordings() {
  const recordings = [];

  for (const [callId, session] of activeSessions) {
    const now = Date.now();
    const duration = Math.floor((now - session.startedAt.getTime()) / 1000);

    recordings.push({
      callId,
      callType: session.callType,
      groupId: session.groupId,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      duration,
      status: session.status,
    });
  }

  return recordings;
}

/**
 * Stop all active recordings (for graceful shutdown)
 */
async function stopAllRecordings() {
  console.log(`[Recorder] Stopping all ${activeSessions.size} active recordings...`);

  const promises = [];
  for (const callId of activeSessions.keys()) {
    promises.push(stopRecording(callId).catch((err) => {
      console.error(`[Recorder] Error stopping ${callId}:`, err);
    }));
  }

  await Promise.all(promises);
  console.log('[Recorder] All recordings stopped');
}

module.exports = {
  startRecording,
  stopRecording,
  isRecording,
  getRecordingStatus,
  getActiveRecordingCount,
  listActiveRecordings,
  stopAllRecordings,
};
