/**
 * Feedback Routes
 *
 * Routes for user feedback and support requests.
 */

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedback.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * POST /feedback
 * Send feedback email to support
 */
router.post('/', requireAuth, feedbackController.sendFeedback);

module.exports = router;
