/**
 * Generate Test JWT Token
 *
 * Utility script to generate a test JWT token for local development.
 * This allows testing protected endpoints without going through full Kinde OAuth flow.
 *
 * Usage:
 *   node utils/generateTestToken.js
 *
 * @module utils/generateTestToken
 */

require('dotenv').config({ path: '../.env.local' });
const authService = require('../services/auth.service');

// Mock user for testing
const testUser = {
  userId: '00000000-0000-0000-0000-000000000001',
  email: 'test@parentinghelperapp.com',
  kindeId: 'kinde_test_user_123',
  isSubscribed: true,
};

console.log('');
console.log('🔐 Generating Test JWT Token');
console.log('============================');
console.log('');
console.log('Test User:');
console.log(`  User ID: ${testUser.userId}`);
console.log(`  Email: ${testUser.email}`);
console.log(`  Subscribed: ${testUser.isSubscribed}`);
console.log('');

// Generate tokens
const accessToken = authService.generateAccessToken(testUser);
const refreshToken = authService.generateRefreshToken(testUser);

console.log('Access Token (15 min expiration):');
console.log(accessToken);
console.log('');

console.log('Refresh Token (7 day expiration):');
console.log(refreshToken);
console.log('');

console.log('Test with curl:');
console.log(`curl -H "Authorization: Bearer ${accessToken}" http://localhost:3000/auth/verify`);
console.log('');

console.log('Note: This token will work even though the user doesn\'t exist in the database.');
console.log('      The auth middleware will fail when trying to fetch the user.');
console.log('      To test fully, create this user in the database first.');
console.log('');
