// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Set test encryption key if not already set (required for encryption tests)
// This is a 64-character hex string (32 bytes) for AES-256
if (!process.env.MESSAGE_ENCRYPTION_KEY) {
  process.env.MESSAGE_ENCRYPTION_KEY = 'a'.repeat(64); // Test-only key
}
