/**
 * Logs Routes
 *
 * Routes for audit log exports.
 */

const express = require('express');
const router = express.Router();
const logsController = require('../controllers/logs.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * POST /logs/exports
 * Request a new log export
 *
 * Requires authentication
 *
 * Request body:
 * - groupId: Group ID to export logs for
 * - password: Password to protect the export file
 *
 * Response:
 * - 201: Export request created
 * - 400: Validation error
 * - 401: Not authenticated
 * - 403: Not authorized (not admin of group)
 * - 500: Server error
 */
router.post('/exports', requireAuth, logsController.requestExport);

/**
 * GET /logs/exports
 * Get all export requests for the user
 *
 * Requires authentication
 *
 * Response:
 * - 200: Exports list returned
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/exports', requireAuth, logsController.getExports);

/**
 * GET /logs/exports/:id/download
 * Download a completed export
 *
 * Requires authentication
 *
 * Response:
 * - 200: Export file download
 * - 401: Not authenticated
 * - 403: Not authorized
 * - 404: Export not found or not ready
 * - 500: Server error
 */
router.get('/exports/:id/download', requireAuth, logsController.downloadExport);

module.exports = router;
