module.exports = {
  presets: ['@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/components': './src/presentation/components',
          '@/screens': './src/presentation/screens',
          '@/hooks': './src/presentation/hooks',
          '@/store': './src/application/store',
          '@/services': './src/application/services',
          '@/domain': './src/domain',
          '@/infrastructure': './src/infrastructure',
          '@/shared': './src/shared',
        },
      },
    ],
    'react-native-reanimated/plugin', // 반드시 마지막에 위치
  ],
};