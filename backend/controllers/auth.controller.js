/**
 * Authentication Controller
 *
 * Handles authentication flow with Kinde OAuth.
 * Manages login, callback, token refresh, and logout.
 *
 * @module controllers/auth
 */

const { kindeClient } = require('../config/auth');
const authService = require('../services/auth.service');

/**
 * Initiate login with Kinde
 * GET /auth/login
 *
 * Redirects to Kinde OAuth login page
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function login(req, res) {
  try {
    const loginUrl = await kindeClient.login();

    // Redirect to Kinde login page
    res.redirect(loginUrl.toString());
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message,
    });
  }
}

/**
 * Handle Kinde OAuth callback
 * GET /auth/callback
 *
 * Receives authorization code from Kinde and exchanges for user info
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function callback(req, res) {
  try {
    // Get authorization code from query params
    const urlParams = new URLSearchParams(req.url.split('?')[1]);

    // Exchange code for tokens
    await kindeClient.handleRedirectToApp(new URLSearchParams(urlParams));

    // Check if user is authenticated
    const isAuthenticated = await kindeClient.isAuthenticated();

    if (!isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not authenticate with Kinde',
      });
    }

    // Get user profile from Kinde
    const kindeUser = await kindeClient.getUserProfile();

    if (!kindeUser || !kindeUser.id || !kindeUser.email) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Could not retrieve user profile from Kinde',
      });
    }

    // Find or create user in our database
    const user = await authService.findOrCreateUser(kindeUser);

    // Generate JWT tokens
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user info
    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken: accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        isSubscribed: user.isSubscribed,
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({
      error: 'Authentication callback failed',
      message: error.message,
    });
  }
}

/**
 * Register new user
 * GET /auth/register
 *
 * Redirects to Kinde registration page
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function register(req, res) {
  try {
    const registerUrl = await kindeClient.register();

    // Redirect to Kinde registration page
    res.redirect(registerUrl.toString());
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message,
    });
  }
}

/**
 * Refresh access token
 * POST /auth/refresh
 *
 * Exchanges refresh token for new access token
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function refresh(req, res) {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No refresh token provided',
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = authService.verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
      });
    }

    // Check token type
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token type',
      });
    }

    // Get user from database
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Generate new access token
    const accessToken = authService.generateAccessToken(user);

    res.status(200).json({
      success: true,
      accessToken: accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Token refresh failed',
      message: error.message,
    });
  }
}

/**
 * Verify token
 * GET /auth/verify
 *
 * Verifies current access token and returns user info
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function verify(req, res) {
  // User is attached by requireAuth middleware
  res.status(200).json({
    success: true,
    valid: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      isSubscribed: req.user.isSubscribed,
    },
  });
}

/**
 * Logout user
 * POST /auth/logout
 *
 * Clears refresh token cookie and logs out from Kinde
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
async function logout(req, res) {
  try {
    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message,
    });
  }
}

/**
 * Get current user profile
 * GET /auth/me
 *
 * Returns current user profile (requires authentication)
 *
 * @param {Object} req - Express request (with user attached by requireAuth middleware)
 * @param {Object} res - Express response
 */
async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      kindeId: req.user.kindeId,
      isSubscribed: req.user.isSubscribed,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
}

module.exports = {
  login,
  callback,
  register,
  refresh,
  verify,
  logout,
  getMe,
};
