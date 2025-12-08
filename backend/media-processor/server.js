/**
 * Media Processor HTTP Server
 *
 * Local development server that mirrors the Lambda ECR container functionality.
 * Handles video/audio conversion, image conversion, and PDF generation.
 *
 * In production, the main API Lambda invokes the Media Processor Lambda directly.
 * Locally, the backend calls this HTTP server instead.
 *
 * Endpoints:
 * - POST /convert/video - Convert video to MP4
 * - POST /convert/audio - Convert audio to MP3
 * - POST /convert/image - Convert image to PNG/JPEG
 * - POST /generate/pdf  - Generate PDF from data
 * - GET  /health        - Health check
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Import processing services
const videoService = require('./services/video.service');
const audioService = require('./services/audio.service');
const imageService = require('./services/image.service');
const pdfService = require('./services/pdf.service');

const app = express();
const PORT = process.env.PORT || 3001;
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

// Ensure uploads directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));

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
// Health Check
// ============================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'media-processor',
    version: '1.0.0',
    capabilities: ['video', 'audio', 'image', 'pdf'],
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Video Conversion: POST /convert/video
// ============================================
app.post('/convert/video', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessor] Video conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const result = await videoService.convertToMp4(req.file.path, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessor] Video conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessor] Video conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// Audio Conversion: POST /convert/audio
// ============================================
app.post('/convert/audio', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessor] Audio conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const result = await audioService.convertToMp3(req.file.path, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessor] Audio conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      durationMs: result.durationMs,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessor] Audio conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// Image Conversion: POST /convert/image
// ============================================
app.post('/convert/image', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessor] Image conversion request received');

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  try {
    const inputBuffer = await fs.readFile(req.file.path);
    const originalMimeType = req.file.mimetype || req.body.mimeType || 'image/unknown';

    const result = await imageService.convertImage(inputBuffer, originalMimeType, UPLOADS_DIR);

    // Clean up input file
    await fs.unlink(req.file.path).catch(() => {});

    console.log(`[MediaProcessor] Image conversion complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath: result.path,
      outputFileName: result.fileName,
      mimeType: result.mimeType,
      converted: result.converted,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessor] Image conversion error:', error);

    // Clean up input file on error
    await fs.unlink(req.file.path).catch(() => {});

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// PDF Generation: POST /generate/pdf
// ============================================
app.post('/generate/pdf', async (req, res) => {
  const startTime = Date.now();
  console.log('[MediaProcessor] PDF generation request received');

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

    console.log(`[MediaProcessor] PDF generation complete in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      outputPath,
      outputFileName: fileName,
      mimeType: 'application/pdf',
      size: pdfBuffer.length,
      processingTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('[MediaProcessor] PDF generation error:', error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================
// File Retrieval: GET /files/:filename
// ============================================
app.get('/files/:filename', async (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  try {
    await fs.access(filePath);
    res.sendFile(filePath);
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// ============================================
// File Deletion: DELETE /files/:filename
// ============================================
app.delete('/files/:filename', async (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);

  try {
    await fs.unlink(filePath);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(404).json({ success: false, error: 'File not found' });
  }
});

// ============================================
// Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('[MediaProcessor] Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('  Media Processor Service');
  console.log('============================================');
  console.log(`  Status:  Running`);
  console.log(`  Port:    ${PORT}`);
  console.log(`  Uploads: ${UPLOADS_DIR}`);
  console.log('');
  console.log('  Endpoints:');
  console.log('    POST /convert/video  - Convert video to MP4');
  console.log('    POST /convert/audio  - Convert audio to MP3');
  console.log('    POST /convert/image  - Convert image to PNG/JPEG');
  console.log('    POST /generate/pdf   - Generate PDF');
  console.log('    GET  /health         - Health check');
  console.log('============================================');
  console.log('');
});

module.exports = app;
