import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Centralised, typed access to runtime configuration.
 *
 * Values come from `app.json > expo.extra` (readable at runtime via
 * `expo-constants`). Keeping this in ONE module means no component ever reaches
 * into `Constants` or `process.env` directly — swap environments here alone.
 *
 * For secrets/per-environment builds, prefer EAS environment variables or
 * `.env` files consumed at build time; never commit real secrets.
 */
type Extra = {
  apiBaseUrl?: string;
  /** Escape hatch to run the UI against the local fake auth (default: real API). */
  mockAuth?: boolean;
  /**
   * Sentry DSN for error reporting. Public ingest URL (not a secret); empty
   * disables error reporting entirely. See src/utils/sentry.ts.
   */
  sentryDsn?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function required(value: string | undefined, name: string): string {
  if (!value) {
    // Fail loud in development; a missing base URL is a configuration bug.
    if (__DEV__) {
      console.warn(`[env] Missing config value "${name}". Falling back to a placeholder.`);
    }
    return '';
  }
  return value;
}

const configuredBaseUrl = required(extra.apiBaseUrl, 'apiBaseUrl');

/**
 * Release guard: mock authentication may only ever run in dev builds. A store
 * build with `mockAuth: true` in its config IGNORES the flag (forced off) and
 * errors loudly — shipping a fake-auth app must fail visibly, not silently.
 * (Unit test lands with the P2.T4 test runner.)
 */
function guardMockAuth(value: boolean): boolean {
  if (!value) {
    return false;
  }
  if (__DEV__) {
    return true;
  }
  console.error(
    '[env] mockAuth=true in a release build is ignored — mock authentication is dev-only.',
  );
  return false;
}

/**
 * The Android emulator cannot reach the host machine via `localhost` — the
 * conventional alias is `10.0.2.2`. Rewrite it so the same `app.json` works on
 * every platform (physical Android devices need the host's LAN IP instead).
 */
const apiBaseUrl =
  Platform.OS === 'android' && configuredBaseUrl.includes('localhost')
    ? configuredBaseUrl.replace('localhost', '10.0.2.2')
    : configuredBaseUrl;

export const env = {
  apiBaseUrl,
  /** Global request timeout in milliseconds. */
  apiTimeout: 15_000,
  isDev: __DEV__,
  /**
   * When true, the auth service returns local mock responses instead of hitting
   * the network. Off by default — the real backend is the source of truth.
   * Dev-only: forced off (with a loud error) in release builds by guardMockAuth.
   */
  mockAuth: guardMockAuth(extra.mockAuth ?? false),
  /** Sentry error-reporting DSN; '' = reporting disabled (see src/utils/sentry.ts). */
  sentryDsn: extra.sentryDsn ?? '',
} as const;
