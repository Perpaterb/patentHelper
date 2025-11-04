/**
 * Wish Lists Routes
 *
 * Routes for Gift Registry / Wish Lists.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get :groupId from parent router
const { requireAuth } = require('../middleware/auth.middleware');
const wishListsController = require('../controllers/wishLists.controller');

// All routes require authentication
router.use(requireAuth);

// Wish List routes
router.get('/', wishListsController.getWishLists);
router.post('/', wishListsController.createWishList);

// Wish List Item routes
router.post('/:wishListId/items', wishListsController.addWishListItem);
router.put('/:wishListId/items/:itemId/purchase', wishListsController.markItemAsPurchased);
router.put('/:wishListId/items/:itemId/unpurchase', wishListsController.unmarkItemAsPurchased);
router.delete('/:wishListId/items/:itemId', wishListsController.deleteWishListItem);

module.exports = router;
