/**
 * Authentication Service
 *
 * Handles JWT token generation, verification, and user session management.
 * Supports both:
 * - Custom JWTs (legacy - issuer: family-helper-api)
 * - Kinde tokens (Phase 2 - issuer: https://*.kinde.com)
 *
 * @module services/auth
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { prisma } = require('../config/database');

/**
 * Kinde JWKS client for validating Kinde tokens
 * Caches keys for 10 minutes to reduce calls to Kinde
 */
const kindeDomain = process.env.KINDE_DOMAIN || 'familyhelperapp.kinde.com';
const kindeJwksClient = jwksClient({
  jwksUri: `https://${kindeDomain}/.well-known/jwks`,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * JWT configuration from environment
 */
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT access token
 * @param {Object} user - User object from database
 * @returns {string} JWT access token
 */
function generateAccessToken(user) {
  const payload = {
    userId: user.userId,
    email: user.email,
    kindeId: user.kindeId,
    isSubscribed: user.isSubscribed,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'family-helper-api',
    audience: 'family-helper-app',
  });
}

/**
 * Generate JWT refresh token
 * @param {Object} user - User object from database
 * @returns {string} JWT refresh token
 */
function generateRefreshToken(user) {
  const payload = {
    userId: user.userId,
    type: 'refresh',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'family-helper-api',
    audience: 'family-helper-app',
  });
}

/**
 * Verify custom JWT token (legacy - issuer: family-helper-api)
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'family-helper-api',
      audience: 'family-helper-app',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Get signing key from Kinde JWKS
 * @param {Object} header - JWT header with kid
 * @returns {Promise<string>} Public key for verification
 */
function getKindeSigningKey(header) {
  return new Promise((resolve, reject) => {
    kindeJwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
}

/**
 * Verify Kinde token using JWKS
 * @param {string} token - Kinde JWT token
 * @returns {Promise<Object>} Decoded token payload with user info
 * @throws {Error} If token is invalid or expired
 */
async function verifyKindeToken(token) {
  try {
    // First decode without verification to get the header
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token format - missing kid');
    }

    // Get the signing key from Kinde JWKS
    const signingKey = await getKindeSigningKey(decoded.header);

    // Verify the token
    const payload = jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: `https://${kindeDomain}`,
    });

    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Kinde token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid Kinde token');
    }
    throw error;
  }
}

/**
 * Check if a token is a Kinde token (vs our custom JWT)
 * Kinde tokens have issuer https://*.kinde.com
 * @param {string} token - JWT token to check
 * @returns {boolean} True if Kinde token
 */
function isKindeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.iss) return false;
    return decoded.iss.includes('kinde.com');
  } catch {
    return false;
  }
}

/**
 * Find or create user in database from Kinde profile
 * @param {Object} kindeUser - User object from Kinde
 * @returns {Promise<Object>} User from database
 */
async function findOrCreateUser(kindeUser) {
  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { kindeId: kindeUser.id },
    });

    if (user) {
      // Update user info in case it changed in Kinde
      user = await prisma.user.update({
        where: { userId: user.userId },
        data: {
          email: kindeUser.email,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: kindeUser.email,
          kindeId: kindeUser.id,
          isSubscribed: false, // Default to non-subscribed
        },
      });
    }

    return user;
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw new Error('Failed to create or update user');
  }
}

/**
 * Get user by ID
 * @param {string} userId - User ID (UUID)
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserById(userId) {
  try {
    return await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        email: true,
        kindeId: true,
        isSubscribed: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user by Kinde ID
 * @param {string} kindeId - Kinde user ID
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByKindeId(kindeId) {
  try {
    return await prisma.user.findUnique({
      where: { kindeId: kindeId },
      select: {
        userId: true,
        email: true,
        kindeId: true,
        isSubscribed: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    console.error('Error getting user by Kinde ID:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  verifyKindeToken,
  isKindeToken,
  findOrCreateUser,
  getUserById,
  getUserByKindeId,
  extractTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
