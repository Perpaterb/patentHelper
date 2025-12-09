/**
 * Kris Kringle Routes
 *
 * Routes for Kris Kringle / Secret Santa events.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get :groupId from parent router
const { requireAuth } = require('../middleware/auth.middleware');
const krisKringleController = require('../controllers/krisKringle.controller');

// All routes require authentication
router.use(requireAuth);

// Kris Kringle routes
router.get('/', krisKringleController.getKrisKringles);
router.get('/:krisKringleId', krisKringleController.getKrisKringle);
router.post('/', krisKringleController.createKrisKringle);
router.put('/:krisKringleId', krisKringleController.updateKrisKringle);
router.post('/:krisKringleId/generate-matches', krisKringleController.generateKrisKringleMatches);
router.get('/:krisKringleId/my-match', krisKringleController.getMyMatch);
router.delete('/:krisKringleId', krisKringleController.deleteKrisKringle);

// Participant routes
router.post('/:krisKringleId/participants', krisKringleController.addParticipant);
router.delete('/:krisKringleId/participants/:participantId', krisKringleController.removeParticipant);
router.post('/:krisKringleId/participants/:participantId/resend', krisKringleController.resendParticipantEmail);

module.exports = router;
