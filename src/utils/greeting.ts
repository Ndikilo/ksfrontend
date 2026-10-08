/**
 * Time-of-day greeting support (P8.T1).
 *
 * A greeting speaks about the USER'S moment — "good morning" as they hold the
 * phone — so unlike appointment/slot rendering (`format.ts`, clinic-local
 * Africa/Douala per standard §5) it is deliberately DEVICE-LOCAL: a user in
 * Paris at 07:00 is told "good morning" whatever time it is in Douala. The
 * clinic-timezone rule exists so patients never misread WHEN care happens;
 * a greeting carries no such scheduling meaning.
 */

export type GreetingBucket = 'morning' | 'afternoon' | 'evening';

/**
 * Bucket for a whole clock hour (0–23): morning 05:00–11:59, afternoon
 * 12:00–17:59, evening 18:00–04:59. The minute boundaries (11:59/12:00,
 * 17:59/18:00, 04:59/05:00) are pinned by unit test.
 */
export function greetingBucket(hour: number): GreetingBucket {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/** Bucket for a concrete instant, read in device-local time (see header). */
export function greetingBucketForDate(date: Date): GreetingBucket {
  return greetingBucket(date.getHours());
}

/**
 * First name from the session's full name ("Ada Nkotto" → "Ada"). The auth
 * user carries only `fullName` (better-auth `name`, assembled at registration
 * as "givenNames surname"), so the first whitespace token is the given name.
 * Returns '' when there is nothing usable — the caller then renders a
 * nameless greeting variant.
 */
export function firstNameOf(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] ?? '';
}
