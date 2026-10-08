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
    requestPasswordReset: ['/api/auth/email-otp/request-password-reset'].join(''),
    /** `{ email, otp, password }` — sets the new password. */
    resetPassword: ['/api/auth/email-otp/reset-password'].join(''),
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
    /** Expanded bookable slots (`from`/`to` ISO params) used by the booking flow. */
    availability: (id: string) => `/v1/practitioners/${id}/availability`,
    /** The signed-in practitioner's cancellation policy (GET / PUT). */
    bookingPolicy: '/v1/practitioners/me/booking-policy',
  },
  dependents: {
    /** Cursor-paginated list of the signed-in user's managed dependents. */
    root: '/v1/dependents',
  },
  appointments: {
    /** POST (book) / GET (role-aware list). */
    root: '/v1/appointments',
    byId: (id: string) => `/v1/appointments/${id}`,
    reschedule: (id: string) => `/v1/appointments/${id}/reschedule`,
    cancel: (id: string) => `/v1/appointments/${id}/cancel`,
  },
  payments: {
    /** POST (checkout) — create/re-attach the charge for an appointment. */
    root: '/v1/payments',
    /** GET — status polling (the payer only). */
    byId: (id: string) => `/v1/payments/${id}`,
    /** GET — the appointment's latest charge + receipt data (payer only). */
    byAppointment: (appointmentId: string) => `/v1/payments/by-appointment/${appointmentId}`,
  },
} as const;
