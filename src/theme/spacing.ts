/**
 * Spacing scale (4pt grid) and layout constants.
 *
 * Always reference `spacing.md` instead of a magic `16`, so vertical rhythm
 * stays consistent and is tunable from one place.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export type SpacingKey = keyof typeof spacing;

/** Shared layout constants used across screens. */
export const layout = {
  screenPadding: spacing.xl, // 24 — matches the generous side margins in the designs
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
  maxContentWidth: 640,
} as const;
