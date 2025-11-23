/**
 * Group Documents Routes
 *
 * Routes for secure document storage within groups.
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams to get :groupId from parent router
const { requireAuth } = require('../middleware/auth.middleware');
const groupDocumentsController = require('../controllers/groupDocuments.controller');

// All routes require authentication
router.use(requireAuth);

// Document routes
router.get('/', groupDocumentsController.getDocuments);
router.post('/', groupDocumentsController.uploadDocument);
router.get('/:documentId', groupDocumentsController.getDocument);
router.put('/:documentId/hide', groupDocumentsController.hideDocument);
router.put('/:documentId/unhide', groupDocumentsController.unhideDocument);
router.delete('/:documentId', groupDocumentsController.deleteDocument);

module.exports = router;
