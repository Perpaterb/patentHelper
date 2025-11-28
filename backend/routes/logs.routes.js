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
 * GET /logs/groups/:groupId
 * Get audit logs for a group
 *
 * Requires authentication
 *
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (default 20)
 *
 * Response:
 * - 200: Audit logs returned
 * - 401: Not authenticated
 * - 403: Not admin of group
 * - 500: Server error
 */
router.get('/groups/:groupId', requireAuth, logsController.getAuditLogs);

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

/**
 * POST /logs/:groupId/export
 * Export audit logs as PDF with filters
 *
 * Requires authentication (admin only)
 *
 * Request body:
 * - filters: Object containing filter parameters
 *   - dateFrom: Start date (ISO string)
 *   - dateTo: End date (ISO string)
 *   - actionTypes: Array of action types to filter
 *   - userIds: Array of group member IDs to filter
 *
 * Response:
 * - 200: PDF file download
 * - 401: Not authenticated
 * - 403: Not admin of group
 * - 500: Server error
 */
router.post('/:groupId/export', requireAuth, logsController.exportLogsAsPDF);

/**
 * GET /logs/:groupId/exports
 * Get all previous exports for a group
 *
 * Requires authentication (admin only)
 *
 * Response:
 * - 200: List of previous exports
 * - 401: Not authenticated
 * - 403: Not admin of group
 * - 500: Server error
 */
router.get('/:groupId/exports', requireAuth, logsController.getPreviousExports);

/**
 * GET /logs/:groupId/exports/:exportId/download
 * Download a previous export
 *
 * Requires authentication (admin only)
 *
 * Response:
 * - 200: PDF file download
 * - 401: Not authenticated
 * - 403: Not admin of group
 * - 404: Export not found
 * - 500: Server error
 */
router.get('/:groupId/exports/:exportId/download', requireAuth, logsController.downloadPreviousExport);

/**
 * DELETE /logs/:groupId/exports/:exportId
 * Request deletion of a log export (requires >50% admin approval)
 *
 * Requires authentication (admin only)
 *
 * Response:
 * - 200: Delete request created or export deleted (if threshold met)
 * - 400: Approval already pending
 * - 401: Not authenticated
 * - 403: Not admin of group
 * - 404: Export not found
 * - 500: Server error
 */
router.delete('/:groupId/exports/:exportId', requireAuth, logsController.requestDeleteExport);

module.exports = router;
