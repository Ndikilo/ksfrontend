/** Small, pure formatting helpers shared across the UI. */

/** "Jane Doe" -> "JD" (used for avatar fallbacks). */
export const initials = (name: string, max = 2): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, max)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

/** Truncate with an ellipsis without cutting mid-render. */
export const truncate = (value: string, length: number): string =>
  value.length <= length ? value : `${value.slice(0, length - 1).trimEnd()}…`;

/** Locale-aware date formatting with a sensible default. */
export const formatDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string => new Intl.DateTimeFormat(undefined, options).format(new Date(value));

export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);
