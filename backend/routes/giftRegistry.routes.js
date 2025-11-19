/**
 * Gift Registry Routes
 *
 * Handles routing for gift registry CRUD operations
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const giftRegistryController = require('../controllers/giftRegistry.controller');

// All routes require authentication
router.use(requireAuth);

// Registry routes
// Mounted at /groups/:groupId/gift-registries
router.get('/', giftRegistryController.getGiftRegistries);
router.get('/:registryId', giftRegistryController.getGiftRegistry);
router.post('/', giftRegistryController.createGiftRegistry);
router.put('/:registryId', giftRegistryController.updateGiftRegistry);
router.delete('/:registryId', giftRegistryController.deleteGiftRegistry);
router.post('/:registryId/reset-passcode', giftRegistryController.resetPasscode);

// Item routes
router.post('/:registryId/items', giftRegistryController.addGiftItem);
router.put('/:registryId/items/:itemId', giftRegistryController.updateGiftItem);
router.delete('/:registryId/items/:itemId', giftRegistryController.deleteGiftItem);
router.post('/:registryId/items/:itemId/mark-purchased', giftRegistryController.markItemAsPurchased);

// Link/Unlink personal registry routes
router.post('/:registryId/link', giftRegistryController.linkPersonalRegistry);
router.delete('/:registryId/unlink', giftRegistryController.unlinkPersonalRegistry);

module.exports = router;
