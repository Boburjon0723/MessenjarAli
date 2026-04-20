const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Disable package exports as it causes issues with some polyfill libraries
config.resolver.unstable_enablePackageExports = false;
// Add mjs and cjs to source extensions
config.resolver.sourceExts.push('mjs', 'cjs');

module.exports = config;
