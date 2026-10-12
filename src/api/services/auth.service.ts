import { env } from '@/config/env';
import { AppConfig, StorageKeys } from '@/constants';
import i18n from '@/i18n';
import type {
  Account,
  AuthSession,
  Credentials,
  Locale,
  OtpChallenge,
  OtpPurpose,
  RegisterPayload,
  ResetTicket,
  User,
} from '@/types';
import { logger, storage } from '@/utils';

import { http, setAuthToken } from '../client';
import { endpoints } from '../endpoints';
import { apiError, isApiError } from '../httpError';
import { authMock } from './auth.mock';

/**
 * Auth API functions, mapping the app's flows onto the backend's better-auth
 * endpoints (bearer-token auth + email OTP). Every method keeps the same
 * signature the screens already use; when `env.mockAuth` is on the calls
 * resolve locally instead (see `auth.mock.ts`).
 *
 * Flow notes:
 *   - Register: `POST /api/auth/sign-up/email` auto-emails a 6-digit OTP. The
 *     app verifies it (`verify-email`), then signs in with the just-created
 *     credentials to obtain the bearer session, then completes the patient
 *     profile (best-effort — it also claims the `patient` role).
 *   - Sign-in is blocked with 403 `EMAIL_NOT_VERIFIED` until the email is
 *     verified; `login` detects that, sends the OTP and throws so the screen
 *     can route into the verification flow.
 *   - Password reset: request code → enter code → reset with `{email,otp,password}`.
 */

// --- Backend wire shapes (better-auth) ---------------------------------------

type BackendUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  /** better-auth additional field; defaults to "patient" server-side. */
  role?: string | null;
  locale?: string | null;
};

type BackendAuthResponse = { token: string; user: BackendUser };

type BackendSessionResponse = { session: unknown; user: BackendUser } | null;

const asLocale = (value: unknown): Locale => (value === 'fr' ? 'fr' : 'en');

const asRole = (value: unknown): User['role'] => {
  const allowed = ['patient', 'doctor', 'nurse', 'dependent', 'admin'] as const;
  return allowed.find((role) => role === value) ?? 'patient';
};

export function mapUser(raw: BackendUser): User {
  return {
    id: raw.id,
    fullName: raw.name,
    email: raw.email,
    avatarUrl: raw.image ?? undefined,
    role: asRole(raw.role),
    locale: asLocale(raw.locale),
    emailVerified: raw.emailVerified,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

const mapSession = (raw: BackendAuthResponse): AuthSession => ({
  token: raw.token,
  user: mapUser(raw.user),
});

// --- Small pure helpers (shared with screens) --------------------------------

/** Normalise a locally-entered phone number to E.164 (backend requirement). */
export function toE164(phone: string): string {
  const trimmed = phone.replace(/[\s().\-–—]/g, '');
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

/** "johndoe@gmail.com" → "jo*****@gmail.com" — safe to display. */
export function maskEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(3, name.length - 2))}@${domain}`;
}

const challenge = (identifier: string): OtpChallenge => ({
  identifier,
  maskedTarget: maskEmail(identifier),
  expiresInSeconds: AppConfig.otpExpiresInSeconds,
});

// --- In-flight registration (short-lived; survives app restarts) -------------

/**
 * Sign-up data awaiting email verification. Held in memory and mirrored into
 * secure storage so an app restart mid-OTP can still complete the flow. The
 * password lives only in the device keychain and is wiped once used — or once
 * `AppConfig.pendingPasswordTtlMs` has passed since `createdAt` (enforced on
 * every use and again on cold start; see `expirePendingPassword`).
 */
type PendingAuth = {
  email: string;
  password?: string;
  profile?: Partial<RegisterPayload>;
  createdAt?: number;
};

let pendingAuth: PendingAuth | null = null;

/**
 * Pure TTL rule: a pending registration's password is expired when the entry
 * is older than the configured TTL — or carries no `createdAt` at all (a
 * pre-TTL mirror from an older app version must be treated as stale, never
 * trusted with a live password).
 */
export function pendingPasswordExpired(
  entry: PendingAuth | null,
  now: number = Date.now(),
): boolean {
  if (!entry?.password) return false; // nothing to expire
  if (entry.createdAt === undefined) return true; // legacy entry — treat as stale
  return now - entry.createdAt > AppConfig.pendingPasswordTtlMs;
}

/**
 * Wipe the pending password if it is past its TTL. Email/profile are KEPT so
 * the registration can still complete via the sign-in fallback
 * (SESSION_REQUIRED). No-op for fresh or already-passwordless entries. Called
 * on every pending read (auto-expire while running) and once on cold start
 * (from AuthContext's bootstrap — timers don't survive a restart).
 */
export async function expirePendingPassword(now: number = Date.now()): Promise<void> {
  const entry =
    pendingAuth ?? (await storage.getJSON<PendingAuth>(StorageKeys.pendingRegistration));
  if (!entry || !pendingPasswordExpired(entry, now)) return;

  const redacted: PendingAuth = { email: entry.email, profile: entry.profile };
  if (pendingAuth) pendingAuth = redacted; // memory copy only if one exists
  await savePending(redacted); // persist the redaction (fresh timestamp, no password)
}

async function savePending(next: PendingAuth | null): Promise<void> {
  // Stamp createdAt on the MEMORY copy too — the TTL rule treats a missing
  // timestamp as a stale legacy entry, so an unstamped fresh password would
  // be wiped on its very first TTL check.
  pendingAuth = next ? { ...next, createdAt: next.createdAt ?? Date.now() } : null;
  if (next) {
    await storage.setJSON(StorageKeys.pendingRegistration, pendingAuth);
  } else {
    await storage.remove(StorageKeys.pendingRegistration);
  }
}

/**
 * Seed the pending-registration store for an account created OUTSIDE the
 * email sign-up form (P8.T6 phone-OTP signup): after the phone verify returns
 * `nextStep: 'verify-email'`, the standard email-verification flow runs — and
 * with the credentials seeded here it signs straight in after the emailed code
 * instead of falling back to SESSION_REQUIRED (manual sign-in).
 *
 * `profile` carries whatever identity the phone form collected (surname,
 * given names, phone). It is consumed at the SAME seam the email flow
 * consumes its seed (completePatientProfile after the post-verify sign-in),
 * so the phone path does not silently skip patient-profile completion
 * (Review 014 MINOR-6). The user's locale is registered server-side by the
 * phone start call (phone.service realStart posts `locale`), so it needs no
 * separate seed.
 */
export async function seedPendingRegistration(args: {
  email: string;
  password?: string;
  profile?: Partial<RegisterPayload>;
}): Promise<void> {
  await savePending({
    email: args.email.trim(),
    password: args.password,
    profile: args.profile,
  });
}

// --- Real backend calls -------------------------------------------------------

const currentLocale = (): Locale => asLocale(i18n.language);

async function realRegister(payload: RegisterPayload): Promise<OtpChallenge> {
  const email = payload.email.trim();
  await savePending({ email, password: payload.password, profile: payload });

  // Sign-up auto-sends the verification OTP (sendVerificationOnSignUp).
  await http.post<BackendAuthResponse>(endpoints.auth.signUpEmail, {
    name: `${payload.givenNames} ${payload.surname}`.trim(),
    email,
    password: payload.password,
    locale: currentLocale(),
  });
  return challenge(email);
}

async function realVerifyRegistration(args: {
  identifier: string;
  code: string;
}): Promise<AuthSession> {
  const email = args.identifier.trim();
  await http.post(endpoints.auth.verifyEmail, { email, otp: args.code });

  // Auto-expire: a pending password past its TTL is wiped before use, so the
  // lookup below falls into the SESSION_REQUIRED sign-in fallback.
  await expirePendingPassword();
  const pending = pendingAuth ?? (await storage.getJSON<PendingAuth>(StorageKeys.pendingRegistration));
  const password = email === pending?.email ? pending?.password : undefined;
  const profile = email === pending?.email ? pending?.profile : undefined;
  if (!password) {
    // Flow restored after an app restart without the stored credentials.
    // Localized here because this plain throw bypasses the axios interceptor
    // (client.ts) — the only place envelope messages get localized.
    throw apiError(401, i18n.t('errors.codes.SESSION_REQUIRED'), 'SESSION_REQUIRED');
  }

  const session = mapSession(
    await http.post<BackendAuthResponse>(endpoints.auth.signInEmail, { email, password }),
  );
  await savePending(null);
  await completePatientProfile(session.token, profile);
  return session;
}

/**
 * Create the patient profile from the data collected at registration.
 * Best-effort: the account is already usable; a failure here is logged and can
 * be repaired later from the profile screen (POST is idempotent).
 *
 * The backend's CompletePatientProfileBody REQUIRES surname, givenNames,
 * dateOfBirth and sex (zod rejects the rest). The email flow always collects
 * all of them; the phone flow's seed (see seedPendingRegistration) carries
 * names + phone only, so when the required fields are missing the POST is
 * DEFERRED with a logged reason rather than sent to a guaranteed 422 — the
 * profile is then completed from the Profile screen (date of birth + sex are
 * collected there).
 */
async function completePatientProfile(
  token: string,
  profile?: Partial<RegisterPayload>,
): Promise<void> {
  if (!profile) return;
  if (!profile.surname || !profile.givenNames || !profile.dateOfBirth || !profile.sex) {
    logger.warn(
      'auth',
      'Patient profile seed is incomplete (date of birth and sex are required); completion deferred to the profile screen',
    );
    return;
  }
  try {
    setAuthToken(token);
    await http.post(endpoints.me.patientProfile, {
      surname: profile.surname.trim(),
      givenNames: profile.givenNames.trim(),
      phone: profile.phone ? toE164(profile.phone) : undefined,
      dateOfBirth: profile.dateOfBirth.slice(0, 10),
      sex: profile.sex,
      consentVersion: AppConfig.consentVersion,
      acceptTerms: true as const,
    });
  } catch (error) {
    logger.warn('auth', 'Patient profile creation failed; it can be retried later', error);
  }
}

async function realLogin(credentials: Credentials): Promise<AuthSession> {
  const email = credentials.identifier.trim();
  try {
    const session = mapSession(
      await http.post<BackendAuthResponse>(endpoints.auth.signInEmail, {
        email,
        password: credentials.password,
      }),
    );
    await savePending(null); // any stale registration flow is now moot
    return session;
  } catch (error) {
    // better-auth blocks sign-in until the email is verified: send the OTP and
    // keep the credentials so verification can sign straight in afterwards.
    if (isApiError(error) && error.code === 'EMAIL_NOT_VERIFIED') {
      await savePending({ email, password: credentials.password });
      try {
        await realResendOtp({ identifier: email, purpose: 'register' });
      } catch (resendError) {
        // The send budget (3 / 15 min) may be spent — a previously sent code can
        // still be valid, so let the verification screen handle it.
        logger.warn('auth', 'Verification OTP re-send failed', resendError);
      }
    }
    throw error;
  }
}

async function realResendOtp(args: { identifier: string; purpose: OtpPurpose }): Promise<void> {
  const email = args.identifier.trim();
  if (args.purpose === 'reset') {
    await http.post(endpoints.auth.requestPasswordReset, { email });
    return;
  }
  await http.post(endpoints.auth.sendVerificationOtp, { email, type: 'email-verification' });
}

async function realForgotPassword(identifier: string): Promise<OtpChallenge> {
  const email = identifier.trim();
  // Responds { success: true } regardless of account existence (anti-enumeration).
  await http.post(endpoints.auth.requestPasswordReset, { email });
  return challenge(email);
}

/**
 * The reset OTP is validated server-side by the final reset call, so this step
 * is local: it just carries the entered code into the "new password" screen.
 */
async function realVerifyReset(args: { identifier: string; code: string }): Promise<ResetTicket> {
  return { otp: args.code };
}

async function realResetPassword(args: {
  email: string;
  otp: string;
  password: string;
}): Promise<void> {
  await http.post(endpoints.auth.resetPassword, {
    email: args.email.trim(),
    otp: args.otp,
    password: args.password,
  });
}

async function realLogout(): Promise<void> {
  await savePending(null);
  await http.post<{ success: boolean }>(endpoints.auth.signOut);
}

/** Permanent, server-side account deletion — destructive and immediate
 *  (better-auth `deleteUser`, no email round-trip configured server-side).
 *  Unlike logout this RESOLVES only when the server confirmed; a failed call
 *  keeps the session intact so the user can retry (never fake a deleted
 *  account). Local session cleanup stays with AuthContext, as for logout. */
async function realDeleteAccount(): Promise<void> {
  await http.delete<void>(endpoints.auth.deleteAccount);
  await savePending(null);
}

/** Validate the stored bearer token; returns the fresh user or `null`. */
async function realMe(): Promise<User | null> {
  const response = await http.get<BackendSessionResponse>(endpoints.auth.getSession);
  return response?.user ? mapUser(response.user) : null;
}

/** GET /v1/me — account record with roles (richer than the auth user). */
const realAccount = (): Promise<Account> => http.get<Account>(endpoints.me.root);

// --- Public service (mock-aware) ---------------------------------------------

export const authService = {
  login: (credentials: Credentials) =>
    env.mockAuth ? authMock.login(credentials) : realLogin(credentials),

  logout: () => (env.mockAuth ? authMock.logout() : realLogout()),

  /** Permanently delete the signed-in account on the server. */
  deleteAccount: () => (env.mockAuth ? authMock.deleteAccount() : realDeleteAccount()),

  /** Validate a stored session; resolves to the user, or `null` if invalid. */
  me: (): Promise<User | null> => (env.mockAuth ? authMock.me() : realMe()),

  /** The authenticated account (roles/locale) — `/v1/me`. */
  account: (): Promise<Account> => (env.mockAuth ? authMock.account() : realAccount()),

  /** Step 2 of registration: create the account; the backend emails an OTP. */
  register: (payload: RegisterPayload) =>
    env.mockAuth ? authMock.register(payload) : realRegister(payload),

  /** Verify the registration OTP → returns an authenticated session. */
  verifyRegistration: (args: { identifier: string; code: string }) =>
    env.mockAuth ? authMock.verifyRegistration(args) : realVerifyRegistration(args),

  /** Start a password reset: sends an OTP to the account's email. */
  forgotPassword: (identifier: string) =>
    env.mockAuth ? authMock.forgotPassword(identifier) : realForgotPassword(identifier),

  /** Carry the entered reset code to the final "new password" step. */
  verifyReset: (args: { identifier: string; code: string }) =>
    env.mockAuth ? authMock.verifyReset(args) : realVerifyReset(args),

  /** Set a new password using the emailed OTP. */
  resetPassword: (args: { email: string; otp: string; password: string }) =>
    env.mockAuth ? authMock.resetPassword() : realResetPassword(args),

  resendOtp: (args: { identifier: string; purpose: OtpPurpose }) =>
    env.mockAuth ? authMock.resendOtp() : realResendOtp(args),
};
