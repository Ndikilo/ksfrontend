/**
 * App-wide constant values. Group related constants into typed objects so they
 * are discoverable via autocomplete and impossible to typo at call sites.
 */

import { env } from '@/config/env';

/** Keys used with the secure `storage` util. Centralised to avoid collisions. */
export const StorageKeys = {
  authSession: 'auth.session',
  /** Short-lived sign-up payload (email/password/profile) awaiting OTP verify.
   *  The password inside expires (see AppConfig.pendingPasswordTtlMs). */
  pendingRegistration: 'auth.pendingRegistration',
  themePreference: 'settings.theme',
  language: 'settings.language',
  onboardingComplete: 'onboarding.complete',
} as const;

/** Query-param / analytics event names, timeouts, etc. can live here too. */
export const AppConfig = {
  appName: 'Kana Sante',
  supportEmail: env.supportEmail,
  minPasswordLength: 8,
  /**
   * Terms/consent version accepted when completing the patient profile —
   * must match the version the backend validates against ("1.0" in its tests).
   */
  consentVersion: '1.0',
  /** The backend's emailed OTPs expire after 5 minutes. */
  otpExpiresInSeconds: 300,
  /**
   * How long the not-yet-verified registration password may live (in secure
   * storage + memory) before it is wiped — enforced on every use and again on
   * cold start. After expiry the registration still completes via the
   * sign-in fallback (SESSION_REQUIRED).
   */
  pendingPasswordTtlMs: 24 * 60 * 60 * 1000,
} as const;

export { Images, LOGO_ASPECT_RATIO } from './assets';
export {
  CONSULTATION_TYPE_KEYS,
} from './consultation';
export { LANGUAGES, DEFAULT_LANGUAGE, type Language, type LanguageCode } from './languages';
export {
  ONBOARDING_SLIDES,
  ONBOARDING_AUTOPLAY_MS,
  type OnboardingSlide,
} from './onboarding';
