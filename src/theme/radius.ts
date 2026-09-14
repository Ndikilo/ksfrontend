/**
 * Border-radius scale. `full` is used for pills and circular avatars.
 * `control` is the shared radius for interactive fields — buttons, inputs,
 * selects, date fields — so they stay consistent from one place.
 */
export const radius = {
  none: 0,
  control: 5,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
