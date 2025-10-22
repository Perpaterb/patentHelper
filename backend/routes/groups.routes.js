/**
 * Groups Routes
 *
 * Routes for managing groups.
 */

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /groups
 * Get all groups where user is a member
 *
 * Requires authentication
 *
 * Response:
 * - 200: Groups list returned
 * - 401: Not authenticated
 * - 500: Server error
 */
router.get('/', requireAuth, groupsController.getGroups);

module.exports = router;
