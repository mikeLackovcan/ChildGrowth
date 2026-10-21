const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push('cjs');
if (!defaultConfig.resolver.assetExts.includes('riv')) defaultConfig.resolver.assetExts.push('riv');

module.exports = defaultConfig;
