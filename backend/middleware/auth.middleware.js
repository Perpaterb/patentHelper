/**
 * Authentication Middleware
 *
 * Middleware to protect routes requiring authentication.
 * Verifies JWT tokens and attaches user to request object.
 *
 * @module middleware/auth
 */

const authService = require('../services/auth.service');

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user to req.user
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authentication token provided',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = authService.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message,
      });
    }

    // Check if refresh token (shouldn't be used for API access)
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Cannot use refresh token for API access',
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

    // Attach user to request
    req.user = user;
    req.userId = user.userId;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Middleware to require subscription
 * Must be used after requireAuth middleware
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
function requireSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  if (!req.user.isSubscribed) {
    return res.status(403).json({
      error: 'Subscription Required',
      message: 'This action requires an active subscription',
    });
  }

  next();
}

/**
 * Optional authentication middleware
 * Attaches user to request if valid token provided, but doesn't require it
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next middleware
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authService.extractTokenFromHeader(authHeader);

    if (token) {
      try {
        const decoded = authService.verifyToken(token);
        const user = await authService.getUserById(decoded.userId);

        if (user) {
          req.user = user;
          req.userId = user.userId;
        }
      } catch (error) {
        // Invalid token, but continue without user
        console.log('Optional auth failed, continuing without user:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next();
  }
}

module.exports = {
  requireAuth,
  requireSubscription,
  optionalAuth,
};
