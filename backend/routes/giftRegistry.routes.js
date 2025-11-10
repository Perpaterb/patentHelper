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
router.get('/groups/:groupId/gift-registries', giftRegistryController.getGiftRegistries);
router.get('/groups/:groupId/gift-registries/:registryId', giftRegistryController.getGiftRegistry);
router.post('/groups/:groupId/gift-registries', giftRegistryController.createGiftRegistry);
router.put('/groups/:groupId/gift-registries/:registryId', giftRegistryController.updateGiftRegistry);
router.delete('/groups/:groupId/gift-registries/:registryId', giftRegistryController.deleteGiftRegistry);
router.post('/groups/:groupId/gift-registries/:registryId/reset-passcode', giftRegistryController.resetPasscode);

// Item routes
router.post('/groups/:groupId/gift-registries/:registryId/items', giftRegistryController.addGiftItem);
router.put('/groups/:groupId/gift-registries/:registryId/items/:itemId', giftRegistryController.updateGiftItem);
router.delete('/groups/:groupId/gift-registries/:registryId/items/:itemId', giftRegistryController.deleteGiftItem);

module.exports = router;
