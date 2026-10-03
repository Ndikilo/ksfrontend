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
  red300: '#F47074', // lightened red — copy-safe on the dark danger tint (≈5.4:1)
  red700: '#B93035', // darkened red — copy-safe on red100 (≈5.2:1) and white (≈5.9:1)
  green500: '#2FA84F',
  green100: '#E7F6EC',
  green800: '#1F6D33', // darkened green — copy-safe on green100 (≈5.7:1) and white (≈6.4:1)
  amber500: '#E5A50A',
  amber100: '#FCF3DC',
  amber900: '#7A5200', // darkened amber — AA legible as copy on amber100 in light mode
  blue500: '#2F6FE5',
  blue100: '#E4EDFD',
  blue300: '#6C9BF0', // lightened blue — copy-safe on the dark info tint (≈5.4:1)
  blue700: '#2559C4', // darkened blue — copy-safe on blue100 (≈5.4:1) and white (≈6.4:1)
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

  // Status — `*Text` tokens are the copy-safe counterparts of the status
  // colors: WCAG AA (4.5:1) on the matching `*Surface` tint (and plain
  // surfaces) in BOTH themes — darker than the status color in light mode,
  // lighter in dark mode (per DESIGN-STANDARD.md §1).
  danger: string;
  dangerSurface: string;
  dangerText: string;
  success: string;
  successSurface: string;
  successText: string;
  warning: string;
  warningSurface: string;
  /** Copy-safe warning: WCAG AA (4.5:1) on `warningSurface` in BOTH themes —
   *  use for text on the warning tint; `warning` stays for icon/border. */
  warningText: string;
  info: string;
  infoSurface: string;
  infoText: string;
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
  // red500 on red100 is only ≈3.4:1 — copy needs the darkened red (≈5.2:1,
  // and ≈5.9:1 on white for status copy on plain surfaces).
  dangerText: palette.red700,
  success: palette.green500,
  successSurface: palette.green100,
  // green500 on green100 is only ≈2.75:1 — copy AND icon need the darkened
  // green (≈5.7:1) even to clear the 3:1 icon bar.
  successText: palette.green800,
  warning: palette.amber500,
  warningSurface: palette.amber100,
  // amber500 on amber100 is ~1.9:1 — copy needs the darkened amber (≈6.3:1).
  warningText: palette.amber900,
  info: palette.blue500,
  infoSurface: palette.blue100,
  // blue500 on blue100 is only ≈3.9:1 — copy needs the darkened blue (≈5.4:1).
  infoText: palette.blue700,
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
  // Lightened red: red500 is only ≈3.9:1 on the near-black tint (≈5.4:1 with
  // the lighter step). Icons/borders keep `danger` (≥3:1 holds).
  dangerText: palette.red300,
  success: palette.green500,
  successSurface: '#16301F',
  // green500 already reads ≈4.6:1 on the dark tint — no lighter step needed.
  successText: palette.green500,
  warning: palette.amber500,
  warningSurface: '#33290C',
  // Dark surface is near-black: the regular amber already reads at ≈6.6:1.
  warningText: palette.amber500,
  info: palette.blue500,
  infoSurface: '#152744',
  // Lightened blue: blue500 is only ≈3.2:1 on the near-black tint (≈5.4:1
  // with the lighter step). Icons/borders keep `info` (≥3:1 holds).
  infoText: palette.blue300,
};
