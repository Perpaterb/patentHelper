/**
 * Encryption Service Tests
 *
 * Tests AES-256-GCM encryption/decryption functionality
 */

const encryptionService = require('../encryption.service');

// Set a test encryption key before running tests
process.env.MESSAGE_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('Encryption Service', () => {
  describe('encrypt', () => {
    it('should encrypt a plaintext message', () => {
      const plaintext = 'Hello, this is a secret message!';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.split(':').length).toBe(3); // iv:authTag:ciphertext
    });

    it('should produce different ciphertext for same plaintext (random IV)', () => {
      const plaintext = 'Same message';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should throw error for empty plaintext', () => {
      expect(() => encryptionService.encrypt('')).toThrow();
    });

    it('should throw error for non-string input', () => {
      expect(() => encryptionService.encrypt(null)).toThrow();
      expect(() => encryptionService.encrypt(undefined)).toThrow();
      expect(() => encryptionService.encrypt(123)).toThrow();
    });
  });

  describe('decrypt', () => {
    it('should decrypt an encrypted message', () => {
      const plaintext = 'Hello, this is a secret message!';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = 'Hello 世界 🌍 émojis!';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long messages', () => {
      const plaintext = 'A'.repeat(10000); // 10KB message
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should throw error for invalid encrypted format', () => {
      expect(() => encryptionService.decrypt('invalid')).toThrow();
      expect(() => encryptionService.decrypt('only:two')).toThrow();
      expect(() => encryptionService.decrypt('')).toThrow();
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'Original message';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      parts[2] = 'tampereddata';
      const tampered = parts.join(':');

      expect(() => encryptionService.decrypt(tampered)).toThrow('Failed to decrypt');
    });

    it('should throw error for tampered auth tag', () => {
      const plaintext = 'Original message';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with the auth tag
      const parts = encrypted.split(':');
      parts[1] = Buffer.from('tampered').toString('base64');
      const tampered = parts.join(':');

      expect(() => encryptionService.decrypt(tampered)).toThrow('Failed to decrypt');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted messages', () => {
      const plaintext = 'Test message';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encryptionService.isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(encryptionService.isEncrypted('Hello world')).toBe(false);
      expect(encryptionService.isEncrypted('Just a regular message')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(encryptionService.isEncrypted(null)).toBe(false);
      expect(encryptionService.isEncrypted(undefined)).toBe(false);
      expect(encryptionService.isEncrypted('')).toBe(false);
      expect(encryptionService.isEncrypted(123)).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('should generate a valid 64-character hex key', () => {
      const key = encryptionService.generateKey();

      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const key1 = encryptionService.generateKey();
      const key2 = encryptionService.generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('Integration', () => {
    it('should encrypt and decrypt multiple messages correctly', () => {
      const messages = [
        'First message',
        'Second message with émojis 🎉',
        'Third message with numbers 12345',
        'Fourth message with special chars !@#$%^&*()',
      ];

      const encrypted = messages.map(msg => encryptionService.encrypt(msg));
      const decrypted = encrypted.map(enc => encryptionService.decrypt(enc));

      expect(decrypted).toEqual(messages);
    });

    it('should maintain data integrity over encrypt/decrypt cycle', () => {
      const plaintext = JSON.stringify({
        user: 'John Doe',
        message: 'Hello @Jane! How are you? 😊',
        timestamp: new Date().toISOString(),
      });

      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(plaintext));
    });
  });
});

describe('Encryption Service - Missing Key', () => {
  it('should throw error if MESSAGE_ENCRYPTION_KEY not set', () => {
    const originalKey = process.env.MESSAGE_ENCRYPTION_KEY;
    delete process.env.MESSAGE_ENCRYPTION_KEY;

    expect(() => encryptionService.encrypt('test')).toThrow('MESSAGE_ENCRYPTION_KEY');

    // Restore key
    process.env.MESSAGE_ENCRYPTION_KEY = originalKey;
  });

  it('should throw error if MESSAGE_ENCRYPTION_KEY is wrong length', () => {
    const originalKey = process.env.MESSAGE_ENCRYPTION_KEY;
    process.env.MESSAGE_ENCRYPTION_KEY = 'tooshort';

    expect(() => encryptionService.encrypt('test')).toThrow('64 hex characters');

    // Restore key
    process.env.MESSAGE_ENCRYPTION_KEY = originalKey;
  });
});
