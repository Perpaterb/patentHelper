/**
 * Storage Routes
 *
 * Routes for storage management endpoints.
 *
 * @module routes/storage
 */

const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storage.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// All storage routes require authentication
router.use(requireAuth);

/**
 * GET /storage/usage
 * Get storage usage overview with breakdown by type and group
 */
router.get('/usage', storageController.getStorageUsage);

/**
 * GET /storage/groups/:groupId/files
 * Get all files in a specific group
 * Query params: sortBy (size|name|date), sortOrder (asc|desc)
 */
router.get('/groups/:groupId/files', storageController.getGroupFiles);

/**
 * POST /storage/files/:mediaId/delete-request
 * Request deletion of a file (requires admin approval)
 */
router.post('/files/:mediaId/delete-request', storageController.requestFileDeletion);

/**
 * POST /storage/recalculate
 * Recalculate storage usage based on actual non-deleted files
 * Use this to fix any discrepancies from files deleted before storage tracking was added
 */
router.post('/recalculate', storageController.recalculateStorage);

module.exports = router;
