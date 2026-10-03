import { mapUser, maskEmail, toE164 } from '../auth.service';

/**
 * Unit tests for the auth service's pure helpers (mapUser / toE164 / maskEmail).
 *
 * The service module drags in axios, i18n and secure storage at import time, so
 * those seams are mocked (jest.mock is hoisted above the imports) — the helpers
 * under test are pure and get exercised exactly as the app imports them.
 */

jest.mock('@/config/env', () => ({
  env: { apiBaseUrl: 'http://test.local', apiTimeout: 1000, isDev: true, mockAuth: false, sentryDsn: '' },
}));
jest.mock('@/i18n', () => ({ __esModule: true, default: { language: 'en' } }));
jest.mock('@/utils', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  storage: { getJSON: jest.fn(), setJSON: jest.fn(), remove: jest.fn() },
}));
jest.mock('../../client', () => ({
  http: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  setAuthToken: jest.fn(),
}));

type RawUser = Parameters<typeof mapUser>[0];

const rawUser = (overrides: Partial<RawUser> = {}): RawUser => ({
  id: 'u-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  emailVerified: true,
  image: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

describe('toE164 — normalises locally-entered phone numbers', () => {
  it('prefixes a + and strips formatting characters', () => {
    expect(toE164('237 6 78 90 12 34')).toBe('+237678901234');
    expect(toE164('(237) 678-901-234')).toBe('+237678901234');
    expect(toE164('237.678.901.234')).toBe('+237678901234');
  });

  it('keeps an existing + prefix exactly once', () => {
    expect(toE164('+237 678 901 234')).toBe('+237678901234');
    expect(toE164('+33612345678')).toBe('+33612345678');
  });

  it('handles en-dashes and em-dashes as formatting', () => {
    expect(toE164('237–678–901–234')).toBe('+237678901234');
    expect(toE164('237—678—901—234')).toBe('+237678901234');
  });
});

describe('maskEmail — safe-to-display email masking', () => {
  it('keeps the first two characters and stars the rest', () => {
    expect(maskEmail('johndoe@gmail.com')).toBe('jo*****@gmail.com');
    expect(maskEmail('a.user@long.domain.org')).toBe('a.****@long.domain.org');
  });

  it('always shows at least three stars for very short local parts', () => {
    expect(maskEmail('ab@x.io')).toBe('ab***@x.io');
    expect(maskEmail('a@b.co')).toBe('a***@b.co');
  });

  it('returns the input untouched when there is no @', () => {
    expect(maskEmail('not-an-email')).toBe('not-an-email');
  });
});

describe('mapUser — backend user → app User', () => {
  it('maps every field, dropping null image to undefined avatarUrl', () => {
    expect(mapUser(rawUser())).toEqual({
      id: 'u-1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      avatarUrl: undefined,
      role: 'patient',
      locale: 'en',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  it('keeps a known image URL as avatarUrl', () => {
    expect(mapUser(rawUser({ image: 'https://cdn.example.com/a.png' })).avatarUrl).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it.each(['patient', 'doctor', 'nurse', 'dependent', 'admin'] as const)(
    'passes the known role %j through untouched',
    (role) => {
      expect(mapUser(rawUser({ role })).role).toBe(role);
    },
  );

  it('falls back to "patient" for unknown, missing or null roles', () => {
    expect(mapUser(rawUser({ role: 'superadmin' })).role).toBe('patient');
    expect(mapUser(rawUser({ role: null })).role).toBe('patient');
    expect(mapUser(rawUser({ role: undefined })).role).toBe('patient');
  });

  it('normalises the locale: only "fr" survives, everything else is "en"', () => {
    expect(mapUser(rawUser({ locale: 'fr' })).locale).toBe('fr');
    expect(mapUser(rawUser({ locale: 'de' })).locale).toBe('en');
    expect(mapUser(rawUser({ locale: null })).locale).toBe('en');
  });
});
