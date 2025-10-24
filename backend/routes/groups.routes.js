/**
 * Groups Routes
 *
 * Routes for managing groups and messages.
 */

const express = require('express');
const router = express.Router();
const groupsController = require('../controllers/groups.controller');
const messagesController = require('../controllers/messages.controller');
const messageGroupsRouter = require('./messageGroups.routes');
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
 * PUT /groups/reorder-pins
 * Reorder pinned groups for the current user
 */
router.put('/reorder-pins', requireAuth, groupsController.reorderPinnedGroups);

/**
 * GET /groups/:groupId
 * Get group details with members
 */
router.get('/:groupId', requireAuth, groupsController.getGroupById);

/**
 * PUT /groups/:groupId
 * Update group details (admin only)
 */
router.put('/:groupId', requireAuth, groupsController.updateGroup);

/**
 * DELETE /groups/:groupId
 * Delete group (admin only, no approval if only admin)
 */
router.delete('/:groupId', requireAuth, groupsController.deleteGroup);

/**
 * POST /groups/:groupId/members/invite
 * Invite a member to a group (admin only)
 */
router.post('/:groupId/members/invite', requireAuth, groupsController.inviteMember);

/**
 * PUT /groups/:groupId/pin
 * Pin a group for the current user
 */
router.put('/:groupId/pin', requireAuth, groupsController.pinGroup);

/**
 * PUT /groups/:groupId/unpin
 * Unpin a group for the current user
 */
router.put('/:groupId/unpin', requireAuth, groupsController.unpinGroup);

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

/**
 * PUT /groups/:groupId/members/:userId/role
 * Change a member's role (admin only)
 */
router.put('/:groupId/members/:userId/role', requireAuth, groupsController.changeMemberRole);

/**
 * DELETE /groups/:groupId/members/:userId
 * Remove a member from the group (admin only)
 */
router.delete('/:groupId/members/:userId', requireAuth, groupsController.removeMember);

/**
 * POST /groups/:groupId/leave
 * Leave a group (non-admins only)
 */
router.post('/:groupId/leave', requireAuth, groupsController.leaveGroup);

/**
 * GET /groups/:groupId/settings
 * Get group settings (role permissions and preferences)
 */
router.get('/:groupId/settings', requireAuth, groupsController.getGroupSettings);

/**
 * PUT /groups/:groupId/settings
 * Update group settings (admin only)
 */
router.put('/:groupId/settings', requireAuth, groupsController.updateGroupSettings);

/**
 * GET /groups/:groupId/admin-permissions
 * Get admin permissions for a group (admin only)
 */
router.get('/:groupId/admin-permissions', requireAuth, groupsController.getAdminPermissions);

/**
 * PUT /groups/:groupId/admin-permissions/:targetAdminId
 * Update admin permissions for specific admin (admin only)
 */
router.put('/:groupId/admin-permissions/:targetAdminId', requireAuth, groupsController.updateAdminPermissions);

/**
 * Mount message groups router
 * All routes under /groups/:groupId/message-groups
 */
router.use('/:groupId/message-groups', messageGroupsRouter);

module.exports = router;
