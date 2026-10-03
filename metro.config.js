// Learn more https://docs.expo.dev/guides/customizing-metro
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry-wrapped Expo Metro config: identical to the default Expo config plus
// the source-map/bundle instrumentation Sentry needs to symbolicate production
// stack traces (uploads happen during EAS builds via the Sentry config plugin).
module.exports = getSentryExpoConfig(__dirname);
