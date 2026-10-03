import { storage } from '@/utils';
import type { RegisterPayload } from '@/types';

import { http } from '../../client';
import { mapUser, maskEmail, pendingPasswordExpired, toE164 } from '../auth.service';

/**
 * Unit tests for the auth service's pure helpers (mapUser / toE164 / maskEmail)
 * and the pending-registration password TTL (P2.T10).
 *
 * The service module drags in axios, i18n and secure storage at import time, so
 * those seams are mocked (jest.mock is hoisted above the imports) — the helpers
 * under test are pure and get exercised exactly as the app imports them.
 */

jest.mock('@/config/env', () => ({
  env: { apiBaseUrl: 'http://test.local', apiTimeout: 1000, isDev: true, mockAuth: false, sentryDsn: '' },
}));
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: { language: 'en', t: (key: string) => key },
}));
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

// --- P2.T10: pendingRegistration password TTL --------------------------------

const HOUR = 60 * 60 * 1000;

describe('pendingPasswordExpired — pure TTL rule', () => {
  const now = 1_800_000_000_000;

  it('false while the password is inside the 24h TTL', () => {
    const entry = { email: 'a@b.co', password: 'secret1', createdAt: now - 23 * HOUR };
    expect(pendingPasswordExpired(entry, now)).toBe(false);
  });

  it('true once the TTL is crossed', () => {
    const entry = { email: 'a@b.co', password: 'secret1', createdAt: now - 25 * HOUR };
    expect(pendingPasswordExpired(entry, now)).toBe(true);
    const edge = { email: 'a@b.co', password: 'secret1', createdAt: now - 24 * HOUR - 1 };
    expect(pendingPasswordExpired(edge, now)).toBe(true);
  });

  it('true for a pre-TTL mirror without createdAt (never trusted with a live password)', () => {
    expect(pendingPasswordExpired({ email: 'a@b.co', password: 'secret1' }, now)).toBe(true);
  });

  it('false when there is no password to expire (or no entry at all)', () => {
    expect(pendingPasswordExpired({ email: 'a@b.co' }, now)).toBe(false);
    expect(pendingPasswordExpired({ email: 'a@b.co', password: undefined }, now)).toBe(false);
    expect(pendingPasswordExpired(null, now)).toBe(false);
  });

  it('defaults `now` to Date.now()', () => {
    const fresh = { email: 'a@b.co', password: 'secret1', createdAt: Date.now() - 1000 };
    expect(pendingPasswordExpired(fresh)).toBe(false);
  });
});

describe('expirePendingPassword — cold start (storage mirror)', () => {
  const KEY = 'auth.pendingRegistration';

  // The service keeps `pendingAuth` as MODULE STATE: a redaction in one test
  // would leak into the next (a stale passwordless entry short-circuits the
  // storage read). Re-import the module graph per test for a clean slate —
  // jest re-applies this file's jest.mock factories to the fresh instances
  // (same pattern as the env-guard tests). The fresh refs MUST be used below.
  let service: typeof import('../auth.service');
  let storageMock: typeof storage;

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../auth.service');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storageMock = require('@/utils').storage as typeof storage;
    (storageMock.getJSON as jest.Mock).mockResolvedValue(null);
  });

  it('wipes an expired password but keeps email + profile (sign-in fallback path)', async () => {
    (storageMock.getJSON as jest.Mock).mockResolvedValue({
      email: 'a@b.co',
      password: 'secret1',
      profile: { surname: 'Doe' },
      createdAt: Date.now() - 25 * HOUR,
    });
    await service.expirePendingPassword();
    expect(storageMock.setJSON).toHaveBeenCalledTimes(1);
    const [key, written] = (storageMock.setJSON as jest.Mock).mock.calls[0];
    expect(key).toBe(KEY);
    expect(written).toEqual({
      email: 'a@b.co',
      profile: { surname: 'Doe' },
      createdAt: expect.any(Number),
    });
    expect('password' in written && written.password).toBeFalsy();
    expect(storageMock.remove).not.toHaveBeenCalled();
  });

  it('leaves a fresh mirror untouched', async () => {
    (storageMock.getJSON as jest.Mock).mockResolvedValue({
      email: 'a@b.co',
      password: 'secret1',
      createdAt: Date.now() - 1000,
    });
    await service.expirePendingPassword();
    expect(storageMock.setJSON).not.toHaveBeenCalled();
  });

  it('treats a legacy mirror without createdAt as expired', async () => {
    (storageMock.getJSON as jest.Mock).mockResolvedValue({ email: 'a@b.co', password: 'secret1' });
    await service.expirePendingPassword();
    expect(storageMock.setJSON).toHaveBeenCalledWith(
      KEY,
      expect.objectContaining({ email: 'a@b.co' }),
    );
    const [, written] = (storageMock.setJSON as jest.Mock).mock.calls[0];
    expect('password' in written && written.password).toBeFalsy();
  });

  it('no-op when nothing is pending or the password is already gone', async () => {
    await service.expirePendingPassword();
    expect(storageMock.setJSON).not.toHaveBeenCalled();
    (storageMock.getJSON as jest.Mock).mockResolvedValue({ email: 'a@b.co' });
    await service.expirePendingPassword();
    expect(storageMock.setJSON).not.toHaveBeenCalled();
  });
});

describe('expirePendingPassword — mid-flow auto-expire (module state)', () => {
  // Fresh module graph per test (same isolation rationale as the storage
  // describe above): register() seeds in-memory state that must not leak.
  let service: typeof import('../auth.service');
  let httpMock: typeof http;
  let storageMock: typeof storage;

  const payload: RegisterPayload = {
    surname: 'Doe',
    givenNames: 'Jane',
    email: 'a@b.co',
    phone: '+237678901234',
    dateOfBirth: '1990-01-01',
    sex: 'female',
    password: 'secret1',
  };

  beforeEach(() => {
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    service = require('../auth.service');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    httpMock = require('../../client').http as typeof http;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storageMock = require('@/utils').storage as typeof storage;
    // Every POST resolves a valid backend auth/session body so register →
    // verify → sign-in mapping works end to end through the mocks.
    (httpMock.post as jest.Mock).mockResolvedValue({ token: 't-1', user: rawUser() });
  });

  it('a password that crosses the TTL mid-flow is wiped → verify falls back to SESSION_REQUIRED', async () => {
    await service.authService.register(payload); // seeds memory + storage, fresh createdAt
    await service.expirePendingPassword(Date.now() + 25 * HOUR);

    const [, written] = (storageMock.setJSON as jest.Mock).mock.calls.at(-1)!;
    expect('password' in written && written.password).toBeFalsy();

    await expect(
      service.authService.verifyRegistration({ identifier: 'a@b.co', code: '123456' }),
    ).rejects.toMatchObject({ status: 401, code: 'SESSION_REQUIRED' });
  });

  it('a fresh password still completes registration (control)', async () => {
    await service.authService.register(payload);
    await service.expirePendingPassword(); // inside TTL — no redaction

    await service.authService.verifyRegistration({ identifier: 'a@b.co', code: '123456' });
    // Success clears the pending flow from storage…
    expect(storageMock.remove).toHaveBeenCalledWith('auth.pendingRegistration');
    // …after using the kept password to sign in (verify → sign-in calls).
    const posts = (httpMock.post as jest.Mock).mock.calls.map(([, body]) => body);
    expect(posts).toContainEqual(expect.objectContaining({ email: 'a@b.co', password: 'secret1' }));
  });
});
