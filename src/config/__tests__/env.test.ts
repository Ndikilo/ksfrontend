type Env = typeof import('@/config/env').env;

/**
 * Tests for the release-build mockAuth guard and base-URL resolution in
 * `src/config/env.ts`. The module computes everything at import time from
 * `expo-constants` + the `__DEV__` global, so each case re-imports it with a
 * fresh module registry (`jest.resetModules` + `require` after tweaking the
 * mock* variables the hoisted factories read).
 */

// Hoisted jest.mock factories may only reference variables prefixed with
// `mock` — these are the per-case knobs.
let mockExtra: Record<string, unknown> = {};
let mockPlatformOS: 'ios' | 'android' = 'ios';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: mockExtra };
    },
  },
}));
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return mockPlatformOS;
    },
    select: (options: Record<string, unknown>) => options,
  },
}));

const ORIGINAL_DEV = (globalThis as { __DEV__?: boolean }).__DEV__;
const ORIGINAL_PUBLIC_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

beforeAll(() => {
  // env.ts (and the release guard) capture __DEV__ at import time; tests set
  // it through setDev() before each re-import.
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
});

afterAll(() => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = ORIGINAL_DEV;
  if (ORIGINAL_PUBLIC_URL === undefined) {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
  } else {
    process.env.EXPO_PUBLIC_API_BASE_URL = ORIGINAL_PUBLIC_URL;
  }
});

beforeEach(() => {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_API_BASE_URL;
  mockExtra = {};
  mockPlatformOS = 'ios';
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Re-import `@/config/env` under a specific dev/release + config combination. */
function loadEnv(options: {
  dev: boolean;
  extra?: Record<string, unknown>;
  publicBaseUrl?: string;
  android?: boolean;
}): Env {
  jest.resetModules();
  (globalThis as { __DEV__?: boolean }).__DEV__ = options.dev;
  mockPlatformOS = options.android ? 'android' : 'ios';
  if (options.extra) mockExtra = options.extra;
  if (options.publicBaseUrl !== undefined) {
    process.env.EXPO_PUBLIC_API_BASE_URL = options.publicBaseUrl;
  }
  // CommonJS require is load-bearing: the module must re-execute under the
  // reset registry with the current mock* values (dynamic import() is
  // unavailable in the jest VM without --experimental-vm-modules).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('@/config/env') as { env: Env }).env;
}

describe('env config guard — mockAuth must never ship in a release build', () => {
  it('keeps mockAuth ENABLED when explicitly true in a dev build', () => {
    const env = loadEnv({ dev: true, extra: { mockAuth: true } });
    expect(env.mockAuth).toBe(true);
  });

  it('FORCES mockAuth off and logs a loud error in a release build', () => {
    const env = loadEnv({ dev: false, extra: { mockAuth: true, apiBaseUrl: 'https://prod.example' } });
    expect(env.mockAuth).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('mockAuth'));
  });

  it('stays off with no error when mockAuth is unset in a release build', () => {
    const env = loadEnv({ dev: false, extra: { apiBaseUrl: 'https://prod.example' } });
    expect(env.mockAuth).toBe(false);
    expect(console.error).not.toHaveBeenCalled();
  });

  it('defaults mockAuth to off in dev builds too', () => {
    const env = loadEnv({ dev: true });
    expect(env.mockAuth).toBe(false);
  });
});

describe('env config — apiBaseUrl resolution order', () => {
  it('prefers the EAS-inlined EXPO_PUBLIC_API_BASE_URL over app.json extra', () => {
    const env = loadEnv({
      dev: false,
      extra: { apiBaseUrl: 'https://from-app-json.example' },
      publicBaseUrl: 'https://from-eas-env.example',
    });
    expect(env.apiBaseUrl).toBe('https://from-eas-env.example');
  });

  it('falls back to app.json extra.apiBaseUrl when no env var is set', () => {
    const env = loadEnv({ dev: false, extra: { apiBaseUrl: 'https://prod.example' } });
    expect(env.apiBaseUrl).toBe('https://prod.example');
  });

  it('rewrites localhost to the Android emulator alias 10.0.2.2 on Android', () => {
    const env = loadEnv({ dev: true, extra: { apiBaseUrl: 'http://localhost:8081' }, android: true });
    expect(env.apiBaseUrl).toBe('http://10.0.2.2:8081');
  });

  it('leaves non-Android localhost URLs untouched', () => {
    const env = loadEnv({ dev: true, extra: { apiBaseUrl: 'http://localhost:8081' } });
    expect(env.apiBaseUrl).toBe('http://localhost:8081');
  });

  it('exposes the fixed config surface (timeout, isDev, sentryDsn default)', () => {
    const env = loadEnv({ dev: false, extra: { sentryDsn: 'https://dsn.example/1' } });
    expect(env.apiTimeout).toBe(15_000);
    expect(env.isDev).toBe(false);
    expect(env.sentryDsn).toBe('https://dsn.example/1');
  });

  it('warns (dev only path) when apiBaseUrl is missing entirely', () => {
    const env = loadEnv({ dev: true, extra: {} });
    expect(env.apiBaseUrl).toBe('');
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('apiBaseUrl'));
  });
});

describe('env config — apiBaseUrl release validation (P2.T6)', () => {
  it('logs a LOUD error when apiBaseUrl is missing in a release build', () => {
    const env = loadEnv({ dev: false, extra: {} });
    expect(env.apiBaseUrl).toBe('');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Missing config value'));
  });

  it('logs a LOUD error for a malformed URL in a release build', () => {
    loadEnv({ dev: false, extra: { apiBaseUrl: 'ksbackend-api.onrender.com' } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
  });

  it('rejects non-http(s) protocols in a release build', () => {
    loadEnv({ dev: false, extra: { apiBaseUrl: 'ftp://files.example' } });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
  });

  it('keeps the (invalid) value so the misconfiguration is visible in logs', () => {
    const env = loadEnv({ dev: false, extra: { apiBaseUrl: 'not a url' } });
    expect(env.apiBaseUrl).toBe('not a url');
  });

  it('accepts valid http and https URLs in a release build without noise', () => {
    const https = loadEnv({ dev: false, extra: { apiBaseUrl: 'https://api.example' } });
    const http = loadEnv({ dev: true, extra: { apiBaseUrl: 'http://localhost:8081' } });
    expect(https.apiBaseUrl).toBe('https://api.example');
    expect(http.apiBaseUrl).toBe('http://localhost:8081');
    expect(console.error).not.toHaveBeenCalled();
  });

  it('dev builds only warn for invalid URLs (never console.error)', () => {
    loadEnv({ dev: true, extra: { apiBaseUrl: 'nope' } });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid'));
    expect(console.error).not.toHaveBeenCalled();
  });
});
