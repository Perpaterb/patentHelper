/**
 * Notifications Routes
 *
 * Endpoints for push notification management:
 * - Device token registration
 * - Notification preferences
 * - Test notifications
 */

const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(requireAuth);

// Device token management
router.post('/register-token', notificationsController.registerToken);
router.post('/unregister-token', notificationsController.unregisterToken);
router.get('/devices', notificationsController.getDevices);

// Notification preferences (per group)
router.get('/preferences/:groupId', notificationsController.getPreferences);
router.put('/preferences/:groupId', notificationsController.updatePreferences);

// Test notification
router.post('/test', notificationsController.sendTestNotification);

module.exports = router;
