/**
 * Item Registry Routes (Group-Level)
 *
 * Routes for group item registries (books, tools, equipment).
 * Requires group membership verification.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // To access :groupId from parent router
const { requireAuth } = require('../middleware/auth.middleware');
const itemRegistryController = require('../controllers/itemRegistry.controller');

// Registry Management
router.get(
  '/',
  requireAuth,
  itemRegistryController.getItemRegistries
);

router.get(
  '/:registryId',
  requireAuth,
  itemRegistryController.getItemRegistryById
);

router.post(
  '/',
  requireAuth,
  itemRegistryController.createItemRegistry
);

router.put(
  '/:registryId',
  requireAuth,
  itemRegistryController.updateItemRegistry
);

router.delete(
  '/:registryId',
  requireAuth,
  itemRegistryController.deleteItemRegistry
);

// Item Management
router.post(
  '/:registryId/items',
  requireAuth,
  itemRegistryController.addItem
);

router.put(
  '/:registryId/items/:itemId',
  requireAuth,
  itemRegistryController.updateItem
);

router.delete(
  '/:registryId/items/:itemId',
  requireAuth,
  itemRegistryController.deleteItem
);

router.put(
  '/:registryId/items/reorder',
  requireAuth,
  itemRegistryController.reorderItems
);

// Passcode Management
router.post(
  '/:registryId/reset-passcode',
  requireAuth,
  itemRegistryController.resetPasscode
);

module.exports = router;
