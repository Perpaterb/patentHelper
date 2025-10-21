/**
 * Jest Configuration
 *
 * Configuration for unit and integration tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.spec.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'services/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],

  // Coverage threshold (note: singular, not plural)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: [],

  // Module paths
  moduleDirectories: ['node_modules', 'src'],

  // Timeout for tests (5 seconds)
  testTimeout: 5000,

  // Verbose output
  verbose: true,
};
