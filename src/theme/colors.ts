/**
 * Color primitives (the raw palette) and semantic color roles.
 *
 * Rule of thumb: components should NEVER reference the raw `palette` directly.
 * They consume *semantic* roles (e.g. `colors.primary`, `colors.textMuted`) so
 * that swapping the palette or the light/dark scheme never touches a component.
 */

// ---------------------------------------------------------------------------
// Raw palette — the only place literal hex values are allowed to live.
// ---------------------------------------------------------------------------
export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  // Brand (blue — from the Kana Sante logo)
  brand50: '#EAF0FB',
  brand100: '#D4E1F7',
  brand200: '#A9C3EF',
  brand300: '#7EA4E7',
  brand400: '#5686DE',
  brand500: '#3E6FD4', // primary (the "Continue" blue)
  brand600: '#3159B4',
  brand700: '#274890',
  brand800: '#1C3468',

  // Warm off-white used for onboarding / splash backgrounds
  cream: '#FBF8F1',
  creamAlt: '#F3EEE3',

  // Neutrals
  gray50: '#F8FAFB',
  gray100: '#F1F4F6',
  gray200: '#E3E8EC',
  gray300: '#CBD3DA',
  gray400: '#9AA6B1',
  gray500: '#6B7681',
  gray600: '#4B545D',
  gray700: '#333A41',
  gray800: '#1F252A',
  gray900: '#12171B',

  // Status
  red500: '#E5484D',
  red100: '#FDECEC',
  green500: '#2FA84F',
  green100: '#E7F6EC',
  amber500: '#E5A50A',
  amber100: '#FCF3DC',
  blue500: '#2F6FE5',
  blue100: '#E4EDFD',
} as const;

/**
 * The semantic contract every theme must satisfy. Both the light and dark
 * palettes below are typed against this shape, so a missing role is a
 * compile-time error rather than a runtime surprise.
 */
export type ColorScheme = {
  // Surfaces
  background: string;
  surface: string;
  surfaceAlt: string;
  overlay: string;

  // Content
  text: string;
  textMuted: string;
  textInverted: string;

  // Brand / actions
  primary: string;
  primaryMuted: string;
  onPrimary: string;

  // Lines & separators
  border: string;
  borderStrong: string;

  // Status
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  info: string;
  infoSurface: string;
};

export const lightColors: ColorScheme = {
  background: palette.white,
  surface: palette.white,
  surfaceAlt: palette.gray100,
  overlay: 'rgba(18, 23, 27, 0.45)',

  text: palette.gray900,
  textMuted: palette.gray500,
  textInverted: palette.white,

  primary: palette.brand500,
  primaryMuted: palette.brand100,
  onPrimary: palette.white,

  border: palette.gray200,
  borderStrong: palette.gray300,

  danger: palette.red500,
  dangerSurface: palette.red100,
  success: palette.green500,
  successSurface: palette.green100,
  warning: palette.amber500,
  warningSurface: palette.amber100,
  info: palette.blue500,
  infoSurface: palette.blue100,
};

export const darkColors: ColorScheme = {
  background: palette.gray900,
  surface: palette.gray800,
  surfaceAlt: palette.gray700,
  overlay: 'rgba(0, 0, 0, 0.6)',

  text: palette.gray50,
  textMuted: palette.gray400,
  textInverted: palette.gray900,

  primary: palette.brand400,
  primaryMuted: palette.brand800,
  onPrimary: palette.gray900,

  border: palette.gray700,
  borderStrong: palette.gray600,

  danger: palette.red500,
  dangerSurface: '#3A1D1E',
  success: palette.green500,
  successSurface: '#16301F',
  warning: palette.amber500,
  warningSurface: '#33290C',
  info: palette.blue500,
  infoSurface: '#152744',
};
