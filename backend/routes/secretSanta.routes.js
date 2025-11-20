/**
 * Secret Santa Public Routes
 *
 * Public routes for external Secret Santa access (no auth required).
 */

const express = require('express');
const router = express.Router();
const krisKringleController = require('../controllers/krisKringle.controller');

// Public routes - no authentication required
router.get('/:webToken', krisKringleController.getSecretSantaPublic);
router.post('/:webToken/verify', krisKringleController.verifySecretSantaAccess);

module.exports = router;
