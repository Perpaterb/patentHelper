const path = require('path');

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            'expo-secure-store': './src/polyfills/expo-secure-store.js',
          },
          // Custom resolver to redirect mobile-main's DateTimeSelector to web version
          resolvePath(sourcePath, currentFile) {
            // Check if importing DateTimeSelector from mobile-main
            if (sourcePath.includes('components/DateTimeSelector') &&
                currentFile.includes('mobile-main')) {
              return path.resolve(__dirname, 'src/components/DateTimeSelector.jsx');
            }
            return undefined; // Use default resolution
          },
        },
      ],
    ],
  };
};
