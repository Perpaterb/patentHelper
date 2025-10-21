/**
 * Authentication Configuration
 *
 * Configures Kinde OAuth client for user authentication.
 * Uses environment variables for client credentials.
 *
 * @module config/auth
 */

const { createKindeServerClient, GrantType } = require('@kinde-oss/kinde-typescript-sdk');

/**
 * Kinde client configuration
 */
const kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
  authDomain: process.env.KINDE_DOMAIN,
  clientId: process.env.KINDE_CLIENT_ID,
  clientSecret: process.env.KINDE_CLIENT_SECRET,
  redirectURL: process.env.KINDE_REDIRECT_URI,
  logoutRedirectURL: process.env.KINDE_LOGOUT_REDIRECT_URI,
});

/**
 * Validate Kinde configuration on startup
 */
function validateKindeConfig() {
  const requiredVars = [
    'KINDE_DOMAIN',
    'KINDE_CLIENT_ID',
    'KINDE_CLIENT_SECRET',
    'KINDE_REDIRECT_URI',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    console.warn(`⚠️  Missing Kinde configuration: ${missing.join(', ')}`);
    console.warn('   Authentication will not work until these are set in .env.local');
    return false;
  }

  console.log('✅ Kinde authentication configured');
  return true;
}

module.exports = {
  kindeClient,
  validateKindeConfig,
};
