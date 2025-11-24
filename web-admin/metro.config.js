/**
 * Metro configuration for Expo/React Native Web
 *
 * This configuration allows importing screens directly from mobile-main
 * to maintain a single source of truth for all shared components.
 */

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Project root for mobile-main imports
const mobileMainRoot = path.resolve(__dirname, '../mobile-main');
const webAdminNodeModules = path.resolve(__dirname, 'node_modules');

// Allow importing from parent directories (mobile-main)
config.watchFolders = [mobileMainRoot];

// CRITICAL: Only use web-admin's node_modules to avoid duplicate React
config.resolver.nodeModulesPaths = [webAdminNodeModules];

// Block mobile-main's node_modules from being resolved
config.resolver.blockList = [
  new RegExp(`${mobileMainRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*`),
];

// Ensure proper resolution of React Native modules
config.resolver.extraNodeModules = new Proxy(
  {
    // Force single instance of these packages from web-admin
    'react': path.resolve(webAdminNodeModules, 'react'),
    'react-dom': path.resolve(webAdminNodeModules, 'react-dom'),
    'react-native': path.resolve(webAdminNodeModules, 'react-native'),
    'react-native-web': path.resolve(webAdminNodeModules, 'react-native-web'),
    'react-native-paper': path.resolve(webAdminNodeModules, 'react-native-paper'),
    '@react-navigation/native': path.resolve(webAdminNodeModules, '@react-navigation/native'),
    '@react-navigation/stack': path.resolve(webAdminNodeModules, '@react-navigation/stack'),
    // Use web polyfill for expo-secure-store (localStorage instead of native)
    'expo-secure-store': path.resolve(__dirname, 'src/polyfills/expo-secure-store.js'),
    '@expo/vector-icons': path.resolve(webAdminNodeModules, '@expo/vector-icons'),
  },
  {
    // Fallback to web-admin's node_modules for any other module
    get: (target, name) => {
      if (target[name]) {
        return target[name];
      }
      return path.resolve(webAdminNodeModules, name);
    },
  }
);

module.exports = config;
