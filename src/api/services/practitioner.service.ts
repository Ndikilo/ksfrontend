import i18n from '@/i18n';
import type {
  CredentialsSubmissionInput,
  MyPractitioner,
  PractitionerRegistrationInput,
  PractitionerVerification,
  PresignedUpload,
  VerificationDocumentKind,
} from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/**
 * Practitioner onboarding & verification API (P7.T4), mirroring the ksbackend
 * `practitioner` module:
 *
 *   1. `POST /v1/practitioners/register`      → profile in `incomplete` + the
 *      doctor/nurse role grant (the console route guard then routes /practice).
 *   2. `POST /v1/practitioners/me/documents/presign` → `{ url, key }` per
 *      document; the raw bytes go to `url` with a plain PUT (no auth header —
 *      the URL is the credential), the `key` is kept for step 3.
 *   3. `POST /v1/practitioners/me/credentials` → numbers + the three keys;
 *      moves the profile to `pending_verification` (409 = licence taken,
 *      state not submittable, or `FILE_SCAN_INCOMPLETE` — the last is
 *      retryable once the malware scan reports clean).
 *   4. `GET  /v1/practitioners/me/verification` → status, documents, latest
 *      decision (the rejection reason when present) and `canResubmit`.
 */

export const practitionerService = {
  /** Step 1 — register the signed-in user as a practitioner. */
  register: (input: PractitionerRegistrationInput) =>
    http.post<MyPractitioner>(endpoints.practitioners.register, input),

  /** The signed-in practitioner's own record (404 when not a practitioner). */
  getMine: () => http.get<MyPractitioner>(endpoints.practitioners.myProfile),

  /** The current verification submission + latest admin decision. */
  getVerification: () =>
    http.get<PractitionerVerification>(endpoints.practitioners.myVerification),

  /** Step 2a — presign ONE document upload for `kind`. */
  presignDocument: (kind: VerificationDocumentKind, contentType: string) =>
    http.post<PresignedUpload>(endpoints.practitioners.myDocumentPresign, { kind, contentType }),

  /** Step 2b — PUT the raw file bytes to the presigned URL. Deliberately NOT
   *  the authed axios client: the presigned URL is absolute and
   *  self-authenticating, and forwarding our bearer token to the storage host
   *  would leak it. React Native's fetch uploads a local file when the body is
   *  `{ uri }` (the platform's file-upload extension). */
  uploadDocument: async (url: string, contentType: string, fileUri: string): Promise<void> => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: { uri: fileUri } as unknown as BodyInit,
    });
    if (!response.ok) {
      // Mirror the envelope-client behaviour: a localized, status-shaped error
      // (the storage host does not answer in our error envelope).
      throw {
        status: response.status,
        message: i18n.t(response.status === 413 ? 'errors.tooLarge' : 'errors.generic'),
        source: 'transport',
      };
    }
  },

  /** Step 3 — submit credentials; the response is the `pending_verification` profile. */
  submitCredentials: (input: CredentialsSubmissionInput) =>
    http.post<MyPractitioner>(endpoints.practitioners.myCredentials, input),
};
