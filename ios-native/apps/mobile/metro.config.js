const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add SVG support
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg'],
};

// Keep shared polyfills for expo-image
const SHARED_ALIASES = {
  'expo-image': path.resolve(__dirname, './polyfills/shared/expo-image.tsx'),
};

// Native-specific aliases
const NATIVE_ALIASES = {
  './Libraries/Components/TextInput/TextInput': path.resolve(
    __dirname,
    './polyfills/native/texinput.native.jsx'
  ),
};

// Custom resolver for aliases and Expo Google Fonts
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Polyfills are not resolved by Metro
  if (
    context.originModulePath.startsWith(`${__dirname}/polyfills/native`) ||
    context.originModulePath.startsWith(`${__dirname}/polyfills/shared`)
  ) {
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  }

  // Wildcard alias for Expo Google Fonts
  if (moduleName.startsWith('@expo-google-fonts/') && moduleName !== '@expo-google-fonts/dev') {
    if (originalResolveRequest) {
      return originalResolveRequest(context, '@expo-google-fonts/dev', platform);
    }
    return context.resolveRequest(context, '@expo-google-fonts/dev', platform);
  }

  // Shared aliases
  if (SHARED_ALIASES[moduleName] && !moduleName.startsWith('./polyfills/')) {
    if (originalResolveRequest) {
      return originalResolveRequest(context, SHARED_ALIASES[moduleName], platform);
    }
    return context.resolveRequest(context, SHARED_ALIASES[moduleName], platform);
  }

  // Native aliases
  if (NATIVE_ALIASES[moduleName] && !moduleName.startsWith('./polyfills/')) {
    if (originalResolveRequest) {
      return originalResolveRequest(context, NATIVE_ALIASES[moduleName], platform);
    }
    return context.resolveRequest(context, NATIVE_ALIASES[moduleName], platform);
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
