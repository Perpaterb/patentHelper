/**
 * Recorder Service - Express Server
 *
 * Manages multiple Puppeteer instances to record WebRTC calls.
 * Exposes API for starting/stopping recordings via Lambda API.
 */

const express = require('express');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const recorder = require('./recorder');

// Initialize Prisma client
const prisma = new PrismaClient();

// Create Express app
const app = express();
app.use(express.json());

// Serve static files (recorder.html)
app.use('/public', express.static(path.join(__dirname, '../public')));

// Configuration
const PORT = process.env.PORT || 3001;

/**
 * Health check endpoint
 * Returns capabilities for the main API to check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'recorder',
    capabilities: ['recording'],
    activeRecordings: recorder.getActiveRecordingCount(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Start recording a call
 * POST /recording/start
 *
 * Body:
 * - groupId: string
 * - callId: string
 * - callType: 'phone' | 'video'
 * - authToken: string (JWT for API access)
 * - apiUrl: string (Backend API URL)
 */
app.post('/recording/start', async (req, res) => {
  try {
    const { groupId, callId, callType, authToken, apiUrl } = req.body;

    if (!groupId || !callId || !callType || !authToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: groupId, callId, callType, authToken, apiUrl',
      });
    }

    console.log(`[Recorder] Starting recording for ${callType}-${callId}`);

    // Check if already recording this call
    if (recorder.isRecording(callId)) {
      return res.status(409).json({
        success: false,
        error: 'Recording already in progress for this call',
        isRecording: true,
      });
    }

    // Start recording asynchronously
    const result = await recorder.startRecording({
      groupId,
      callId,
      callType,
      authToken,
      apiUrl,
      prisma,
    });

    res.json({
      success: true,
      message: 'Recording started',
      sessionId: result.sessionId,
      isRecording: true,
    });
  } catch (error) {
    console.error('[Recorder] Start error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Stop recording a call
 * POST /recording/stop
 *
 * Body:
 * - callId: string
 * - callType: 'phone' | 'video'
 */
app.post('/recording/stop', async (req, res) => {
  try {
    const { callId, callType } = req.body;

    if (!callId || !callType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: callId, callType',
      });
    }

    console.log(`[Recorder] Stopping recording for ${callType}-${callId}`);

    // Check if recording exists
    if (!recorder.isRecording(callId)) {
      return res.status(404).json({
        success: false,
        error: 'No active recording found for this call',
        isRecording: false,
      });
    }

    // Stop recording
    const result = await recorder.stopRecording(callId);

    res.json({
      success: true,
      message: 'Recording stopped',
      recordingId: result.recordingId,
      fileUrl: result.fileUrl,
      duration: result.duration,
    });
  } catch (error) {
    console.error('[Recorder] Stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get recording status
 * GET /recording/status/:callType/:callId
 */
app.get('/recording/status/:callType/:callId', (req, res) => {
  const { callId, callType } = req.params;

  const status = recorder.getRecordingStatus(callId);

  if (!status) {
    return res.json({
      isRecording: false,
      callId,
      callType,
    });
  }

  res.json({
    isRecording: true,
    callId,
    callType,
    startedAt: status.startedAt,
    duration: status.duration,
    status: status.status,
  });
});

/**
 * List all active recordings
 * GET /recording/list
 */
app.get('/recording/list', (req, res) => {
  const recordings = recorder.listActiveRecordings();

  res.json({
    success: true,
    count: recordings.length,
    recordings,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Recorder] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Recorder] SIGTERM received, shutting down gracefully...');
  await recorder.stopAllRecordings();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Recorder] SIGINT received, shutting down gracefully...');
  await recorder.stopAllRecordings();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`[Recorder] Server listening on port ${PORT}`);
  console.log(`[Recorder] Health check: http://localhost:${PORT}/health`);
  console.log(`[Recorder] Recorder HTML: http://localhost:${PORT}/public/recorder.html`);
});

module.exports = app;
