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
 * password lives only in the device keychain and is wiped once used.
 */
type PendingAuth = { email: string; password?: string; profile?: RegisterPayload };

let pendingAuth: PendingAuth | null = null;

async function savePending(next: PendingAuth | null): Promise<void> {
  pendingAuth = next;
  if (next) {
    await storage.setJSON(StorageKeys.pendingRegistration, next);
  } else {
    await storage.remove(StorageKeys.pendingRegistration);
  }
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

  const pending = pendingAuth ?? (await storage.getJSON<PendingAuth>(StorageKeys.pendingRegistration));
  const password = email === pending?.email ? pending?.password : undefined;
  const profile = email === pending?.email ? pending?.profile : undefined;
  if (!password) {
    // Flow restored after an app restart without the stored credentials.
    throw apiError(
      401,
      'Email verified. Please sign in with your password to continue.',
      'SESSION_REQUIRED',
    );
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
 */
async function completePatientProfile(token: string, profile?: RegisterPayload): Promise<void> {
  if (!profile) return;
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
