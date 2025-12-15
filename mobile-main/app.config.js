// Dynamic Expo config for EAS Build
// This allows environment variables to be used for sensitive files

const appConfig = require('./app.json');

module.exports = ({ config }) => {
  return {
    ...appConfig.expo,
    android: {
      ...appConfig.expo.android,
      // Use EAS file secret if available, otherwise fall back to local file
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
    },
  };
};
