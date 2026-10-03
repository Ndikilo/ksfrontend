import type {
  Appointment,
  AppointmentStatus,
  BookingPolicy,
  CursorPage,
  ID,
  PublicSlot,
} from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/** Body of `POST /v1/appointments` — omit `dependentId` to book for yourself. */
export type BookAppointmentInput = {
  slotId: ID;
  offeringId: ID;
  dependentId?: ID;
};

/** Query params of `GET /v1/appointments` (cursor-paginated, role-aware). */
export type AppointmentsQuery = {
  limit?: number;
  cursor?: string;
  /** `patient` (default): your own + your dependents' bookings. */
  scope?: 'patient' | 'practitioner';
  status?: AppointmentStatus;
};

/** Response of the public availability endpoint (`data` + `{count, from, to}`). */
export type PublicSlotsPage = {
  data: PublicSlot[];
  meta: { count: number; from: string; to: string };
};

/**
 * The booking engine: book a slot, read/move/cancel bookings, and read a
 * practitioner's expanded open slots. Errors arrive localised (the backend
 * answers in our Accept-Language) with stable codes — e.g. `SLOT_TAKEN` when
 * someone else won the slot first.
 */
export const appointmentsService = {
  /** Reserve a slot for yourself or a managed dependent. */
  book: (input: BookAppointmentInput) =>
    http.post<Appointment>(endpoints.appointments.root, input),

  list: (params: AppointmentsQuery = {}) =>
    http.get<CursorPage<Appointment>>(endpoints.appointments.root, { params }),

  get: (id: ID) => http.get<Appointment>(endpoints.appointments.byId(id)),

  /** Move a booking to another slot of the same practitioner (idempotent on the same slot). */
  reschedule: (id: ID, input: { slotId: ID }) =>
    http.post<Appointment>(endpoints.appointments.reschedule(id), input),

  cancel: (id: ID) => http.post<Appointment>(endpoints.appointments.cancel(id)),

  /** A practitioner's expanded open slots inside a window (ISO datetimes). */
  openSlots: (practitionerId: ID, from?: string, to?: string) =>
    http.get<PublicSlotsPage>(endpoints.practitioners.availability(practitionerId), {
      params: { from, to },
    }),

  /** The practitioner's own cancellation policy (notice window + late fee). */
  bookingPolicy: () => http.get<BookingPolicy>(endpoints.practitioners.bookingPolicy),
};
