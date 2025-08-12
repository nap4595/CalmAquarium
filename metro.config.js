const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/presentation/components'),
      '@/screens': path.resolve(__dirname, 'src/presentation/screens'),
      '@/hooks': path.resolve(__dirname, 'src/presentation/hooks'),
      '@/store': path.resolve(__dirname, 'src/application/store'),
      '@/services': path.resolve(__dirname, 'src/application/services'),
      '@/domain': path.resolve(__dirname, 'src/domain'),
      '@/infrastructure': path.resolve(__dirname, 'src/infrastructure'),
      '@/shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);