import { spawnSync } from 'node:child_process';

// Expo evaluates app.config.js in Node, outside Metro's EXPO_PUBLIC inlining
// and the React Native URL shim. Exercise that same environment here.
const configure = (input: { config: { extra: Record<string, string> } }) => {
  const result = spawnSync(process.execPath, ['-e',
    'const configure = require("./app.config.js"); ' +
    'process.stdout.write(JSON.stringify(configure(JSON.parse(process.argv[1]))));',
    JSON.stringify(input),
  ], { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
};

const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  for (const key of ['EAS_BUILD_PROFILE', 'EXPO_PUBLIC_API_BASE_URL',
    'EXPO_PUBLIC_TERMS_URL', 'EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_SUPPORT_EMAIL']) {
    delete process.env[key];
  }
});
afterEach(() => { process.env = originalEnv; });

const config = { extra: { apiBaseUrl: 'https://16.28.39.251', custom: 'preserved' } };
const production = () => {
  Object.assign(process.env, {
    EAS_BUILD_PROFILE: 'production',
    EXPO_PUBLIC_API_BASE_URL: 'https://api.kanasante.test',
    EXPO_PUBLIC_TERMS_URL: 'https://kanasante.test/terms',
    EXPO_PUBLIC_PRIVACY_URL: 'https://kanasante.test/privacy',
    EXPO_PUBLIC_SUPPORT_EMAIL: 'support@kanasante.test',
  });
};

it('preserves development configuration', () => {
  expect(configure({ config })).toEqual(config);
});
it('rejects release builds with no explicit API origin', () => {
  process.env.EAS_BUILD_PROFILE = 'preview';
  expect(() => configure({ config })).toThrow('EXPO_PUBLIC_API_BASE_URL');
});
it.each(['http://api.kanasante.test', 'https://16.28.39.251', 'https://localhost',
  'https://[::1]', 'https://user:password@api.kanasante.test'])(
  'rejects unsuitable production API origin %s', (origin) => {
    production();
    process.env.EXPO_PUBLIC_API_BASE_URL = origin;
    expect(() => configure({ config })).toThrow('EXPO_PUBLIC_API_BASE_URL');
  },
);
it.each(['EXPO_PUBLIC_TERMS_URL', 'EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_SUPPORT_EMAIL'])(
  'rejects production without %s', (key) => {
    production();
    delete process.env[key];
    expect(() => configure({ config })).toThrow(key);
  },
);
it('rejects placeholder support addresses', () => {
  production();
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL = 'support@kanasante.example.com';
  expect(() => configure({ config })).toThrow('EXPO_PUBLIC_SUPPORT_EMAIL');
});
it('injects configured production URLs and preserves unrelated extra values', () => {
  production();
  expect(configure({ config }).extra).toEqual({
    apiBaseUrl: 'https://api.kanasante.test',
    termsUrl: 'https://kanasante.test/terms',
    privacyUrl: 'https://kanasante.test/privacy',
    supportEmail: 'support@kanasante.test',
    custom: 'preserved',
  });
});
