/**
 * Public Registry Routes
 *
 * Public routes for external registry access (no auth required).
 * Uses webToken for identification and passcode verification via request body.
 */

const express = require('express');
const router = express.Router();
const giftRegistryController = require('../controllers/giftRegistry.controller');
const itemRegistryController = require('../controllers/itemRegistry.controller');

// Public Gift Registry routes - no authentication required

// GET - Get basic registry info (no passcode needed for public registries)
router.get('/gift-registry/:webToken', giftRegistryController.getPublicGiftRegistry);

// POST - Verify passcode and get full registry (for passcode-protected registries)
router.post('/gift-registry/:webToken', giftRegistryController.verifyGiftRegistryPasscode);

// POST - Mark item as purchased (public - no auth required)
router.post('/gift-registry/:webToken/items/:itemId/purchase', giftRegistryController.markItemPurchasedPublic);


// Public Item Registry routes - no authentication required

// GET - Get basic registry info (no passcode needed for public registries)
router.get('/item-registry/:webToken', itemRegistryController.getPublicItemRegistry);

// POST - Verify passcode and get full registry (for passcode-protected registries)
router.post('/item-registry/:webToken', itemRegistryController.verifyItemRegistryPasscode);


module.exports = router;
