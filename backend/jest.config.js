module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  verbose: true,
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // Force exit after tests complete to handle libraries with open handles
  // (e.g., jwks-rsa JWKS client caching, database connections)
  forceExit: true,
};
