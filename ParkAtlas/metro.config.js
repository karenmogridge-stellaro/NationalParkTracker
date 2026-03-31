const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'expo-glass-effect': path.resolve(__dirname, 'stubs/expo-glass-effect.js'),
};

module.exports = config;
