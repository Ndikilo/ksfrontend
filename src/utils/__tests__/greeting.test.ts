import { firstNameOf, greetingBucket, greetingBucketForDate } from '../greeting';

/**
 * P8.T1 greeting windows. Buckets: morning 05:00–11:59, afternoon
 * 12:00–17:59, evening 18:00–04:59 — pinned at every boundary (whole hours
 * plus the minute edges the contract calls out).
 */
describe('greetingBucket (P8.T1)', () => {
  it('morning covers 05:00 through 11:59', () => {
    expect(greetingBucket(5)).toBe('morning');
    expect(greetingBucket(8)).toBe('morning');
    expect(greetingBucket(11)).toBe('morning');
  });

  it('12:00 flips morning → afternoon (11:59 stays morning)', () => {
    expect(greetingBucket(11)).toBe('morning');
    expect(greetingBucket(12)).toBe('afternoon');
  });

  it('afternoon covers 12:00 through 17:59', () => {
    expect(greetingBucket(12)).toBe('afternoon');
    expect(greetingBucket(15)).toBe('afternoon');
    expect(greetingBucket(17)).toBe('afternoon');
  });

  it('18:00 flips afternoon → evening (17:59 stays afternoon)', () => {
    expect(greetingBucket(17)).toBe('afternoon');
    expect(greetingBucket(18)).toBe('evening');
  });

  it('evening wraps past midnight to 04:59', () => {
    expect(greetingBucket(18)).toBe('evening');
    expect(greetingBucket(23)).toBe('evening');
    expect(greetingBucket(0)).toBe('evening');
    expect(greetingBucket(4)).toBe('evening');
  });

  it('05:00 flips evening → morning (04:59 stays evening)', () => {
    expect(greetingBucket(4)).toBe('evening');
    expect(greetingBucket(5)).toBe('morning');
  });

  it('reads a Date in DEVICE-LOCAL time (a greeting is the user’s moment, not the clinic clock)', () => {
    // Constructed with local-time components, so getHours() returns them
    // regardless of the machine's timezone.
    expect(greetingBucketForDate(new Date(2026, 5, 10, 7, 59))).toBe('morning');
    expect(greetingBucketForDate(new Date(2026, 5, 10, 13, 0))).toBe('afternoon');
    expect(greetingBucketForDate(new Date(2026, 5, 10, 20, 30))).toBe('evening');
  });
});

describe('firstNameOf (P8.T1 — first name from the session full name)', () => {
  it('takes the first whitespace token of the full name', () => {
    expect(firstNameOf('Ada Nkotto')).toBe('Ada');
    expect(firstNameOf('Jean-Paul Emile Mbarga')).toBe('Jean-Paul');
  });

  it('tolerates stray whitespace', () => {
    expect(firstNameOf('  Ada   Nkotto ')).toBe('Ada');
  });

  it('falls back to empty when the session has no usable name', () => {
    expect(firstNameOf(null)).toBe('');
    expect(firstNameOf(undefined)).toBe('');
    expect(firstNameOf('   ')).toBe('');
  });
});
