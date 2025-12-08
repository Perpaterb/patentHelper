/**
 * Environment Configuration
 *
 * Centralized configuration for environment variables.
 * Expo uses EXPO_PUBLIC_ prefix for client-side variables
 */

const config = {
  // API Configuration
  api: {
    url: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
    timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT) || 30000,
  },

  // Kinde Authentication
  kinde: {
    domain: process.env.EXPO_PUBLIC_KINDE_DOMAIN || 'https://familyhelperapp.kinde.com',
    clientId: process.env.EXPO_PUBLIC_KINDE_CLIENT_ID || '',
    redirectUri: process.env.EXPO_PUBLIC_KINDE_REDIRECT_URI || 'http://localhost:8081/auth/callback',
    logoutRedirectUri: process.env.EXPO_PUBLIC_KINDE_LOGOUT_REDIRECT_URI || 'http://localhost:8081',
  },

  // Stripe
  stripe: {
    publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  },

  // App Configuration
  app: {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'Parenting Helper Admin',
    version: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.EXPO_PUBLIC_APP_ENVIRONMENT || 'development',
  },

  // Feature Flags
  features: {
    subscriptions: process.env.EXPO_PUBLIC_ENABLE_SUBSCRIPTIONS === 'true',
    logExports: process.env.EXPO_PUBLIC_ENABLE_LOG_EXPORTS === 'true',
    storageManagement: process.env.EXPO_PUBLIC_ENABLE_STORAGE_MANAGEMENT === 'true',
  },
};

// Validate required configuration
function validateConfig() {
  const warnings = [];

  if (!config.kinde.clientId) {
    warnings.push('EXPO_PUBLIC_KINDE_CLIENT_ID not set - authentication will not work');
  }

  if (config.features.subscriptions && !config.stripe.publishableKey) {
    warnings.push('EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY not set - subscription features disabled');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  } else {
    console.log('✅ Configuration loaded successfully');
  }

  return warnings.length === 0;
}

// Validate on module load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

export default config;
