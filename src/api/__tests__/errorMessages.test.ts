import i18n from '@/i18n';
import type { ApiError } from '@/types';

import { apiErrorMessage } from '../errorMessages';

/**
 * The error→copy resolution table. Uses the real i18n instance so the
 * assertions pin the actual localized strings a user sees, in BOTH locales.
 */
const t = ((key: string) => i18n.t(key)) as (key: string) => string;

const apiError = (partial: Partial<ApiError>): ApiError => ({
  status: 0,
  message: '',
  ...partial,
});

describe('apiErrorMessage — en', () => {
  it.each([
    [
      'OFFLINE code wins over everything (client sets it while offline)',
      apiError({ status: 0, message: 'Network error.', code: 'OFFLINE', source: 'transport' }),
      'No internet connection. Check your network and try again.',
    ],
    [
      'better-auth code EMAIL_NOT_VERIFIED maps to dedicated copy',
      apiError({ status: 403, message: 'Email not verified', code: 'EMAIL_NOT_VERIFIED', source: 'auth' }),
      'Verify your email first — we sent you a code.',
    ],
    [
      'better-auth code INVALID_EMAIL_OR_PASSWORD maps to dedicated copy',
      apiError({ status: 400, message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD', source: 'auth' }),
      'Incorrect email or password.',
    ],
    [
      'client-side SESSION_REQUIRED maps to dedicated copy',
      apiError({ status: 401, message: 'Email verified. Please sign in with your password to continue.', code: 'SESSION_REQUIRED', source: 'client' }),
      'Email verified. Please sign in with your password to continue.',
    ],
    [
      'axios timeout (ECONNABORTED) gets its own copy, not the generic network one',
      apiError({ status: 0, message: 'Network error.', code: 'ECONNABORTED', source: 'transport' }),
      'The request timed out. Please try again.',
    ],
    [
      'transport failure without a code → network copy',
      apiError({ status: 0, message: 'Network error.', source: 'transport' }),
      'Network error. Please check your connection and try again.',
    ],
    [
      'better-auth unknown code falls back to the status copy',
      apiError({ status: 401, message: 'Some English text', source: 'auth' }),
      'Your session has expired. Please sign in again.',
    ],
    [
      'better-auth unknown code on 5xx → server copy',
      apiError({ status: 502, message: 'Bad gateway', source: 'auth' }),
      'Our servers are having trouble. Please try again shortly.',
    ],
    [
      'envelope errors keep the server-localized message untouched',
      apiError({ status: 409, message: 'Ce créneau vient d’être réservé.', code: 'CONFLICT', source: 'envelope' }),
      'Ce créneau vient d’être réservé.',
    ],
    [
      'envelope with an empty message falls back to the localized status copy',
      apiError({ status: 429, message: '', code: 'RATE_LIMITED', source: 'envelope' }),
      'Too many requests. Please slow down and try again.',
    ],
    [
      'client-side flow errors keep their (already localized) message',
      apiError({ status: 400, message: 'Le mot de passe est requis.', source: 'client' }),
      'Le mot de passe est requis.',
    ],
    [
      'unmapped status below 500 → generic copy',
      apiError({ status: 418, message: '', source: 'auth' }),
      'Something went wrong. Please try again.',
    ],
  ])('%s', (_name, error, expected) => {
    expect(apiErrorMessage(error, t)).toBe(expected);
  });
});

describe('apiErrorMessage — fr (the criterion: French users see French)', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('fr');
  });

  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it.each([
    [
      'network path',
      apiError({ status: 0, message: 'Network error.', source: 'transport' }),
      'Erreur réseau. Vérifiez votre connexion et réessayez.',
    ],
    [
      'timeout path',
      apiError({ status: 0, message: 'Network error.', code: 'ECONNABORTED', source: 'transport' }),
      'La demande a expiré. Veuillez réessayer.',
    ],
    [
      'offline path',
      apiError({ status: 0, message: 'x', code: 'OFFLINE', source: 'transport' }),
      'Pas de connexion Internet. Vérifiez votre réseau et réessayez.',
    ],
    [
      '4xx path (better-auth 401 without a mapped code)',
      apiError({ status: 401, message: 'Session expired', source: 'auth' }),
      'Votre session a expiré. Veuillez vous reconnecter.',
    ],
    [
      '5xx path',
      apiError({ status: 500, message: 'Internal error', source: 'auth' }),
      'Nos serveurs rencontrent un problème. Veuillez réessayer dans un instant.',
    ],
    [
      'better-auth code copy',
      apiError({ status: 400, message: 'Invalid email or password', code: 'INVALID_EMAIL_OR_PASSWORD', source: 'auth' }),
      'E-mail ou mot de passe incorrect.',
    ],
  ])('%s', (_name, error, expected) => {
    expect(apiErrorMessage(error, t)).toBe(expected);
  });

  it('provides every error key in French (nothing falls back to the key name)', () => {
    const keys = [
      'errors.network',
      'errors.timeout',
      'errors.generic',
      'errors.badRequest',
      'errors.unauthorized',
      'errors.forbidden',
      'errors.notFound',
      'errors.conflict',
      'errors.tooLarge',
      'errors.validation',
      'errors.rateLimited',
      'errors.server',
      'errors.codes.EMAIL_NOT_VERIFIED',
      'errors.codes.INVALID_EMAIL_OR_PASSWORD',
      'errors.codes.USER_ALREADY_EXISTS',
      'errors.codes.INVALID_OTP',
      'errors.codes.OTP_EXPIRED',
      'errors.codes.SESSION_REQUIRED',
    ];
    for (const key of keys) {
      const value = i18n.t(key);
      expect(value).not.toBe(key); // i18next returns the key itself when missing
      expect(value.length).toBeGreaterThan(0);
    }
  });
});
