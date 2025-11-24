const path = require('path');

module.exports = {
  webpack: {
    alias: {
      'react-native$': 'react-native-web',
      // Force single React instance (prevents hooks error)
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      // Allow importing from mobile-main
      '@mobile': path.resolve(__dirname, '../mobile-main/src'),
      // Polyfills for Expo/RN modules
      'expo-secure-store': path.resolve(__dirname, 'src/polyfills/expo-secure-store.js'),
      '@react-navigation/native': path.resolve(__dirname, 'src/polyfills/react-navigation-native.js'),
      // Force single instance of react-native-paper (use web-admin's)
      'react-native-paper': path.resolve(__dirname, 'node_modules/react-native-paper'),
      // Vector icons polyfills (avoid expo-modules-core TypeScript issues)
      'react-native-vector-icons/MaterialCommunityIcons': path.resolve(__dirname, 'src/polyfills/vector-icons.js'),
      '@expo/vector-icons/MaterialCommunityIcons': path.resolve(__dirname, 'src/polyfills/vector-icons.js'),
      '@react-native-vector-icons/material-design-icons': path.resolve(__dirname, 'src/polyfills/vector-icons.js'),
    },
    configure: (webpackConfig) => {
      // Allow importing from outside the src directory (mobile-main)
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      if (scopePluginIndex > -1) {
        webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      }

      // Add mobile-main to babel-loader
      webpackConfig.module.rules.forEach((rule) => {
        if (rule.oneOf) {
          rule.oneOf.forEach((oneOfRule) => {
            if (
              oneOfRule.loader &&
              oneOfRule.loader.includes('babel-loader') &&
              oneOfRule.include
            ) {
              // Add mobile-main/src to babel processing
              if (typeof oneOfRule.include === 'string') {
                oneOfRule.include = [
                  oneOfRule.include,
                  path.resolve(__dirname, '../mobile-main/src'),
                ];
              } else if (Array.isArray(oneOfRule.include)) {
                oneOfRule.include.push(
                  path.resolve(__dirname, '../mobile-main/src')
                );
              }
            }
          });
        }
      });

      return webpackConfig;
    },
  },
  babel: {
    plugins: ['react-native-web'],
    presets: [
      ['@babel/preset-react', { runtime: 'automatic' }],
    ],
  },
};
