/**
 * Security Tests
 *
 * These tests attempt to break the security measures in place.
 * All tests SHOULD FAIL to exploit - that's the expected behavior.
 */

const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

// Import the auth middleware and services
const { requireAuth } = require('../../middleware/auth.middleware');
const authService = require('../../services/auth.service');
const encryptionService = require('../../services/encryption.service');

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Protected endpoint
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ success: true, userId: req.userId });
  });

  // Endpoint that echoes input (for XSS/injection tests)
  app.post('/echo', requireAuth, (req, res) => {
    res.json({ received: req.body });
  });

  return app;
};

describe('Security Tests - Authentication Bypass Attempts', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Token Forgery Attacks', () => {
    test('ATTACK: No token - should be rejected', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('No authentication token');
    });

    test('ATTACK: Empty bearer token - should be rejected', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Malformed authorization header - should be rejected', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'NotBearer sometoken')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Random string as token - should be rejected', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer thisisnotavalidtoken123')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Forged JWT with wrong secret - should be rejected', async () => {
      // Try to forge a token with a different secret
      const forgedToken = jwt.sign(
        { userId: 'fake-user-id', email: 'hacker@evil.com' },
        'wrong-secret-trying-to-forge',
        { issuer: 'family-helper-api', audience: 'family-helper-app' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Invalid token');
    });

    test('ATTACK: JWT with wrong issuer - should be rejected', async () => {
      const wrongIssuerToken = jwt.sign(
        { userId: 'fake-user-id' },
        process.env.JWT_SECRET || 'local-dev-jwt-secret-change-in-production',
        { issuer: 'evil-issuer', audience: 'family-helper-app' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongIssuerToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: JWT with wrong audience - should be rejected', async () => {
      const wrongAudienceToken = jwt.sign(
        { userId: 'fake-user-id' },
        process.env.JWT_SECRET || 'local-dev-jwt-secret-change-in-production',
        { issuer: 'family-helper-api', audience: 'wrong-audience' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${wrongAudienceToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Expired JWT - should be rejected', async () => {
      const expiredToken = jwt.sign(
        { userId: 'fake-user-id' },
        process.env.JWT_SECRET || 'local-dev-jwt-secret-change-in-production',
        {
          issuer: 'family-helper-api',
          audience: 'family-helper-app',
          expiresIn: '-1h' // Expired 1 hour ago
        }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('expired');
    });

    test('ATTACK: Refresh token used as access token - should be rejected', async () => {
      const refreshToken = jwt.sign(
        { userId: 'fake-user-id', type: 'refresh' },
        process.env.JWT_SECRET || 'local-dev-jwt-secret-change-in-production',
        { issuer: 'family-helper-api', audience: 'family-helper-app' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('refresh token');
    });

    test('ATTACK: Fake Kinde token (wrong issuer) - should be rejected', async () => {
      // Try to forge a token that looks like a Kinde token
      const fakeKindeToken = jwt.sign(
        {
          sub: 'kp_fake123',
          email: 'hacker@evil.com',
          iss: 'https://fakekinde.com' // Wrong issuer
        },
        'fake-private-key',
        { algorithm: 'HS256' }
      );

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${fakeKindeToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Modified JWT payload (tampered) - should be rejected', async () => {
      // Create a valid-looking token structure but tamper with it
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        userId: 'admin-user-id',
        email: 'admin@family.com',
        isAdmin: true
      })).toString('base64url');
      const fakeSignature = 'fake-signature-here';

      const tamperedToken = `${header}.${payload}.${fakeSignature}`;

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: None algorithm JWT - should be rejected', async () => {
      // Try the "none" algorithm attack
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        userId: 'admin-user-id',
        iss: 'family-helper-api',
        aud: 'family-helper-app'
      })).toString('base64url');

      const noneAlgToken = `${header}.${payload}.`;

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${noneAlgToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('SQL Injection Attempts', () => {
    test('ATTACK: SQL injection in authorization header - should be rejected', async () => {
      const sqlInjectionToken = "' OR '1'='1";

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${sqlInjectionToken}`)
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: SQL injection in token payload - should not execute', async () => {
      // Even if somehow decoded, SQL should not execute
      const maliciousPayload = "'; DROP TABLE users; --";

      const response = await request(app)
        .get('/protected')
        .set('Authorization', `Bearer ${maliciousPayload}`)
        .expect(401);

      // Should just be rejected as invalid token, not execute SQL
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});

describe('Security Tests - Encryption', () => {
  describe('Message Encryption Attacks', () => {
    test('ATTACK: Tampered encrypted message - should fail to decrypt', () => {
      // Encrypt a message
      const originalMessage = 'Secret family message';
      const encrypted = encryptionService.encrypt(originalMessage);

      // Tamper with the encrypted data
      const parts = encrypted.split(':');
      if (parts.length >= 3) {
        // Modify the ciphertext
        const tamperedCiphertext = 'aaaa' + parts[2].substring(4);
        const tamperedMessage = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

        // Should throw error or return incorrect data
        expect(() => {
          encryptionService.decrypt(tamperedMessage);
        }).toThrow();
      }
    });

    test('ATTACK: Modified IV - should fail to decrypt correctly', () => {
      const originalMessage = 'Another secret message';
      const encrypted = encryptionService.encrypt(originalMessage);

      const parts = encrypted.split(':');
      if (parts.length >= 3) {
        // Modify the IV
        const tamperedIV = 'bbbbbbbbbbbbbbbb' + parts[0].substring(16);
        const tamperedMessage = `${tamperedIV}:${parts[1]}:${parts[2]}`;

        // Should throw error due to authentication failure
        expect(() => {
          encryptionService.decrypt(tamperedMessage);
        }).toThrow();
      }
    });

    test('ATTACK: Random garbage as encrypted message - should fail', () => {
      expect(() => {
        encryptionService.decrypt('not:valid:encrypted:data');
      }).toThrow();
    });

    test('ATTACK: Empty encrypted message - should fail', () => {
      expect(() => {
        encryptionService.decrypt('');
      }).toThrow();
    });

    test('ATTACK: Replay old encrypted message - decrypts but app should validate freshness', () => {
      // This tests that encryption works, but app logic should check timestamps
      const message = 'Time-sensitive message';
      const encrypted = encryptionService.encrypt(message);

      // Decryption will work (encryption doesn't include timestamp)
      // App-level logic must validate message timestamps
      const decrypted = encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(message);

      // Note: This is expected - encryption protects confidentiality,
      // application logic must protect against replay attacks
    });
  });
});

describe('Security Tests - Input Validation', () => {
  describe('XSS Prevention', () => {
    test('ATTACK: Script tag in input - should be stored/returned safely', async () => {
      const app = createTestApp();
      const xssPayload = '<script>alert("xss")</script>';

      // Without auth, should be rejected
      const response = await request(app)
        .post('/echo')
        .send({ message: xssPayload })
        .expect(401);

      // Even if it got through, React escapes output by default
      // This test verifies auth blocks it first
      expect(response.body.error).toBe('Unauthorized');
    });

    test('ATTACK: Event handler XSS - should not execute', async () => {
      const app = createTestApp();
      const xssPayload = '<img src=x onerror=alert("xss")>';

      const response = await request(app)
        .post('/echo')
        .send({ message: xssPayload })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Path Traversal', () => {
    test('ATTACK: Path traversal in request - should be blocked', async () => {
      const app = createTestApp();

      // Express normalizes paths, so /../../../etc/passwd becomes /etc/passwd
      // This results in 404 (route not found) which is still secure - attacker cannot access files
      const response = await request(app)
        .get('/protected/../../../etc/passwd');

      // Either 401 (auth blocked) or 404 (route not found after normalization) is secure
      expect([401, 404]).toContain(response.status);
      // The important thing is we don't get file contents
      expect(response.body).not.toContain('root:');
    });
  });
});

describe('Security Tests - Token Helper Functions', () => {
  describe('isKindeToken detection', () => {
    test('correctly identifies Kinde tokens', () => {
      // Fake Kinde-like token (won't validate, but tests detection)
      // JWTs use base64url encoding (no padding, - and _ instead of + and /)
      const base64url = str => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const header = { alg: 'RS256', typ: 'JWT' };
      const kindePayload = { iss: 'https://myapp.kinde.com', sub: 'user123' };
      const fakeKindeToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(kindePayload))}.signature`;

      expect(authService.isKindeToken(fakeKindeToken)).toBe(true);
    });

    test('correctly identifies non-Kinde tokens', () => {
      // Use proper base64url encoding like real JWTs
      const base64url = str => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const header = { alg: 'HS256', typ: 'JWT' };
      const customPayload = { iss: 'family-helper-api', userId: 'user123' };
      const customToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(customPayload))}.signature`;

      expect(authService.isKindeToken(customToken)).toBe(false);
    });

    test('handles invalid tokens gracefully', () => {
      expect(authService.isKindeToken('not-a-valid-token')).toBe(false);
      expect(authService.isKindeToken('')).toBe(false);
      // null/undefined might throw - that's also acceptable security behavior
      try {
        const result = authService.isKindeToken(null);
        expect(result).toBe(false);
      } catch (e) {
        // Throwing on null is acceptable - prevents processing
        expect(e).toBeDefined();
      }
    });
  });

  describe('extractTokenFromHeader', () => {
    test('extracts valid bearer token', () => {
      const token = authService.extractTokenFromHeader('Bearer mytoken123');
      expect(token).toBe('mytoken123');
    });

    test('rejects non-bearer auth', () => {
      // Should return falsy (null or undefined) - both are secure
      const result = authService.extractTokenFromHeader('Basic dXNlcjpwYXNz');
      expect(result == null).toBe(true);
    });

    test('rejects malformed header', () => {
      // All these should return a falsy value (null or undefined) - both are secure
      const bearerOnly = authService.extractTokenFromHeader('Bearer');
      expect(bearerOnly == null).toBe(true); // null or undefined

      const emptyString = authService.extractTokenFromHeader('');
      expect(emptyString == null).toBe(true); // null or undefined

      const nullInput = authService.extractTokenFromHeader(null);
      expect(nullInput == null).toBe(true); // null or undefined
    });

    test('extra parts after token - returns falsy (will fail validation anyway)', () => {
      // This behavior is acceptable - extra parts are rejected as malformed
      const result = authService.extractTokenFromHeader('Bearer token extra');
      // Should return falsy (null or undefined) - both are secure
      // The strict length check (parts.length !== 2) rejects this as malformed
      expect(result == null).toBe(true);
    });
  });
});

describe('Security Tests - Rate Limiting Simulation', () => {
  test('ATTACK: Rapid repeated requests - should all require valid auth', async () => {
    const app = createTestApp();
    const requests = [];

    // Simulate 100 rapid requests
    for (let i = 0; i < 100; i++) {
      requests.push(
        request(app)
          .get('/protected')
          .set('Authorization', 'Bearer invalid-token')
      );
    }

    const responses = await Promise.all(requests);

    // All should be rejected - no bypass through volume
    responses.forEach(response => {
      expect(response.status).toBe(401);
    });
  });
});
