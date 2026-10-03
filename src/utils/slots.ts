import type { PublicSlot } from '@/types';

import { clinicDateKey, formatClinicDate } from './format';

/** A day's worth of open slots, keyed by its clinic-local calendar date. */
export type SlotDay = { key: string; label: string; slots: PublicSlot[] };

/**
 * Group open slots by clinic-local calendar day (design standard §5), soonest
 * first — pure. Shared by the booking picker and the reschedule picker.
 */
export const groupSlotsByDay = (slots: PublicSlot[]): SlotDay[] => {
  const byDay = new Map<string, SlotDay>();
  for (const slot of slots) {
    const key = clinicDateKey(slot.startsAt);
    const day = byDay.get(key) ?? {
      key,
      label: formatClinicDate(slot.startsAt, { weekday: 'short', day: 'numeric', month: 'short' }),
      slots: [],
    };
    day.slots.push(slot);
    byDay.set(key, day);
  }
  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
};
