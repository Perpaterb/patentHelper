/**
 * Message Groups Routes
 *
 * Routes for managing message groups within groups.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to access groupId from parent router
const messageGroupsController = require('../controllers/messageGroups.controller');
const messagesController = require('../controllers/messages.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /groups/:groupId/message-groups
 * Get all message groups for a group
 */
router.get('/', requireAuth, messageGroupsController.getMessageGroups);

/**
 * POST /groups/:groupId/message-groups
 * Create a new message group
 */
router.post('/', requireAuth, messageGroupsController.createMessageGroup);

/**
 * GET /groups/:groupId/message-groups/:messageGroupId
 * Get a specific message group
 */
router.get('/:messageGroupId', requireAuth, messageGroupsController.getMessageGroupById);

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId
 * Update message group name
 */
router.put('/:messageGroupId', requireAuth, messageGroupsController.updateMessageGroup);

/**
 * DELETE /groups/:groupId/message-groups/:messageGroupId
 * Delete a message group
 */
router.delete('/:messageGroupId', requireAuth, messageGroupsController.deleteMessageGroup);

/**
 * GET /groups/:groupId/message-groups/:messageGroupId/messages
 * Get all messages for a message group
 */
router.get('/:messageGroupId/messages', requireAuth, messagesController.getMessageGroupMessages);

/**
 * POST /groups/:groupId/message-groups/:messageGroupId/messages
 * Send a message to a message group
 */
router.post('/:messageGroupId/messages', requireAuth, messagesController.sendMessageGroupMessage);

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId/mark-read
 * Mark message group as read
 */
router.put('/:messageGroupId/mark-read', requireAuth, messagesController.markMessageGroupAsRead);

module.exports = router;
