import { TextStyle } from 'react-native';

/**
 * Type scale. Each variant is a ready-to-spread `TextStyle` (minus color,
 * which the themed `<Text>` component injects so it stays scheme-aware).
 */
export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontSize: fontSize.xxxl, lineHeight: 40, fontWeight: fontWeight.bold },
  title: { fontSize: fontSize.xxl, lineHeight: 34, fontWeight: fontWeight.bold },
  heading: { fontSize: fontSize.xl, lineHeight: 28, fontWeight: fontWeight.semibold },
  subheading: { fontSize: fontSize.lg, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: fontSize.md, lineHeight: 24, fontWeight: fontWeight.regular },
  bodyStrong: { fontSize: fontSize.md, lineHeight: 24, fontWeight: fontWeight.semibold },
  caption: { fontSize: fontSize.sm, lineHeight: 20, fontWeight: fontWeight.regular },
  label: { fontSize: fontSize.xs, lineHeight: 16, fontWeight: fontWeight.medium },
};
