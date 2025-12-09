/**
 * Secret Santa Public Routes
 *
 * Public routes for external Secret Santa access (no auth required).
 * All routes use passcode verification via request body.
 */

const express = require('express');
const router = express.Router();
const krisKringleController = require('../controllers/krisKringle.controller');

// Public routes - no authentication required (uses passcode verification)

// Basic event info (no passcode needed)
router.get('/:webToken', krisKringleController.getSecretSantaPublic);

// Verify passcode and get basic info
router.post('/:webToken/verify', krisKringleController.verifySecretSantaAccess);

// Get full event data (requires passcode in body)
router.post('/:webToken/data', krisKringleController.getSecretSantaData);

// Gift registry management
router.post('/:webToken/registry', krisKringleController.createParticipantRegistry);
router.post('/:webToken/registry/:registryId/items', krisKringleController.addRegistryItem);
router.put('/:webToken/registry/:registryId/items/:itemId', krisKringleController.updateRegistryItem);
router.delete('/:webToken/registry/:registryId/items/:itemId', krisKringleController.deleteRegistryItem);
router.post('/:webToken/registry/:registryId/items/:itemId/purchase', krisKringleController.markItemPurchased);

module.exports = router;
