/**
 * Wiki Routes
 *
 * Routes for Wiki document CRUD operations.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get :groupId from parent router
const { requireAuth } = require('../middleware/auth.middleware');
const wikiController = require('../controllers/wiki.controller');

// All routes require authentication
router.use(requireAuth);

// Wiki document routes
router.get('/', wikiController.getWikiDocuments);
router.get('/search', wikiController.searchWikiDocuments);
router.get('/:documentId', wikiController.getWikiDocument);
router.post('/', wikiController.createWikiDocument);
router.put('/:documentId', wikiController.updateWikiDocument);
router.delete('/:documentId', wikiController.deleteWikiDocument);

module.exports = router;
