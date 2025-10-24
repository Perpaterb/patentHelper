/**
 * Invitations Routes
 *
 * Routes for managing group invitations.
 */

const express = require('express');
const router = express.Router();
const invitationsController = require('../controllers/invitations.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /invitations
 * Get all pending invitations for the current user
 */
router.get('/', requireAuth, invitationsController.getInvitations);

/**
 * GET /invitations/count
 * Get count of pending invitations for the current user
 */
router.get('/count', requireAuth, invitationsController.getInvitationCount);

/**
 * POST /invitations/:groupMemberId/accept
 * Accept a group invitation
 */
router.post('/:groupMemberId/accept', requireAuth, invitationsController.acceptInvitation);

/**
 * POST /invitations/:groupMemberId/decline
 * Decline a group invitation
 */
router.post('/:groupMemberId/decline', requireAuth, invitationsController.declineInvitation);

module.exports = router;
