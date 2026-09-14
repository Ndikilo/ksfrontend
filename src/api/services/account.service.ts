import { http } from '../client';
import { endpoints } from '../endpoints';
import type {
  Account,
  CompletePatientProfilePayload,
  Locale,
  PatientProfile,
  Profile,
  ProfilePatch,
} from '@/types';

/**
 * Account & profile API (`/v1/me`, `/v1/patients/me/profile`). The auth user
 * (from better-auth) carries identity; these endpoints carry the product data:
 * locale preference, personal profile, and the patient profile whose creation
 * claims the `patient` role.
 */
export const accountService = {
  /** GET /v1/me — account with roles + locale. */
  me: () => http.get<Account>(endpoints.me.root),

  /** PATCH /v1/me — persist the locale so backend emails match the app. */
  updateLocale: (locale: Locale) => http.patch<{ locale: Locale }>(endpoints.me.root, { locale }),

  /** GET /v1/me/profile — 404 until first created. */
  getProfile: () => http.get<Profile>(endpoints.me.profile),

  /** PATCH /v1/me/profile — partial update of the personal profile. */
  updateProfile: (changes: ProfilePatch) =>
    http.patch<Profile>(endpoints.me.profile, changes),

  /** GET /v1/patients/me/profile — 404 until completed. */
  getPatientProfile: () => http.get<PatientProfile>(endpoints.me.patientProfile),

  /**
   * POST /v1/patients/me/profile — idempotent create; also claims the
   * `patient` role. Requires accepted terms (`acceptTerms: true`).
   */
  completePatientProfile: (payload: CompletePatientProfilePayload) =>
    http.post<PatientProfile>(endpoints.me.patientProfile, payload),
};
