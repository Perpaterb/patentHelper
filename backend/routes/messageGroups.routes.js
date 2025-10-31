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
 * Delete a message group (soft delete)
 */
router.delete('/:messageGroupId', requireAuth, messageGroupsController.deleteMessageGroup);

/**
 * POST /groups/:groupId/message-groups/:messageGroupId/undelete
 * Undelete a message group (restore from soft delete)
 */
router.post('/:messageGroupId/undelete', requireAuth, messageGroupsController.undeleteMessageGroup);

/**
 * POST /groups/:groupId/message-groups/:messageGroupId/members
 * Add members to a message group
 */
router.post('/:messageGroupId/members', requireAuth, messageGroupsController.addMembersToMessageGroup);

/**
 * DELETE /groups/:groupId/message-groups/:messageGroupId/members/:memberId
 * Remove a member from a message group
 */
router.delete('/:messageGroupId/members/:memberId', requireAuth, messageGroupsController.removeMemberFromMessageGroup);

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId/mute
 * Mute a message group for the current user
 */
router.put('/:messageGroupId/mute', requireAuth, messageGroupsController.muteMessageGroup);

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId/unmute
 * Unmute a message group for the current user
 */
router.put('/:messageGroupId/unmute', requireAuth, messageGroupsController.unmuteMessageGroup);

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

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/hide
 * Hide a message
 */
router.put('/:messageGroupId/messages/:messageId/hide', requireAuth, messagesController.hideMessage);

/**
 * PUT /groups/:groupId/message-groups/:messageGroupId/messages/:messageId/unhide
 * Unhide a message (admin only)
 */
router.put('/:messageGroupId/messages/:messageId/unhide', requireAuth, messagesController.unhideMessage);

module.exports = router;
