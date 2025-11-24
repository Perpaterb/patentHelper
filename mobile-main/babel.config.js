module.exports = function (api) {
  api.cache(true);

  // Exclude reanimated plugin during testing
  const isTest = process.env.NODE_ENV === 'test';

  return {
    presets: ['babel-preset-expo'],
    plugins: isTest ? [] : ['react-native-reanimated/plugin'],
  };
};
