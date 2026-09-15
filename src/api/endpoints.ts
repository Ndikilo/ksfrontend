/**
 * Single source of truth for every backend path. Nothing else in the app
 * hard-codes a URL string. Grouped by domain; functions build parameterised
 * paths so IDs are never string-concatenated at call sites.
 *
 * Matches the ksbackend contract:
 *   - `/api/auth/*`  → better-auth (sign-up/sign-in/OTP, bearer tokens)
 *   - `/v1/*`        → feature modules (all require a bearer session)
 */
export const endpoints = {
  auth: {
    signUpEmail: '/api/auth/sign-up/email',
    signInEmail: '/api/auth/sign-in/email',
    signOut: '/api/auth/sign-out',
    /** Returns `{ session, user }` (or `null`) for the current bearer token. */
    getSession: '/api/auth/get-session',
    /** `{ email, type: 'sign-in' | 'email-verification' | 'forget-password' }`. */
    sendVerificationOtp: '/api/auth/email-otp/send-verification-otp',
    /** `{ email, otp }` — confirms a sign-up's emailed code. */
    verifyEmail: '/api/auth/email-otp/verify-email',
    /** `{ email }` — sends the password-reset code. */
    requestPasswordReset: '/api/auth/email-otp/request-password-reset',
    /** `{ email, otp, password }` — sets the new password. */
    resetPassword: '/api/auth/email-otp/reset-password',
  },
  me: {
    /** GET (account) / PATCH (locale). */
    root: '/v1/me',
    /** GET / PATCH personal profile. */
    profile: '/v1/me/profile',
    /** POST (idempotent create) / GET patient profile. */
    patientProfile: '/v1/patients/me/profile',
  },
  reference: {
    professions: '/v1/professions',
    languages: '/v1/languages',
  },
  practitioners: {
    /** Search (offset-paginated). */
    search: '/v1/practitioners',
    /** Public bookable profile of a verified practitioner. */
    byId: (id: string) => `/v1/practitioners/${id}`,
  },
} as const;
