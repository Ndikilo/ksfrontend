/**
 * Domain models — the entities the KanaSanté backend exchanges with this app.
 * Field names here are the app-facing names; the API services map to/from the
 * exact wire format (see `api/services/auth.service.ts` for the auth mapping).
 */
export type ID = string;

/** Locales supported by both the app and the backend. */
export type Locale = 'en' | 'fr';

/** Roles the backend can assign (subset is claimed per feature). */
export type UserRole = 'patient' | 'doctor' | 'nurse' | 'dependent' | 'admin';

export type Sex = 'male' | 'female';

/** Signed-in user, mapped from better-auth's user object. */
export type User = {
  id: ID;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  /** Preferred locale stored on the backend (drives localised emails). */
  locale: Locale;
  emailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
};

/** Auth payloads. */
export type Credentials = {
  /** The account email (the backend authenticates by email + password). */
  identifier: string;
  password: string;
};

/** Successful authentication: the bearer token used for every /v1 request. */
export type AuthSession = {
  token: string;
  user: User;
};

/** Profile collected in register step 1. */
export type RegisterProfile = {
  surname: string;
  givenNames: string;
  email: string;
  phone: string;
  /** ISO date string (YYYY-MM-DD). */
  dateOfBirth: string;
  sex: Sex;
};

/** Full register payload (profile + password from step 2). */
export type RegisterPayload = RegisterProfile & { password: string };

/** What an OTP flow is for — controls copy and post-verify navigation. */
export type OtpPurpose = 'register' | 'reset';

/** Where a one-time code was sent (masked for display, e.g. jo***@gmail.com). */
export type OtpChallenge = {
  /** The raw identifier (email) used for verification requests. */
  identifier: string;
  /** Masked version safe to show the user. */
  maskedTarget: string;
  /** Seconds until the code expires. */
  expiresInSeconds: number;
};

/** The OTP entered during a password reset, carried to the final step. */
export type ResetTicket = { otp: string };

/** Personal profile (GET/PATCH /v1/me/profile). */
export type Profile = {
  id: ID;
  userId: ID;
  surname: string;
  givenNames: string;
  phone: string | null;
  dateOfBirth: string | null;
  sex: Sex | null;
  avatarFileKey: string | null;
};

export type ProfilePatch = Partial<
  Pick<Profile, 'surname' | 'givenNames' | 'phone' | 'dateOfBirth' | 'sex' | 'avatarFileKey'>
>;

export type EmergencyContact = {
  name: string;
  phone: string;
  relationship: string;
};

/** Patient profile (POST/GET /v1/patients/me/profile). */
export type PatientProfile = {
  id: ID;
  userId: ID;
  surname: string;
  givenNames: string;
  phone: string | null;
  dateOfBirth: string | null;
  sex: Sex | null;
  emergencyContact: EmergencyContact | null;
};

/** Completing the patient profile also claims the `patient` role. */
export type CompletePatientProfilePayload = {
  surname: string;
  givenNames: string;
  phone?: string;
  dateOfBirth: string;
  sex: Sex;
  /** Version of the terms/consent the user accepted (backend constant). */
  consentVersion: string;
  acceptTerms: true;
  emergencyContact?: EmergencyContact;
};

/** GET /v1/me — the authenticated account (roles live here, not on the auth user). */
export type Account = {
  id: ID;
  email: string;
  name: string;
  roles: UserRole[];
  locale: Locale;
};

/** Reference data (GET /v1/professions, GET /v1/languages). */
export type Profession = {
  id: ID;
  nameEn: string;
  nameFr: string;
  prefixHint: string | null;
};

export type Language = {
  id: ID;
  /** ISO 639-1 code. */
  code: string;
  nameEn: string;
  nameFr: string;
};
