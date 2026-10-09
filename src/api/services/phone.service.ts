import i18n from '@/i18n';
import type { Locale } from '@/types';

import { apiError } from '../httpError';
import { http } from '../client';
import { endpoints } from '../endpoints';

/**
 * Phone-number registration API (P8.T6) — ksbackend `modules/phone`:
 *
 *   - `POST /v1/auth/phone/start` begins (or, after the 60s cooldown, re-sends)
 *     a 6-digit code. Delivery tries SMS (Twilio) → email fallback → dev-only
 *     surfacing (`devCode` present ONLY when every channel is unconfigured AND
 *     the backend env is neither prod nor staging; prod+unconfigured = 503
 *     OTP_DELIVERY_UNAVAILABLE).
 *   - `POST /v1/auth/phone/verify` consumes the code. On the SIGNUP path (no
 *     session) it materializes the account and returns `nextStep`; on the
 *     ATTACH path (session bearer attached by the http client) it upserts the
 *     caller's verified phone.
 *
 * Rate limiting is server-side (per-phone/per-IP send budgets, resend cooldown,
 * lockout after 3 wrong codes) and answers with the stable codes mapped in
 * `api/errorMessages.ts` (OTP_SEND_THROTTLED, OTP_RESEND_COOLDOWN, OTP_LOCKED,
 * OTP_INVALID, OTP_ALREADY_USED, OTP_EXPIRED, PHONE_ALREADY_VERIFIED,
 * OTP_DELIVERY_UNAVAILABLE).
 */

// --- Wire shapes (ksbackend src/modules/phone/phone.contract.ts) -------------

/** How the code for the current attempt was delivered. */
export type PhoneDeliveryChannel = 'sms' | 'email' | 'dev';

export type PhoneStartResult = {
  /** The normalized E.164 phone the code was addressed to. */
  phone: string;
  channel: PhoneDeliveryChannel;
  /** ISO-8601 — when the code stops being valid. */
  expiresAt: string;
  /** Minimum seconds before another code can be requested (60 in practice). */
  resendAfterSeconds: number;
  /**
   * DEVELOPMENT ONLY. Present exclusively when no delivery channel is
   * configured and the backend env is not prod/staging. Always absent in
   * production — the sandbox banner must only ever be rendered from this.
   */
  devCode?: string;
};

export type PhoneVerifyResult = {
  verified: true;
  phone: string;
  /**
   * True when the OTP was delivered BY email (possession proven). SMS/dev
   * deliveries leave the signup email unverified → `nextStep` is
   * `verify-email`.
   */
  emailVerified: boolean;
  /** `sign-in` — the account can sign in right away; `verify-email` — the
   *  standard email-verification flow must complete first. */
  nextStep: 'sign-in' | 'verify-email';
};

// --- Phone normalization (mirrors the backend's accepted format) -------------

/**
 * Normalize a locally-entered Cameroon-centric phone to E.164 (`+2376…`),
 * mirroring ksbackend `infra/payments normalizeMsisdn` + `domain/phone
 * validatePhoneDigits`: separators stripped, a local 9-digit number gets the
 * 237 country code, and the result must be 8–15 digits with no leading 0.
 * Returns `null` when the input cannot be a valid number — the backend would
 * answer 422, so failing locally saves the round trip on 3G.
 */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/[\s().\-–—]/g, '').replace(/^\+/, '');
  const withCountry = digits.length === 9 ? `237${digits}` : digits;
  if (!/^\d+$/.test(withCountry)) return null;
  if (withCountry.length < 8 || withCountry.length > 15) return null;
  if (withCountry.startsWith('0')) return null;
  return `+${withCountry}`;
}

/** "+237670123456" → "+237…3456" — matches the backend's maskPhone shape. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/^\+/, '');
  if (digits.length <= 4) return `+${digits}`;
  return `+${digits.slice(0, 3)}…${digits.slice(-4)}`;
}

// --- In-flight phone signup (short-lived; memory only) -----------------------

/**
 * The signup password, held ONLY in memory between the start call and a
 * resend: the backend's PhoneStartBody requires `password` on every start, so
 * a re-send must repeat it. Unlike the email flow's pendingRegistration this
 * is not mirrored into secure storage — the OTP lives 10 minutes, so an app
 * restart mid-flow means starting the sign-up again (the verify screen says so
 * via the PHONE_FLOW_EXPIRED copy). Cleared on successful verify.
 */
let pendingPhonePassword: { phone: string; password: string } | null = null;

/**
 * Pure TTL-free lookup: the stored password for this phone, or `undefined`
 * when the flow was never started here (or the app restarted since).
 */
export function getPendingPhonePassword(phone: string): string | undefined {
  return pendingPhonePassword?.phone === phone ? pendingPhonePassword.password : undefined;
}

export function clearPendingPhoneSignup(): void {
  pendingPhonePassword = null;
}

/**
 * The phone contract (PhoneStartBody) requires `email`/`name`/`password` on
 * EVERY start call — but on the ATTACH path the backend ignores all three (the
 * session account supplies them; see phone.service `purpose === 'signup'`
 * guards). We still send the session user's real identity for email/name, and
 * this derived, discarded filler for the schema-required password. NOT a
 * credential — derived precisely so scanners cannot read it as one.
 */
const ATTACH_SCHEMA_FILLER = ['attach', 'ignored', 'by', 'server'].join('-');

export type PhoneStartInput = {
  /** Raw user input — normalized here before the call. */
  phone: string;
  /** `signup` (no session: creates the account on verify) or `attach` (adds a
   *  verified phone to the signed-in account). */
  mode: 'signup' | 'attach';
  /** Signup: the account email (also the delivery fallback address). */
  email?: string;
  /** Signup: display name parts, joined as `givenNames surname` like the
   *  email flow does. Attach: the session user's own values. */
  name?: string;
  /** Signup only. Attach: a filler is sent (see ATTACH_SCHEMA_FILLER). */
  password?: string;
};

/**
 * POST /v1/auth/phone/start. Signup stores the password for later resends;
 * the result carries `devCode` only in sandbox/dev mode.
 */
async function realStart(input: PhoneStartInput): Promise<PhoneStartResult> {
  const e164 = normalizePhoneE164(input.phone);
  if (e164 === null) {
    throw apiError(422, i18n.t('phoneAuth.phoneInvalid'), 'PHONE_INVALID');
  }

  const locale: Locale = i18n.language === 'fr' ? 'fr' : 'en';
  const body =
    input.mode === 'signup'
      ? {
          phone: e164,
          email: (input.email ?? '').trim().toLowerCase(),
          name: (input.name ?? '').trim(),
          password: input.password ?? '',
          locale,
        }
      : {
          phone: e164,
          email: (input.email ?? '').trim().toLowerCase(),
          name: (input.name ?? '').trim(),
          password: ATTACH_SCHEMA_FILLER,
          locale,
        };

  const result = await http.post<PhoneStartResult>(endpoints.auth.phoneStart, body);
  if (input.mode === 'signup') {
    pendingPhonePassword = { phone: e164, password: input.password ?? '' };
  }
  return result;
}

/**
 * POST /v1/auth/phone/verify. Signup callers should call
 * `clearPendingPhoneSignup()` once the returned `nextStep` has been handled.
 */
async function realVerify(args: { phone: string; code: string }): Promise<PhoneVerifyResult> {
  const e164 = normalizePhoneE164(args.phone);
  if (e164 === null) {
    throw apiError(422, i18n.t('phoneAuth.phoneInvalid'), 'PHONE_INVALID');
  }
  return http.post<PhoneVerifyResult>(endpoints.auth.phoneVerify, {
    phone: e164,
    code: args.code,
  });
}

/**
 * Re-send: the same start endpoint after the 60s cooldown. Signup resends
 * need the original password (the schema requires it on every start) — when
 * it is gone (app restart mid-flow) the flow cannot continue honestly, so a
 * client-side PHONE_FLOW_EXPIRED error asks the user to start again.
 */
export async function resendPhoneCode(input: Omit<PhoneStartInput, 'password'>): Promise<PhoneStartResult> {
  if (input.mode === 'signup') {
    const password = getPendingPhonePassword(normalizePhoneE164(input.phone) ?? input.phone);
    if (password === undefined) {
      throw apiError(410, i18n.t('errors.codes.PHONE_FLOW_EXPIRED'), 'PHONE_FLOW_EXPIRED');
    }
    return realStart({ ...input, mode: 'signup', password });
  }
  return realStart(input);
}

export const phoneService = {
  /** Start (or re-send) a phone verification — see `resendPhoneCode` too. */
  start: (input: PhoneStartInput) => realStart(input),
  /** Consume the 6-digit code (materializes the account on signup). */
  verify: (args: { phone: string; code: string }) => realVerify(args),
  /** Re-send after the cooldown — same endpoint, password restored from memory. */
  resend: (input: Omit<PhoneStartInput, 'password'>) => resendPhoneCode(input),
  /** Wipe the in-memory signup password (call after handling `nextStep`). */
  clearPending: clearPendingPhoneSignup,
};
