/**
 * Authentication Service
 *
 * Handles JWT token generation, verification, and user session management.
 * Integrates with Kinde OAuth for user authentication.
 *
 * @module services/auth
 */

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

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
    issuer: 'parenting-helper-api',
    audience: 'parenting-helper-app',
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
    issuer: 'parenting-helper-api',
    audience: 'parenting-helper-app',
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'parenting-helper-api',
      audience: 'parenting-helper-app',
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
  findOrCreateUser,
  getUserById,
  getUserByKindeId,
  extractTokenFromHeader,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
};
