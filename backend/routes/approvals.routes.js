/**
 * Approvals Routes
 *
 * Routes for managing approval workflows within groups.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access groupId from parent router
const approvalsController = require('../controllers/approvals.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /groups/:groupId/approvals
 * Get all approvals for a group
 */
router.get('/', requireAuth, approvalsController.getApprovals);

/**
 * POST /groups/:groupId/approvals/:approvalId/vote
 * Vote on an approval (approve or reject)
 */
router.post('/:approvalId/vote', requireAuth, approvalsController.voteOnApproval);

/**
 * POST /groups/:groupId/approvals/:approvalId/cancel
 * Cancel an approval (only by requester)
 */
router.post('/:approvalId/cancel', requireAuth, approvalsController.cancelApproval);

module.exports = router;
