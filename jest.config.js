/**
 * Jest config for the Expo app (preset: jest-expo).
 *
 * - `moduleNameMapper` mirrors the tsconfig `@/*` path alias so test files can
 *   import app modules exactly like app code does.
 * - `transformIgnorePatterns` lets babel transform node_modules that ship
 *   uncompiled ESM/JSX (all Expo/RN packages) while keeping the rest fast.
 *   The `@sentry/react-native` entry is required because metro.config.js pulls
 *   it in via getSentryExpoConfig; jest-expo's stock pattern misses it.
 */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.@(ts|tsx)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|sentry-expo|native-base|react-native-svg)',
  ],
};
