/**
 * Users Routes
 *
 * Routes for user profile management.
 *
 * @module routes/users
 */

const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /users/profile
 * Get user profile information
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Profile retrieved successfully
 *   {
 *     success: true,
 *     user: {
 *       userId: string,
 *       email: string,
 *       displayName: string,
 *       memberIcon: string,
 *       iconColor: string,
 *       isSubscribed: boolean,
 *       createdAt: string
 *     }
 *   }
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.get('/profile', requireAuth, usersController.getProfile);

/**
 * PUT /users/profile
 * Update user profile (display name and member icon)
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Request Body:
 * {
 *   displayName?: string,  // Optional, user's display name
 *   memberIcon?: string,   // Optional, user's member icon (emoji or letters, max 10 chars)
 *   iconColor?: string     // Optional, hex color for icon background
 * }
 *
 * Response:
 * - 200: Profile updated successfully
 *   {
 *     success: true,
 *     message: 'Profile updated successfully',
 *     user: {
 *       userId: string,
 *       email: string,
 *       displayName: string,
 *       memberIcon: string,
 *       iconColor: string
 *     }
 *   }
 * - 400: Invalid input or no data provided
 * - 401: Invalid or missing token
 * - 404: User not found
 * - 500: Server error
 */
router.put('/profile', requireAuth, usersController.updateProfile);

module.exports = router;
