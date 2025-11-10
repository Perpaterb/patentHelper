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
const wishListsRouter = require('./wishLists.routes');
const krisKringleRouter = require('./krisKringle.routes');
const giftRegistryRouter = require('./giftRegistry.routes');
const approvalsController = require('../controllers/approvals.controller');
const financeController = require('../controllers/finance.controller');
const calendarController = require('../controllers/calendar.controller');
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
 * PUT /groups/:groupId/mute
 * Mute a group for the current user
 */
router.put('/:groupId/mute', requireAuth, groupsController.muteGroup);

/**
 * PUT /groups/:groupId/unmute
 * Unmute a group for the current user
 */
router.put('/:groupId/unmute', requireAuth, groupsController.unmuteGroup);

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
 * GET /groups/:groupId/approvals
 * Get all approvals for a group
 */
router.get('/:groupId/approvals', requireAuth, approvalsController.getApprovals);

/**
 * POST /groups/:groupId/approvals/:approvalId/vote
 * Vote on an approval (approve or reject)
 */
router.post('/:groupId/approvals/:approvalId/vote', requireAuth, approvalsController.voteOnApproval);

/**
 * POST /groups/:groupId/approvals/:approvalId/cancel
 * Cancel an approval (only by the requester)
 */
router.post('/:groupId/approvals/:approvalId/cancel', requireAuth, approvalsController.cancelApproval);

/**
 * GET /groups/:groupId/finance-matters
 * Get all finance matters for a group (admins see all, non-admins see only their own)
 */
router.get('/:groupId/finance-matters', requireAuth, financeController.getFinanceMatters);

/**
 * POST /groups/:groupId/finance-matters
 * Create a new finance matter (permissions based on role and group settings)
 */
router.post('/:groupId/finance-matters', requireAuth, financeController.createFinanceMatter);

/**
 * GET /groups/:groupId/finance-matters/:financeMatterId
 * Get a single finance matter by ID
 */
router.get('/:groupId/finance-matters/:financeMatterId', requireAuth, financeController.getFinanceMatterById);

/**
 * PUT /groups/:groupId/finance-matters/:financeMatterId/settle
 * Mark a finance matter as settled (admin only)
 */
router.put('/:groupId/finance-matters/:financeMatterId/settle', requireAuth, financeController.settleFinanceMatter);

/**
 * PUT /groups/:groupId/finance-matters/:financeMatterId/cancel
 * Cancel a finance matter (admin or creator only)
 */
router.put('/:groupId/finance-matters/:financeMatterId/cancel', requireAuth, financeController.cancelFinanceMatter);

/**
 * GET /groups/:groupId/finance-matters/:financeMatterId/messages
 * Get messages for a finance matter
 */
router.get('/:groupId/finance-matters/:financeMatterId/messages', requireAuth, financeController.getFinanceMatterMessages);

/**
 * POST /groups/:groupId/finance-matters/:financeMatterId/messages
 * Send a message to a finance matter
 */
router.post('/:groupId/finance-matters/:financeMatterId/messages', requireAuth, financeController.sendFinanceMatterMessage);

/**
 * PUT /groups/:groupId/finance-matters/:financeMatterId/record-payment
 * Record a payment for a finance matter member (admin or self)
 */
router.put('/:groupId/finance-matters/:financeMatterId/record-payment', requireAuth, financeController.recordPayment);

/**
 * POST /groups/:groupId/finance-matters/:financeMatterId/payments/:paymentId/confirm
 * Confirm a payment (recipient only)
 */
router.post('/:groupId/finance-matters/:financeMatterId/payments/:paymentId/confirm', requireAuth, financeController.confirmPayment);

/**
 * POST /groups/:groupId/finance-matters/:financeMatterId/payments/:paymentId/reject
 * Reject a payment (recipient only)
 */
router.post('/:groupId/finance-matters/:financeMatterId/payments/:paymentId/reject', requireAuth, financeController.rejectPayment);

/**
 * GET /groups/:groupId/calendar/events
 * Get calendar events for a group (with date range filtering)
 */
router.get('/:groupId/calendar/events', requireAuth, calendarController.getCalendarEvents);

/**
 * POST /groups/:groupId/calendar/events
 * Create a calendar event (regular or responsibility event)
 */
router.post('/:groupId/calendar/events', requireAuth, calendarController.createCalendarEvent);

/**
 * GET /groups/:groupId/calendar/events/:eventId
 * Get a single calendar event by ID
 */
router.get('/:groupId/calendar/events/:eventId', requireAuth, calendarController.getCalendarEventById);

/**
 * PUT /groups/:groupId/calendar/events/:eventId
 * Update a calendar event (updates createdAt timestamp)
 */
router.put('/:groupId/calendar/events/:eventId', requireAuth, calendarController.updateCalendarEvent);

/**
 * DELETE /groups/:groupId/calendar/events/:eventId
 * Delete a calendar event (soft delete)
 */
router.delete('/:groupId/calendar/events/:eventId', requireAuth, calendarController.deleteCalendarEvent);

/**
 * POST /groups/:groupId/calendar/responsibility-events
 * Create a child responsibility event with overlap detection
 */
router.post('/:groupId/calendar/responsibility-events', requireAuth, calendarController.createResponsibilityEvent);

/**
 * Mount message groups router
 * All routes under /groups/:groupId/message-groups
 */
router.use('/:groupId/message-groups', messageGroupsRouter);

/**
 * Mount wish lists router
 * All routes under /groups/:groupId/wish-lists
 */
router.use('/:groupId/wish-lists', wishListsRouter);

/**
 * Mount Kris Kringle router
 * All routes under /groups/:groupId/kris-kringle
 */
router.use('/:groupId/kris-kringle', krisKringleRouter);

/**
 * Mount Gift Registry router
 * All routes under /groups/:groupId/gift-registries
 */
router.use('/:groupId/gift-registries', giftRegistryRouter);

module.exports = router;
