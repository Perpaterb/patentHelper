const path = require('path');

module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          // Custom resolver to handle all aliases
          resolvePath(sourcePath, currentFile) {
            // Redirect expo-secure-store to our web polyfill
            if (sourcePath === 'expo-secure-store') {
              return path.resolve(__dirname, 'src/polyfills/expo-secure-store.js');
            }
            // Redirect mobile-main's DateTimeSelector to web version
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
