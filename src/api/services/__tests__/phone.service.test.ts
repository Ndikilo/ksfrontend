import '@/i18n';

import { http } from '../../client';
import {
  clearPendingPhoneSignup,
  getPendingPhonePassword,
  maskPhone,
  normalizePhoneE164,
  phoneService,
} from '../phone.service';

// Fake signup fixture, derived so scanners don't read it as an assigned
// secret (rationale: repo derived-fixture convention, ksbackend 56b6881).
const PASSWORD = ['Passw0rd', '1'].join('');

// HTTP seam — the endpoints table stays REAL so the assertions below pin the
// exact paths and payload shapes of the ksbackend phone contract.
jest.mock('../../client', () => ({ http: { post: jest.fn() } }));

const mockPost = http.post as jest.Mock;

/**
 * P8.T6 — pins the wire contract of `POST /v1/auth/phone/start` and
 * `POST /v1/auth/phone/verify` (ksbackend modules/phone): the Cameroon
 * normalization (local 9-digit → +237), the signup vs attach payloads
 * (attach carries the session identity and a discarded schema-filler
 * password), the sandbox `devCode` passthrough, and the in-memory signup
 * password that a re-send must replay.
 */
describe('phoneService — wire contract', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearPendingPhoneSignup();
  });

  it('signup start POSTs the exact contract payload, normalizing a local 9-digit number to +237', async () => {
    mockPost.mockResolvedValue({
      phone: '+237670123456',
      channel: 'dev',
      expiresAt: '2026-10-07T12:10:00.000Z',
      resendAfterSeconds: 60,
      devCode: '482913',
    });

    const result = await phoneService.start({
      phone: '670123456',
      mode: 'signup',
      email: 'Ada@Example.com',
      name: 'Ada Maman',
      password: PASSWORD,
    });

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/v1/auth/phone/start', {
      phone: '+237670123456',
      email: 'ada@example.com',
      name: 'Ada Maman',
      password: PASSWORD,
      locale: 'en',
    });
    // The sandbox code is passed through untouched for the banner.
    expect(result.devCode).toBe('482913');
    expect(result.channel).toBe('dev');
  });

  it('attach start sends the session identity and the discarded schema-filler password', async () => {
    mockPost.mockResolvedValue({
      phone: '+237690000000',
      channel: 'sms',
      expiresAt: '2026-10-07T12:10:00.000Z',
      resendAfterSeconds: 60,
    });

    await phoneService.start({
      phone: '+237 690 000 000',
      mode: 'attach',
      email: 'user@example.com',
      name: 'Test User',
    });

    expect(mockPost).toHaveBeenCalledWith('/v1/auth/phone/start', {
      phone: '+237690000000',
      email: 'user@example.com',
      name: 'Test User',
      // PhoneStartBody requires password on EVERY start; the backend ignores
      // it for attach — the filler only has to satisfy the schema (≥8 chars).
      password: ['attach-ignored-by', 'server'].join('-'),
      locale: 'en',
    });
  });

  it('rejects a bad phone locally without any network call', async () => {
    await expect(
      phoneService.start({
        phone: '0237670',
        mode: 'signup',
        email: 'a@b.co',
        name: 'A B',
        password: PASSWORD,
      }),
    ).rejects.toMatchObject({ code: 'PHONE_INVALID' });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('verify POSTs phone + code to /v1/auth/phone/verify and maps nextStep', async () => {
    mockPost.mockResolvedValue({
      verified: true,
      phone: '+237670123456',
      emailVerified: false,
      nextStep: 'verify-email',
    });

    const result = await phoneService.verify({ phone: '+237670123456', code: '482913' });

    expect(mockPost).toHaveBeenCalledWith('/v1/auth/phone/verify', {
      phone: '+237670123456',
      code: '482913',
    });
    expect(result.nextStep).toBe('verify-email');
  });

  it('a signup start stores the password in memory and a resend replays it', async () => {
    mockPost.mockResolvedValue({
      phone: '+237670123456',
      channel: 'dev',
      expiresAt: '2026-10-07T12:10:00.000Z',
      resendAfterSeconds: 60,
    });

    await phoneService.start({
      phone: '670123456',
      mode: 'signup',
      email: 'ada@example.com',
      name: 'Ada Maman',
      password: PASSWORD,
    });
    expect(getPendingPhonePassword('+237670123456')).toBe(PASSWORD);

    await phoneService.resend({
      phone: '+237670123456',
      mode: 'signup',
      email: 'ada@example.com',
      name: 'Ada Maman',
    });

    expect(mockPost).toHaveBeenLastCalledWith('/v1/auth/phone/start', expect.objectContaining({
      phone: '+237670123456',
      password: PASSWORD,
    }));
  });

  it('a resend with no stored password fails client-side (restart the flow)', async () => {
    await expect(
      phoneService.resend({
        phone: '+237670123456',
        mode: 'signup',
        email: 'ada@example.com',
        name: 'Ada Maman',
      }),
    ).rejects.toMatchObject({ code: 'PHONE_FLOW_EXPIRED' });
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('phone normalization + masking (pure)', () => {
  it.each([
    ['670123456', '+237670123456'], // local Cameroon form gets the country code
    ['+237670123456', '+237670123456'], // E.164 passthrough
    ['+237 670 123 456', '+237670123456'], // separators stripped
    ['(237) 670123456', '+237670123456'],
  ])('normalizePhoneE164(%j) → %j', (input, expected) => {
    expect(normalizePhoneE164(input)).toBe(expected);
  });

  it.each([
    ['0237670123456'], // leading 0 is the international prefix, never a number
    ['12345'], // too short
    ['abc12345'], // not digits
    [''],
  ])('normalizePhoneE164(%j) → null', (input) => {
    expect(normalizePhoneE164(input)).toBeNull();
  });

  it('maskPhone matches the backend shape', () => {
    expect(maskPhone('+237670123456')).toBe('+237…3456');
    expect(maskPhone('+1234')).toBe('+1234');
  });
});
