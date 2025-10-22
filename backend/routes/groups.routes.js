/**
 * Groups Routes
 *
 * Routes for managing groups and messages.
 */

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const messagesController = require('../controllers/messages.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /groups
 * Get all groups where user is a member
 */
router.get('/', requireAuth, groupsController.getGroups);

/**
 * POST /groups
 * Create a new group
 */
router.post('/', requireAuth, groupsController.createGroup);

/**
 * GET /groups/:groupId
 * Get group details with members
 */
router.get('/:groupId', requireAuth, groupsController.getGroupById);

/**
 * GET /groups/:groupId/messages
 * Get messages for a group
 */
router.get('/:groupId/messages', requireAuth, messagesController.getMessages);

/**
 * POST /groups/:groupId/messages
 * Send a message to a group
 */
router.post('/:groupId/messages', requireAuth, messagesController.sendMessage);

module.exports = router;
