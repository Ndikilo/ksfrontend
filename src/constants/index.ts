/**
 * App-wide constant values. Group related constants into typed objects so they
 * are discoverable via autocomplete and impossible to typo at call sites.
 */

/** Keys used with the secure `storage` util. Centralised to avoid collisions. */
export const StorageKeys = {
  authSession: 'auth.session',
  /** Short-lived sign-up payload (email/password/profile) awaiting OTP verify. */
  pendingRegistration: 'auth.pendingRegistration',
  themePreference: 'settings.theme',
  language: 'settings.language',
  onboardingComplete: 'onboarding.complete',
} as const;

/** Query-param / analytics event names, timeouts, etc. can live here too. */
export const AppConfig = {
  appName: 'Kana Sante',
  supportEmail: 'support@kanasante.example.com',
  minPasswordLength: 8,
  /**
   * Terms/consent version accepted when completing the patient profile —
   * must match the version the backend validates against ("1.0" in its tests).
   */
  consentVersion: '1.0',
  /** The backend's emailed OTPs expire after 5 minutes. */
  otpExpiresInSeconds: 300,
} as const;

export { Images, LOGO_ASPECT_RATIO } from './assets';
export { LANGUAGES, DEFAULT_LANGUAGE, type Language, type LanguageCode } from './languages';
export {
  ONBOARDING_SLIDES,
  ONBOARDING_AUTOPLAY_MS,
  type OnboardingSlide,
} from './onboarding';
