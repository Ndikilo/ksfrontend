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

/**
 * The clinic's timezone (design standard §5): every patient-facing appointment
 * time is rendered in it — NOT the device timezone. Slots are expanded against
 * this fixed offset, so a Paris-device user must see the same clock time a
 * Douala patient sees.
 */
export const CLINIC_TIME_ZONE = 'Africa/Douala';

/**
 * Calendar date (`YYYY-MM-DD`) of an instant in the clinic timezone, derived
 * from zoned calendar parts. Use for day keys (grouping, comparisons) — never
 * slice the ISO string, which is UTC.
 */
export const clinicDateKey = (value: string | number | Date): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

/** Like `formatDate`, but pinned to the clinic timezone (see CLINIC_TIME_ZONE). */
export const formatClinicDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string => new Intl.DateTimeFormat(undefined, { ...options, timeZone: CLINIC_TIME_ZONE }).format(new Date(value));

export const capitalize = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);
