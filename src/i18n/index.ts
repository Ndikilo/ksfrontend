import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, StorageKeys, type LanguageCode } from '@/constants';
import { storage } from '@/utils';

import en from './locales/en';
import fr from './locales/fr';

/**
 * i18n setup. English is the source of truth; French is type-checked against it.
 * The initial language is deduced from the device (via expo-localization),
 * constrained to what we support, and later overridden by any saved preference.
 */
export const resources = { en: { translation: en }, fr: { translation: fr } } as const;

const SUPPORTED: LanguageCode[] = ['en', 'fr'];

/** The device/OS language, narrowed to a supported code (fallback: default). */
export function getDeviceLanguage(): LanguageCode {
  const code = getLocales()?.[0]?.languageCode ?? DEFAULT_LANGUAGE;
  return SUPPORTED.includes(code as LanguageCode) ? (code as LanguageCode) : DEFAULT_LANGUAGE;
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED,
    interpolation: { escapeValue: false },
    returnNull: false,
    react: { useSuspense: false },
  });
}

/** On startup, apply a previously saved language preference if there is one. */
export async function restoreLanguage(): Promise<void> {
  const stored = await storage.get(StorageKeys.language);
  if (stored && SUPPORTED.includes(stored as LanguageCode) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

/** Switch language everywhere and persist the choice. */
export async function changeAppLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  await storage.set(StorageKeys.language, code);
}

export default i18n;
