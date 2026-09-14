/** Languages the app supports. Add a new entry here to offer another locale. */
export type LanguageCode = 'en' | 'fr';

export type Language = {
  code: LanguageCode;
  /** Name shown in its own language. */
  label: string;
};

export const LANGUAGES: readonly Language[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const;

export const DEFAULT_LANGUAGE: LanguageCode = 'en';
