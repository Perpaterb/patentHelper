/**
 * Media Processing Routes - Unified Server
 *
 * These routes provide direct access to heavy processing functions:
 * - Video conversion (ffmpeg)
 * - Audio conversion (ffmpeg)
 * - Image conversion (sharp)
 * - PDF generation (jsPDF)
 * - Call recording (puppeteer)
 *
 * In the unified Lightsail architecture, these run directly in the server process.
 * Previously these were split into a separate worker-service container.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import processing services
const videoService = require('../services/media/video.service');
const audioService = require('../services/media/audio.service');
const imageService = require('../services/media/image.service');
const pdfService = require('../services/media/pdf.service');
const recorderService = require('../services/media/puppeteer.recorder.service');

// Configuration
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `input-${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max
  },
});

// ============================================
// Health Check (for backward compatibility)
// ============================================
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'media-processing',
    mode: 'unified',
    version: '1.0.0',
    capabilities: ['video', 'audio', 'image', 'pdf', 'recording'],
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Video Conversion: POST /media/convert/video
// ============================================
router.post('/convert/video', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] Video conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const result = await videoService.convertToMp4(req.file.path, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessing] Video conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] Video conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// Audio Conversion: POST /media/convert/audio
// ============================================
router.post('/convert/audio', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] Audio conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const result = await audioService.convertToMp3(req.file.path, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessing] Audio conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] Audio conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// Image Conversion: POST /media/convert/image
// ============================================
router.post('/convert/image', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] Image conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const inputBuffer = await fs.readFile(req.file.path);
    const originalMimeType = req.file.mimetype || req.body.mimeType || 'image/unknown';

    const result = await imageService.convertImage(inputBuffer, originalMimeType, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessing] Image conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      converted: result.converted,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] Image conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// PDF Generation: POST /media/generate/pdf
// ============================================
router.post('/generate/pdf', async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] PDF generation request received');

  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, data',
      });
    }

    let pdfBuffer;
    let fileName;

    switch (type) {
      case 'audit-log':
        pdfBuffer = pdfService.generateAuditLogPDF(data);
        fileName = `audit-log-${uuidv4()}.pdf`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown PDF type: ${type}`,
        });
    }

    // Save PDF to file
    const outputPath = path.join(UPLOADS_DIR, fileName);
    await fs.writeFile(outputPath, pdfBuffer);

    console.log(`[MediaProcessing] PDF generation complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath,
      outputFileName: fileName,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] PDF generation error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// File Retrieval: GET /media/files/:filename
// ============================================
router.get('/files/:filename', async (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// ============================================
// File Deletion: DELETE /media/files/:filename
// ============================================
router.delete('/files/:filename', async (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  try {
    await fs.unlink(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// ============================================
// Recording Service (Puppeteer)
// ============================================

// Start recording: POST /media/recording/start
router.post('/recording/start', async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] Start recording request received');

  try {
    const { groupId, callId, callType, authToken, apiUrl } = req.body;

    if (!groupId || !callId || !callType || !authToken || !apiUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: groupId, callId, callType, authToken, apiUrl',
      });
    }

    const result = await recorderService.startRecording({
      groupId,
      callId,
      callType,
      authToken,
      apiUrl,
      uploadsDir: UPLOADS_DIR,
    });

    console.log(`[MediaProcessing] Recording start complete in ${Date.now() - startTime}ms`);

    res.json({
      ...result,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] Recording start error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Stop recording: POST /media/recording/stop
router.post('/recording/stop', async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessing] Stop recording request received');

  try {
    const { callId, callType } = req.body;

    if (!callId || !callType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: callId, callType',
      });
    }

    const result = await recorderService.stopRecording(callId, callType);

    console.log(`[MediaProcessing] Recording stop complete in ${Date.now() - startTime}ms`);

    res.json({
      ...result,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessing] Recording stop error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get recording status: GET /media/recording/status/:callType/:callId
router.get('/recording/status/:callType/:callId', (req, res) => {
  const { callType, callId } = req.params;

  const status = recorderService.getRecordingStatus(callId, callType);

  res.json({
    success: true,
    isRecording: !!status,
    ...status,
  });
});

module.exports = router;
