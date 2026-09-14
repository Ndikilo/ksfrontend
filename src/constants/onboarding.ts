import { Images } from './assets';

/**
 * Onboarding slides. Copy lives in the i18n resources under
 * `onboarding.slides.<key>`; here we only bind each slide to its image and key.
 */
export type OnboardingSlide = {
  /** Matches a key under `onboarding.slides` in the translation files. */
  key: 'findCare' | 'book' | 'consult' | 'records';
  image: number;
};

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  { key: 'findCare', image: Images.onboarding.one },
  { key: 'book', image: Images.onboarding.two },
  { key: 'consult', image: Images.onboarding.three },
  { key: 'records', image: Images.onboarding.four },
] as const;

/** Auto-advance interval for the onboarding carousel (ms). */
export const ONBOARDING_AUTOPLAY_MS = 3000;
