const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  'react-native-maps': require.resolve('react-native-maps/lib/index.web.js'),
};

module.exports = config;