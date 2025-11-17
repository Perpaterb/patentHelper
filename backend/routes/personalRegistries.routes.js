/**
 * Personal Registries Routes
 *
 * Routes for user-level gift and item registries.
 * All routes require authentication (requireAuth middleware).
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const personalGiftRegistryController = require('../controllers/personalGiftRegistry.controller');
const personalItemRegistryController = require('../controllers/personalItemRegistry.controller');

// ============================================================================
// PERSONAL GIFT REGISTRIES
// ============================================================================

// Registry Management
router.get(
  '/gift-registries',
  requireAuth,
  personalGiftRegistryController.getPersonalGiftRegistries
);

router.get(
  '/gift-registries/:registryId',
  requireAuth,
  personalGiftRegistryController.getPersonalGiftRegistryById
);

router.post(
  '/gift-registries',
  requireAuth,
  personalGiftRegistryController.createPersonalGiftRegistry
);

router.put(
  '/gift-registries/:registryId',
  requireAuth,
  personalGiftRegistryController.updatePersonalGiftRegistry
);

router.delete(
  '/gift-registries/:registryId',
  requireAuth,
  personalGiftRegistryController.deletePersonalGiftRegistry
);

router.put(
  '/gift-registries/:registryId/reset-passcode',
  requireAuth,
  personalGiftRegistryController.resetPasscode
);

// Item Management
router.post(
  '/gift-registries/:registryId/items',
  requireAuth,
  personalGiftRegistryController.addItem
);

router.put(
  '/gift-registries/:registryId/items/:itemId',
  requireAuth,
  personalGiftRegistryController.updateItem
);

router.delete(
  '/gift-registries/:registryId/items/:itemId',
  requireAuth,
  personalGiftRegistryController.deleteItem
);

router.put(
  '/gift-registries/:registryId/items/reorder',
  requireAuth,
  personalGiftRegistryController.reorderItems
);

// Group Linking
router.post(
  '/gift-registries/:registryId/link-to-group/:groupId',
  requireAuth,
  personalGiftRegistryController.linkToGroup
);

router.delete(
  '/gift-registries/:registryId/unlink-from-group/:groupId',
  requireAuth,
  personalGiftRegistryController.unlinkFromGroup
);

// ============================================================================
// PERSONAL ITEM REGISTRIES
// ============================================================================

// Registry Management
router.get(
  '/item-registries',
  requireAuth,
  personalItemRegistryController.getPersonalItemRegistries
);

router.get(
  '/item-registries/:registryId',
  requireAuth,
  personalItemRegistryController.getPersonalItemRegistryById
);

router.post(
  '/item-registries',
  requireAuth,
  personalItemRegistryController.createPersonalItemRegistry
);

router.put(
  '/item-registries/:registryId',
  requireAuth,
  personalItemRegistryController.updatePersonalItemRegistry
);

router.delete(
  '/item-registries/:registryId',
  requireAuth,
  personalItemRegistryController.deletePersonalItemRegistry
);

router.put(
  '/item-registries/:registryId/reset-passcode',
  requireAuth,
  personalItemRegistryController.resetPasscode
);

// Item Management
router.post(
  '/item-registries/:registryId/items',
  requireAuth,
  personalItemRegistryController.addItem
);

router.put(
  '/item-registries/:registryId/items/:itemId',
  requireAuth,
  personalItemRegistryController.updateItem
);

router.delete(
  '/item-registries/:registryId/items/:itemId',
  requireAuth,
  personalItemRegistryController.deleteItem
);

router.put(
  '/item-registries/:registryId/items/reorder',
  requireAuth,
  personalItemRegistryController.reorderItems
);

// Group Linking
router.post(
  '/item-registries/:registryId/link-to-group/:groupId',
  requireAuth,
  personalItemRegistryController.linkToGroup
);

router.delete(
  '/item-registries/:registryId/unlink-from-group/:groupId',
  requireAuth,
  personalItemRegistryController.unlinkFromGroup
);

module.exports = router;
