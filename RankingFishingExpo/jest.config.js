/**
 * Tests unitaires (jest-expo) : `npm test`.
 * Les tests E2E Playwright vivent dans e2e/ (`npm run e2e`).
 */
const path = require('path');

// Le projet déclare babel-preset-expo@13 (SDK 53) alors qu'Expo SDK 54 embarque la v54,
// seule capable de parser les sources Flow de React Native 0.81. Jest utilise donc
// explicitement le preset fourni par `expo`, sans toucher à la config Babel de Metro.
const expoBabelPreset = path.dirname(
  require.resolve('babel-preset-expo/package.json', { paths: [path.dirname(require.resolve('expo/package.json'))] }),
);

module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  transform: {
    '\\.[jt]sx?$': ['babel-jest', { babelrc: false, configFile: false, presets: [expoBabelPreset] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@supabase/.*|@reduxjs/.*|immer|redux|react-redux))',
  ],
};
