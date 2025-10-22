/**
 * Authentication Routes
 *
 * Routes for user authentication with Kinde OAuth.
 * Handles login, registration, callback, token refresh, and logout.
 *
 * @module routes/auth
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');

/**
 * GET /auth/login
 * Initiate login with Kinde OAuth
 *
 * Redirects to Kinde login page
 *
 * Response:
 * - 302: Redirect to Kinde login page
 * - 500: Server error
 */
router.get('/login', authController.login);

/**
 * GET /auth/register
 * Initiate registration with Kinde OAuth
 *
 * Redirects to Kinde registration page
 *
 * Response:
 * - 302: Redirect to Kinde registration page
 * - 500: Server error
 */
router.get('/register', authController.register);

/**
 * GET /auth/callback
 * Handle Kinde OAuth callback
 *
 * Receives authorization code from Kinde, exchanges for user info,
 * creates/updates user in database, and returns JWT tokens
 *
 * Query Parameters:
 * - code: Authorization code from Kinde
 * - state: OAuth state parameter
 *
 * Response:
 * - 200: Login successful with access token and user info
 *   {
 *     success: true,
 *     accessToken: string,
 *     user: { userId, email, isSubscribed }
 *   }
 * - 401: Authentication failed
 * - 500: Server error
 *
 * Side Effects:
 * - Sets httpOnly cookie 'refreshToken' (7 day expiration)
 */
router.get('/callback', authController.callback);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 *
 * Requires refresh token in httpOnly cookie
 *
 * Response:
 * - 200: New access token
 *   { success: true, accessToken: string }
 * - 401: Invalid or missing refresh token
 * - 500: Server error
 */
router.post('/refresh', authController.refresh);

/**
 * GET /auth/verify
 * Verify current access token
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: Token valid with user info
 *   { success: true, valid: true, user: { userId, email, isSubscribed } }
 * - 401: Invalid or missing token
 * - 500: Server error
 */
router.get('/verify', requireAuth, authController.verify);

/**
 * GET /auth/me
 * Get current user profile
 *
 * Requires valid access token in Authorization header
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 *
 * Response:
 * - 200: User profile
 *   { success: true, user: { userId, email, kindeId, isSubscribed, createdAt, updatedAt } }
 * - 401: Invalid or missing token
 * - 500: Server error
 */
router.get('/me', requireAuth, authController.getMe);

/**
 * POST /auth/logout
 * Logout user
 *
 * Clears refresh token cookie and returns Kinde logout URL
 *
 * Response:
 * - 200: Logout successful
 *   { success: true, message: string, logoutUrl: string }
 * - 500: Server error
 *
 * Side Effects:
 * - Clears 'refreshToken' cookie
 */
router.post('/logout', authController.logout);

/**
 * POST /auth/exchange
 * Exchange Kinde token for backend JWT
 *
 * Accepts a Kinde access token and returns backend JWT tokens
 *
 * Request Body:
 * - kindeToken: Kinde access token
 *
 * Response:
 * - 200: Token exchange successful
 *   { success: true, accessToken: string, user: { userId, email, isSubscribed } }
 * - 400: Missing Kinde token
 * - 401: Invalid Kinde token
 * - 500: Server error
 *
 * Side Effects:
 * - Sets httpOnly cookie 'refreshToken' (7 day expiration)
 * - Creates user in database if not exists
 */
router.post('/exchange', authController.exchangeToken);

module.exports = router;
