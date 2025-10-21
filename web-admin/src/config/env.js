/**
 * Environment Configuration
 *
 * Centralized configuration for environment variables.
 * All environment variables must be prefixed with REACT_APP_
 */

const config = {
  // API Configuration
  api: {
    url: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.REACT_APP_API_TIMEOUT) || 30000,
  },

  // Kinde Authentication
  kinde: {
    domain: process.env.REACT_APP_KINDE_DOMAIN || 'https://parentinghelper.kinde.com',
    clientId: process.env.REACT_APP_KINDE_CLIENT_ID || '',
    redirectUri: process.env.REACT_APP_KINDE_REDIRECT_URI || 'http://localhost:3001/auth/callback',
    logoutRedirectUri: process.env.REACT_APP_KINDE_LOGOUT_REDIRECT_URI || 'http://localhost:3001',
  },

  // Stripe
  stripe: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '',
  },

  // App Configuration
  app: {
    name: process.env.REACT_APP_NAME || 'Parenting Helper Admin',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  },

  // Feature Flags
  features: {
    subscriptions: process.env.REACT_APP_ENABLE_SUBSCRIPTIONS === 'true',
    logExports: process.env.REACT_APP_ENABLE_LOG_EXPORTS === 'true',
    storageManagement: process.env.REACT_APP_ENABLE_STORAGE_MANAGEMENT === 'true',
  },
};

// Validate required configuration
function validateConfig() {
  const errors = [];

  if (!config.kinde.clientId) {
    errors.push('REACT_APP_KINDE_CLIENT_ID is required');
  }

  if (config.features.subscriptions && !config.stripe.publishableKey) {
    console.warn('⚠️  Stripe publishable key not set. Subscription features may not work.');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(error => console.error(`   - ${error}`));
  }

  return errors.length === 0;
}

// Validate on module load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export default config;
