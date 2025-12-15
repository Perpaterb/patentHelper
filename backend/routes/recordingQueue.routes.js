/**
 * Recording Queue Routes
 *
 * Endpoints for managing the recording queue system.
 * Users check queue status before initiating recorded calls.
 */

const express = require('express');
const router = express.Router();
const recordingQueueController = require('../controllers/recordingQueue.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(requireAuth);

// Get queue status
router.get('/status', recordingQueueController.getStatus);

// Join queue
router.post('/join', recordingQueueController.joinQueue);

// Leave queue
router.post('/leave', recordingQueueController.leaveQueue);

// Get queue position
router.get('/position/:queueId', recordingQueueController.getPosition);

// Check if it's user's turn
router.get('/check-turn/:queueId', recordingQueueController.checkTurn);

// Admin: Get full queue info
router.get('/admin/info', recordingQueueController.getAdminInfo);

module.exports = router;
