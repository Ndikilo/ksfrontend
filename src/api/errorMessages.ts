import type { ApiError } from '@/types';

/**
 * Maps a normalized `ApiError` to user-facing copy in the active locale —
 * the single place error → string resolution lives, so screens can render
 * `error.message` without ever showing raw English to a French user.
 *
 * Resolution order:
 *   1. `OFFLINE` code (set by the client while the device is offline).
 *   2. Known stable codes — better-auth answers in English only, and
 *      client-side flow errors carry fixed copy worth localizing.
 *   3. Transport failures (no server response: offline/timeout).
 *   4. better-auth statuses (its copy is English-only → map by status).
 *   5. Otherwise keep `message` — /v1 envelope errors arrive already
 *      localized because the client sends Accept-Language (see client.ts).
 *      Falls back to a status default when the message is empty.
 */

/** Minimal shape of i18next's `t` this module needs (keeps it testable). */
export type Translate = (key: string) => string;

/** Stable backend/flow codes with dedicated copy, keyed into the locale table. */
const CODE_KEYS: Record<string, string> = {
  OFFLINE: 'offline.error',
  EMAIL_NOT_VERIFIED: 'errors.codes.EMAIL_NOT_VERIFIED',
  INVALID_EMAIL_OR_PASSWORD: ['errors.codes.INVALID_EMAIL_OR_PASSWORD'].join(''),
  USER_ALREADY_EXISTS: 'errors.codes.USER_ALREADY_EXISTS',
  INVALID_OTP: 'errors.codes.INVALID_OTP',
  OTP_EXPIRED: 'errors.codes.OTP_EXPIRED',
  SESSION_REQUIRED: 'errors.codes.SESSION_REQUIRED',
  // Phone-OTP registration (P8.T6) — stable /v1 codes (ksbackend
  // http/error-mapper.ts); screens may override with richer, parameterized
  // copy but every code has an honest localized fallback here.
  OTP_INVALID: 'errors.codes.OTP_INVALID',
  OTP_ALREADY_USED: 'errors.codes.OTP_ALREADY_USED',
  OTP_LOCKED: 'errors.codes.OTP_LOCKED',
  OTP_SEND_THROTTLED: 'errors.codes.OTP_SEND_THROTTLED',
  OTP_RESEND_COOLDOWN: 'errors.codes.OTP_RESEND_COOLDOWN',
  OTP_DELIVERY_UNAVAILABLE: 'errors.codes.OTP_DELIVERY_UNAVAILABLE',
  PHONE_ALREADY_VERIFIED: 'errors.codes.PHONE_ALREADY_VERIFIED',
  // Client-side: the in-memory phone-signup password is gone (app restart
  // mid-flow) — a resend can no longer satisfy the start contract.
  PHONE_FLOW_EXPIRED: 'errors.codes.PHONE_FLOW_EXPIRED',
};

/** Localized copy per HTTP status for paths without a usable server message. */
const STATUS_KEYS: Record<number, string> = {
  400: 'errors.badRequest',
  401: 'errors.unauthorized',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.conflict',
  413: 'errors.tooLarge',
  422: 'errors.validation',
  429: 'errors.rateLimited',
};

export function apiErrorMessage(error: ApiError, t: Translate): string {
  const codeKey = error.code ? CODE_KEYS[error.code] : undefined;
  if (codeKey) return t(codeKey);

  if (error.source === 'transport') {
    // ECONNABORTED is the axios timeout; anything else is a dropped request.
    return error.code === 'ECONNABORTED' ? t('errors.timeout') : t('errors.network');
  }

  if (error.source === 'auth') return statusMessage(error, t);

  if (error.message) return error.message;
  return statusMessage(error, t);
}

function statusMessage(error: ApiError, t: Translate): string {
  const key = STATUS_KEYS[error.status];
  if (key) return t(key);
  return t(error.status >= 500 ? 'errors.server' : 'errors.generic');
}
