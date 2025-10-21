/**
 * Auth Service Unit Tests
 *
 * Tests for JWT token generation, verification, and user management
 */

require('dotenv').config({ path: '../../.env.local' });
const authService = require('../auth.service');

describe('Auth Service', () => {
  describe('Token Generation', () => {
    test('should generate valid access token', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        kindeId: 'kinde_123',
        isSubscribed: true,
      };

      const token = authService.generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should generate valid refresh token', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
      };

      const token = authService.generateRefreshToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('access token should include user claims', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        kindeId: 'kinde_123',
        isSubscribed: true,
      };

      const token = authService.generateAccessToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded.userId).toBe(testUser.userId);
      expect(decoded.email).toBe(testUser.email);
      expect(decoded.kindeId).toBe(testUser.kindeId);
      expect(decoded.isSubscribed).toBe(testUser.isSubscribed);
    });

    test('refresh token should include userId and type', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const token = authService.generateRefreshToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded.userId).toBe(testUser.userId);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('Token Verification', () => {
    test('should verify valid access token', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        kindeId: 'kinde_123',
        isSubscribed: true,
      };

      const token = authService.generateAccessToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.userId);
    });

    test('should verify valid refresh token', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const token = authService.generateRefreshToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUser.userId);
      expect(decoded.type).toBe('refresh');
    });

    test('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        authService.verifyToken(invalidToken);
      }).toThrow();
    });

    test('should throw error for malformed token', () => {
      const malformedToken = 'not-a-jwt-token';

      expect(() => {
        authService.verifyToken(malformedToken);
      }).toThrow('Invalid token');
    });

    test('should throw error for empty token', () => {
      expect(() => {
        authService.verifyToken('');
      }).toThrow();
    });
  });

  describe('Token Extraction', () => {
    test('should extract token from Bearer header', () => {
      const token = 'my-jwt-token-here';
      const authHeader = `Bearer ${token}`;

      const extracted = authService.extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    test('should return null for missing Authorization header', () => {
      const extracted = authService.extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    test('should return null for missing Bearer prefix', () => {
      const extracted = authService.extractTokenFromHeader('my-jwt-token');

      expect(extracted).toBeNull();
    });

    test('should return null for empty string', () => {
      const extracted = authService.extractTokenFromHeader('');

      expect(extracted).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    test('access token should have issuer and audience', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        kindeId: 'kinde_123',
        isSubscribed: false,
      };

      const token = authService.generateAccessToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded.iss).toBe('parenting-helper-api');
      expect(decoded.aud).toBe('parenting-helper-app');
    });

    test('refresh token should have issuer and audience', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
      };

      const token = authService.generateRefreshToken(testUser);
      const decoded = authService.verifyToken(token);

      expect(decoded.iss).toBe('parenting-helper-api');
      expect(decoded.aud).toBe('parenting-helper-app');
    });

    test('tokens should have exp claim', () => {
      const testUser = {
        userId: '00000000-0000-0000-0000-000000000001',
        email: 'test@example.com',
        kindeId: 'kinde_123',
        isSubscribed: false,
      };

      const accessToken = authService.generateAccessToken(testUser);
      const refreshToken = authService.generateRefreshToken(testUser);

      const decodedAccess = authService.verifyToken(accessToken);
      const decodedRefresh = authService.verifyToken(refreshToken);

      expect(decodedAccess.exp).toBeDefined();
      expect(decodedRefresh.exp).toBeDefined();

      // Refresh token should expire later than access token
      expect(decodedRefresh.exp).toBeGreaterThan(decodedAccess.exp);
    });
  });
});
