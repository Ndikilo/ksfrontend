import { ColorScheme, darkColors, lightColors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { layout, spacing } from './spacing';
import { fontSize, fontWeight, typography } from './typography';

/**
 * A Theme is the single object handed to every component through context.
 * Only `colors` differs between light and dark; the rest of the scale is shared.
 */
export type Theme = {
  scheme: 'light' | 'dark';
  colors: ColorScheme;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: typeof typography;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  layout: typeof layout;
};

const shared = {
  spacing,
  radius,
  shadows,
  typography,
  fontSize,
  fontWeight,
  layout,
} as const;

export const lightTheme: Theme = { scheme: 'light', colors: lightColors, ...shared };
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors, ...shared };

export const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark' ? darkTheme : lightTheme;
