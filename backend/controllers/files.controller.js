/**
 * Files Controller
 *
 * Handles file upload, retrieval, and deletion operations.
 * Uses storage service abstraction to work with local filesystem or S3.
 *
 * @module controllers/files
 */

const { storageService } = require('../services/storage');
const { prisma } = require('../config/database');

/**
 * Upload a single file
 * POST /files/upload
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function uploadFile(req, res) {
  try {
    // Validate file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    // Extract metadata from request
    const { category = 'messages', groupId } = req.body;

    // TODO: Get userId from authenticated session (Phase 1, Week 2)
    // For now, use a placeholder
    const userId = req.body.userId || 'test-user-id';

    // Validate category
    const validCategories = ['messages', 'calendar', 'finance', 'profiles'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Prepare upload options
    const uploadOptions = {
      category: category,
      userId: userId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      groupId: groupId || null
    };

    // Upload file using storage service
    const fileMetadata = await storageService.uploadFile(req.file.buffer, uploadOptions);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: fileMetadata
    });

  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

/**
 * Upload multiple files
 * POST /files/upload-multiple
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function uploadMultipleFiles(req, res) {
  try {
    // Validate files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please provide at least one file to upload'
      });
    }

    // Extract metadata from request
    const { category = 'messages', groupId } = req.body;
    const userId = req.body.userId || 'test-user-id';

    // Validate category
    const validCategories = ['messages', 'calendar', 'finance', 'profiles'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Upload all files
    const uploadPromises = req.files.map(file => {
      const uploadOptions = {
        category: category,
        userId: userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        groupId: groupId || null
      };
      return storageService.uploadFile(file.buffer, uploadOptions);
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    // Return success response
    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload multiple files error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}

/**
 * Get file by ID
 * GET /files/:fileId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getFile(req, res) {
  try {
    const { fileId } = req.params;

    // Get file metadata
    const metadata = await storageService.getFileMetadata(fileId);

    // Get file data
    const fileBuffer = await storageService.getFile(fileId);

    // Set response headers
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Length', metadata.size);
    res.setHeader('Content-Disposition', `inline; filename="${metadata.fileName}"`);

    // Send file
    res.send(fileBuffer);

  } catch (error) {
    console.error('Get file error:', error);

    if (error.message === 'File not found' || error.message === 'File has been deleted') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve file',
      message: error.message
    });
  }
}

/**
 * Get file metadata
 * GET /files/:fileId/metadata
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getFileMetadata(req, res) {
  try {
    const { fileId } = req.params;
    const metadata = await storageService.getFileMetadata(fileId);

    res.status(200).json({
      success: true,
      metadata: metadata
    });

  } catch (error) {
    console.error('Get file metadata error:', error);

    if (error.message === 'File not found' || error.message === 'File has been deleted') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve file metadata',
      message: error.message
    });
  }
}

/**
 * Delete file (soft delete)
 * DELETE /files/:fileId
 *
 * Note: Per requirements (appplan.md line 17), files are never hard deleted.
 * They are soft deleted with is_hidden flag.
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function deleteFile(req, res) {
  try {
    const { fileId } = req.params;

    // TODO: Verify user has permission to delete this file (Phase 1, Week 2)
    // Only admins or file owner should be able to delete

    await storageService.deleteFile(fileId);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully (soft delete)'
    });

  } catch (error) {
    console.error('Delete file error:', error);

    if (error.message === 'File not found') {
      return res.status(404).json({
        error: 'File not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
}

/**
 * Get storage usage for a user
 * GET /files/storage-usage/:userId
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function getStorageUsage(req, res) {
  try {
    const { userId } = req.params;

    // TODO: Verify user has permission to view this usage (Phase 1, Week 2)
    // Users should only see their own usage, admins can see all

    const usageBytes = await storageService.getStorageUsage(userId);
    const usageMB = (usageBytes / (1024 * 1024)).toFixed(2);

    res.status(200).json({
      success: true,
      userId: userId,
      usage: {
        bytes: usageBytes,
        megabytes: parseFloat(usageMB)
      }
    });

  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({
      error: 'Failed to retrieve storage usage',
      message: error.message
    });
  }
}

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  getFile,
  getFileMetadata,
  deleteFile,
  getStorageUsage
};
