/**
 * Groups Routes
 *
 * Routes for managing groups and messages.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const groupsController = require('../controllers/groups.controller');
const messagesController = require('../controllers/messages.controller');
const messageGroupsRouter = require('./messageGroups.routes');
const wishListsRouter = require('./wishLists.routes');
const krisKringleRouter = require('./krisKringle.routes');
const approvalsController = require('../controllers/approvals.controller');
const financeController = require('../controllers/finance.controller');
const calendarController = require('../controllers/calendar.controller');
const giftRegistryController = require('../controllers/giftRegistry.controller');
const itemRegistryController = require('../controllers/itemRegistry.controller');
const itemRegistryRouter = require('./itemRegistry.routes');
const wikiRouter = require('./wiki.routes');
const groupDocumentsRouter = require('./groupDocuments.routes');
const phoneCallsController = require('../controllers/phoneCalls.controller');
const videoCallsController = require('../controllers/videoCalls.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// Configure multer for call recording uploads
const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max for video recordings
  },
});

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
 * PUT /groups/:groupId/members/:memberId/role
 * Change a member's role (admin only)
 * memberId is the groupMemberId
 */
router.put('/:groupId/members/:memberId/role', requireAuth, groupsController.changeMemberRole);

/**
 * DELETE /groups/:groupId/members/:memberId
 * Remove a member from the group (admin only)
 * memberId is the groupMemberId
 */
router.delete('/:groupId/members/:memberId', requireAuth, groupsController.removeMember);

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
 * GET /groups/:groupId/gift-registries
 * Get all gift registries for a group
 */
router.get('/:groupId/gift-registries', requireAuth, giftRegistryController.getGiftRegistries);

/**
 * GET /groups/:groupId/gift-registries/:registryId
 * Get a single gift registry with items
 */
router.get('/:groupId/gift-registries/:registryId', requireAuth, giftRegistryController.getGiftRegistry);

/**
 * POST /groups/:groupId/gift-registries
 * Create a new gift registry
 */
router.post('/:groupId/gift-registries', requireAuth, giftRegistryController.createGiftRegistry);

/**
 * PUT /groups/:groupId/gift-registries/:registryId
 * Update a gift registry name
 */
router.put('/:groupId/gift-registries/:registryId', requireAuth, giftRegistryController.updateGiftRegistry);

/**
 * DELETE /groups/:groupId/gift-registries/:registryId
 * Delete a gift registry and all its items
 */
router.delete('/:groupId/gift-registries/:registryId', requireAuth, giftRegistryController.deleteGiftRegistry);

/**
 * POST /groups/:groupId/gift-registries/:registryId/reset-passcode
 * Reset the passcode for a gift registry
 */
router.post('/:groupId/gift-registries/:registryId/reset-passcode', requireAuth, giftRegistryController.resetPasscode);

/**
 * POST /groups/:groupId/gift-registries/:registryId/items
 * Add an item to a gift registry
 */
router.post('/:groupId/gift-registries/:registryId/items', requireAuth, giftRegistryController.addGiftItem);

/**
 * PUT /groups/:groupId/gift-registries/:registryId/items/:itemId
 * Update a gift item
 */
router.put('/:groupId/gift-registries/:registryId/items/:itemId', requireAuth, giftRegistryController.updateGiftItem);

/**
 * DELETE /groups/:groupId/gift-registries/:registryId/items/:itemId
 * Delete a gift item
 */
router.delete('/:groupId/gift-registries/:registryId/items/:itemId', requireAuth, giftRegistryController.deleteGiftItem);

/**
 * POST /groups/:groupId/gift-registries/:registryId/items/:itemId/mark-purchased
 * Mark a gift item as purchased
 */
router.post('/:groupId/gift-registries/:registryId/items/:itemId/mark-purchased', requireAuth, giftRegistryController.markItemAsPurchased);

/**
 * POST /groups/:groupId/gift-registries/:registryId/link
 * Link a personal gift registry to this group
 */
router.post('/:groupId/gift-registries/:registryId/link', requireAuth, giftRegistryController.linkPersonalRegistry);

/**
 * DELETE /groups/:groupId/gift-registries/:registryId/unlink
 * Unlink a personal gift registry from this group
 */
router.delete('/:groupId/gift-registries/:registryId/unlink', requireAuth, giftRegistryController.unlinkPersonalRegistry);

/**
 * POST /groups/:groupId/personal-gift-registries/:registryId/items/:itemId/mark-purchased
 * Mark a personal gift item as purchased (when viewing linked registry from group)
 */
const personalGiftRegistryController = require('../controllers/personalGiftRegistry.controller');
router.post('/:groupId/personal-gift-registries/:registryId/items/:itemId/mark-purchased', requireAuth, personalGiftRegistryController.markItemAsPurchased);

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
 * POST /groups/:groupId/item-registries/:registryId/link
 * Link a personal item registry to this group
 */
router.post('/:groupId/item-registries/:registryId/link', requireAuth, itemRegistryController.linkPersonalRegistry);

/**
 * DELETE /groups/:groupId/item-registries/:registryId/unlink
 * Unlink a personal item registry from this group
 */
router.delete('/:groupId/item-registries/:registryId/unlink', requireAuth, itemRegistryController.unlinkPersonalRegistry);

/**
 * Mount item registry router
 * All routes under /groups/:groupId/item-registries
 */
router.use('/:groupId/item-registries', itemRegistryRouter);

/**
 * Mount wiki router
 * All routes under /groups/:groupId/wiki-documents
 */
router.use('/:groupId/wiki-documents', wikiRouter);

/**
 * Mount group documents router
 * All routes under /groups/:groupId/documents
 */
router.use('/:groupId/documents', groupDocumentsRouter);

// ============================================
// PHONE CALLS ROUTES
// ============================================

/**
 * GET /groups/:groupId/phone-calls
 * Get phone call history for a group
 */
router.get('/:groupId/phone-calls', requireAuth, phoneCallsController.getPhoneCalls);

/**
 * GET /groups/:groupId/phone-calls/active
 * Get active/incoming calls for the current user
 */
router.get('/:groupId/phone-calls/active', requireAuth, phoneCallsController.getActiveCalls);

/**
 * POST /groups/:groupId/phone-calls
 * Initiate a new phone call
 */
router.post('/:groupId/phone-calls', requireAuth, phoneCallsController.initiateCall);

/**
 * PUT /groups/:groupId/phone-calls/:callId/respond
 * Respond to an incoming call (accept or reject)
 */
router.put('/:groupId/phone-calls/:callId/respond', requireAuth, phoneCallsController.respondToCall);

/**
 * PUT /groups/:groupId/phone-calls/:callId/end
 * End an active call
 */
router.put('/:groupId/phone-calls/:callId/end', requireAuth, phoneCallsController.endCall);

/**
 * PUT /groups/:groupId/phone-calls/:callId/leave
 * Leave a call without ending it for others
 */
router.put('/:groupId/phone-calls/:callId/leave', requireAuth, phoneCallsController.leaveCall);

/**
 * PUT /groups/:groupId/phone-calls/:callId/hide-recording
 * Hide a call recording (admin only)
 */
router.put('/:groupId/phone-calls/:callId/hide-recording', requireAuth, phoneCallsController.hideRecording);

/**
 * POST /groups/:groupId/phone-calls/:callId/recording
 * Upload a phone call recording (converts to MP3)
 */
router.post('/:groupId/phone-calls/:callId/recording', requireAuth, recordingUpload.single('recording'), phoneCallsController.uploadRecording);

/**
 * POST /groups/:groupId/phone-calls/:callId/recording-chunk
 * Upload a phone call recording chunk (for gapless chunked recording)
 */
router.post('/:groupId/phone-calls/:callId/recording-chunk', requireAuth, recordingUpload.single('recording'), phoneCallsController.uploadRecordingChunk);

// WebRTC Signaling for Phone Calls
/**
 * POST /groups/:groupId/phone-calls/:callId/signal
 * Send a WebRTC signaling message (offer, answer, ice-candidate)
 */
router.post('/:groupId/phone-calls/:callId/signal', requireAuth, phoneCallsController.sendSignal);

/**
 * GET /groups/:groupId/phone-calls/:callId/signal
 * Get pending WebRTC signaling messages
 */
router.get('/:groupId/phone-calls/:callId/signal', requireAuth, phoneCallsController.getSignals);

/**
 * GET /groups/:groupId/phone-calls/:callId/ice-servers
 * Get STUN/TURN server configuration for WebRTC
 */
router.get('/:groupId/phone-calls/:callId/ice-servers', requireAuth, phoneCallsController.getIceServers);

/**
 * POST /groups/:groupId/phone-calls/:callId/start-recording
 * Start server-side recording for a phone call
 */
router.post('/:groupId/phone-calls/:callId/start-recording', requireAuth, phoneCallsController.startServerRecording);

/**
 * POST /groups/:groupId/phone-calls/:callId/stop-recording
 * Stop server-side recording for a phone call
 */
router.post('/:groupId/phone-calls/:callId/stop-recording', requireAuth, phoneCallsController.stopServerRecording);

/**
 * GET /groups/:groupId/phone-calls/:callId/recording-status
 * Get recording status for a phone call
 */
router.get('/:groupId/phone-calls/:callId/recording-status', requireAuth, phoneCallsController.getRecordingStatus);

/**
 * GET /groups/:groupId/phone-calls/:callId/recorder-signal
 * Get WebRTC signals for the ghost recorder
 */
router.get('/:groupId/phone-calls/:callId/recorder-signal', requireAuth, phoneCallsController.getRecorderSignals);

/**
 * POST /groups/:groupId/phone-calls/:callId/recorder-signal
 * Send WebRTC signal from the ghost recorder
 */
router.post('/:groupId/phone-calls/:callId/recorder-signal', requireAuth, phoneCallsController.sendRecorderSignal);

/**
 * POST /groups/:groupId/phone-calls/:callId/recording-status
 * Broadcast recording status message to all call participants
 */
router.post('/:groupId/phone-calls/:callId/recording-status', requireAuth, phoneCallsController.broadcastRecordingStatus);

// ============================================
// VIDEO CALLS ROUTES
// ============================================

/**
 * GET /groups/:groupId/video-calls
 * Get video call history for a group
 */
router.get('/:groupId/video-calls', requireAuth, videoCallsController.getVideoCalls);

/**
 * GET /groups/:groupId/video-calls/active
 * Get active/incoming video calls for the current user
 */
router.get('/:groupId/video-calls/active', requireAuth, videoCallsController.getActiveCalls);

/**
 * POST /groups/:groupId/video-calls
 * Initiate a new video call
 */
router.post('/:groupId/video-calls', requireAuth, videoCallsController.initiateCall);

/**
 * PUT /groups/:groupId/video-calls/:callId/respond
 * Respond to an incoming video call (accept or reject)
 */
router.put('/:groupId/video-calls/:callId/respond', requireAuth, videoCallsController.respondToCall);

/**
 * PUT /groups/:groupId/video-calls/:callId/end
 * End an active video call
 */
router.put('/:groupId/video-calls/:callId/end', requireAuth, videoCallsController.endCall);

/**
 * PUT /groups/:groupId/video-calls/:callId/hide-recording
 * Hide a video call recording (admin only)
 */
router.put('/:groupId/video-calls/:callId/hide-recording', requireAuth, videoCallsController.hideRecording);

/**
 * PUT /groups/:groupId/video-calls/:callId/leave
 * Leave a video call without ending it for others
 */
router.put('/:groupId/video-calls/:callId/leave', requireAuth, videoCallsController.leaveCall);

/**
 * POST /groups/:groupId/video-calls/:callId/recording
 * Upload a video call recording (converts to MP4)
 */
router.post('/:groupId/video-calls/:callId/recording', requireAuth, recordingUpload.single('recording'), videoCallsController.uploadRecording);

/**
 * POST /groups/:groupId/video-calls/:callId/recording-chunk
 * Upload a video call recording chunk (for gapless chunked recording)
 */
router.post('/:groupId/video-calls/:callId/recording-chunk', requireAuth, recordingUpload.single('recording'), videoCallsController.uploadRecordingChunk);

// =====================
// WebRTC Signaling Routes
// =====================

/**
 * POST /groups/:groupId/video-calls/:callId/signal
 * Send a WebRTC signaling message (offer, answer, ice-candidate)
 */
router.post('/:groupId/video-calls/:callId/signal', requireAuth, videoCallsController.sendSignal);

/**
 * GET /groups/:groupId/video-calls/:callId/signal
 * Get pending WebRTC signaling messages
 */
router.get('/:groupId/video-calls/:callId/signal', requireAuth, videoCallsController.getSignals);

/**
 * GET /groups/:groupId/video-calls/:callId/ice-servers
 * Get STUN/TURN server configuration for WebRTC
 */
router.get('/:groupId/video-calls/:callId/ice-servers', requireAuth, videoCallsController.getIceServers);

/**
 * POST /groups/:groupId/video-calls/:callId/start-recording
 * Start server-side recording for a video call
 */
router.post('/:groupId/video-calls/:callId/start-recording', requireAuth, videoCallsController.startServerRecording);

/**
 * POST /groups/:groupId/video-calls/:callId/stop-recording
 * Stop server-side recording for a video call
 */
router.post('/:groupId/video-calls/:callId/stop-recording', requireAuth, videoCallsController.stopServerRecording);

/**
 * GET /groups/:groupId/video-calls/:callId/recording-status
 * Get recording status for a video call
 */
router.get('/:groupId/video-calls/:callId/recording-status', requireAuth, videoCallsController.getRecordingStatus);

/**
 * GET /groups/:groupId/video-calls/:callId/recorder-signal
 * Get WebRTC signals for the ghost recorder
 */
router.get('/:groupId/video-calls/:callId/recorder-signal', requireAuth, videoCallsController.getRecorderSignals);

/**
 * POST /groups/:groupId/video-calls/:callId/recorder-signal
 * Send WebRTC signal from the ghost recorder
 */
router.post('/:groupId/video-calls/:callId/recorder-signal', requireAuth, videoCallsController.sendRecorderSignal);

/**
 * POST /groups/:groupId/video-calls/:callId/recording-status
 * Broadcast recording status message to all call participants
 */
router.post('/:groupId/video-calls/:callId/recording-status', requireAuth, videoCallsController.broadcastRecordingStatus);

module.exports = router;
