import type { Appointment } from '@/types';

/**
 * Shared appointment-list presentation (patient tab + practitioner agenda).
 * Pure so both screens and their tests exercise the exact same rules.
 */

const ACTIVE_STATUSES = new Set(['pending', 'confirmed']);

/** Maps the lifecycle status to a localized label key + badge tone. */
export const statusPresentation = (
  status: Appointment['status'],
): { key: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' } => {
  switch (status) {
    case 'pending':
      return { key: 'statusPending', tone: 'warning' };
    case 'confirmed':
      return { key: 'statusConfirmed', tone: 'success' };
    case 'cancelled':
      return { key: 'statusCancelled', tone: 'neutral' };
    case 'completed':
      return { key: 'statusCompleted', tone: 'primary' };
    default:
      return { key: 'statusNoShow', tone: 'danger' };
  }
};

/** Split a booking list into upcoming (future, still active) and past — pure. */
export const splitAppointments = (
  appointments: readonly Appointment[],
  nowMs: number,
): { upcoming: Appointment[]; past: Appointment[] } => {
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];
  for (const appointment of appointments) {
    // A cancelled/finished booking is history even if its start is still ahead.
    if (ACTIVE_STATUSES.has(appointment.status) && Date.parse(appointment.startsAt) > nowMs) {
      upcoming.push(appointment);
    } else {
      past.push(appointment);
    }
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt)); // soonest first
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt)); // most recent first
  return { upcoming, past };
};
