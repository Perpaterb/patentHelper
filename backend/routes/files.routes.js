/**
 * Files Routes
 *
 * Routes for file upload, retrieval, and management operations.
 *
 * @module routes/files
 */

const express = require('express');
const router = express.Router();
const filesController = require('../controllers/files.controller');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * POST /files/upload
 * Upload a single file
 *
 * Requires authentication. File storage is charged to ALL admins of the group.
 *
 * Request body (multipart/form-data):
 * - file: The file to upload (required)
 * - category: File category - messages, calendar, finance, profiles, gift-registry, wiki, item-registry (default: messages)
 * - groupId: Group ID if file is associated with a group (required for group uploads)
 *
 * Response:
 * - 201: File uploaded successfully with metadata
 * - 400: Validation error (no file, invalid category, file too large, etc.)
 * - 401: Authentication required
 * - 403: Access denied (not a member of the group)
 * - 500: Server error
 */
router.post('/upload', requireAuth, uploadSingle, filesController.uploadFile);

/**
 * POST /files/upload-multiple
 * Upload multiple files (up to 10)
 *
 * Requires authentication. File storage is charged to ALL admins of the group.
 *
 * Request body (multipart/form-data):
 * - files: Array of files to upload (required, max 10)
 * - category: File category - messages, calendar, finance, profiles, gift-registry, wiki, item-registry (default: messages)
 * - groupId: Group ID if files are associated with a group (required for group uploads)
 *
 * Response:
 * - 201: Files uploaded successfully with metadata
 * - 400: Validation error (no files, invalid category, file too large, etc.)
 * - 401: Authentication required
 * - 403: Access denied (not a member of the group)
 * - 500: Server error
 */
router.post('/upload-multiple', requireAuth, uploadMultiple, filesController.uploadMultipleFiles);

/**
 * GET /files/:fileId
 * Retrieve a file by ID
 *
 * Response:
 * - 200: File content with appropriate Content-Type header
 * - 404: File not found or deleted
 * - 500: Server error
 */
router.get('/:fileId', filesController.getFile);

/**
 * GET /files/:fileId/metadata
 * Get file metadata without downloading the file
 *
 * Response:
 * - 200: File metadata (fileId, fileName, mimeType, size, uploadedAt, etc.)
 * - 404: File not found or deleted
 * - 500: Server error
 */
router.get('/:fileId/metadata', filesController.getFileMetadata);

/**
 * DELETE /files/:fileId
 * Delete a file (soft delete)
 *
 * Note: Files are never hard deleted per requirements (appplan.md line 17).
 * This sets the is_hidden flag to true.
 *
 * Response:
 * - 200: File deleted successfully
 * - 404: File not found
 * - 500: Server error
 */
router.delete('/:fileId', filesController.deleteFile);

/**
 * GET /files/storage-usage/:userId
 * Get storage usage for a user
 *
 * Response:
 * - 200: Storage usage in bytes and megabytes
 * - 500: Server error
 */
router.get('/storage-usage/:userId', filesController.getStorageUsage);

module.exports = router;
