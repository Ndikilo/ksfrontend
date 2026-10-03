import { CLINIC_TIME_ZONE, clinicDateKey, formatClinicDate } from '../format';

// Pure formatting helpers — no React, no mocking. Day keys are locale-stable
// (assembled from zoned numeric parts), so exact assertions are safe.
describe('clinic timezone formatting (P4.T1 E5)', () => {
  it('pins the clinic timezone to Africa/Douala', () => {
    expect(CLINIC_TIME_ZONE).toBe('Africa/Douala');
  });

  it('derives the day key from zoned parts, not the UTC instant', () => {
    // 08:00 UTC is 09:00 in Douala (UTC+1) — same calendar day.
    expect(clinicDateKey('2026-06-10T08:00:00.000Z')).toBe('2026-06-10');
    // 23:30 UTC is already 00:30 the NEXT day in Douala — the key must roll over.
    expect(clinicDateKey('2026-06-10T23:30:00.000Z')).toBe('2026-06-11');
    // Far side of the boundary: 22:00 UTC is still 23:00 the same Douala day.
    expect(clinicDateKey('2026-12-31T22:00:00.000Z')).toBe('2026-12-31');
    expect(clinicDateKey('2026-12-31T23:00:00.000Z')).toBe('2027-01-01');
  });

  it('formats in the clinic timezone regardless of the device zone', () => {
    // hourCycle pinned so the assertion is machine-locale-stable; the timezone
    // is the thing under test: 23:30 UTC is 00:30 Douala, never 23:30.
    const hour = formatClinicDate('2026-06-10T23:30:00.000Z', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    expect(hour).toBe('00:30');
  });
});
