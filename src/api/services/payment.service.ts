import type { ID, Payment, PaymentProvider } from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/** Body of `POST /v1/payments` — which booking, on which rail, debiting which wallet. */
export type InitiatePaymentInput = {
  appointmentId: ID;
  provider: PaymentProvider;
  /** The wallet to debit — local (6XXXXXXXX) or E.164 (+2376XXXXXXXX). */
  payerPhone: string;
};

/**
 * Checkout (P5.T5): create the mobile-money charge for a booking and follow it
 * to a decision. Idempotent server-side — an open charge is returned as-is,
 * and the provider side is keyed on the payment id, so client retries can
 * never double-charge. The charge amount is the booking's price snapshot.
 * Status flows initiated → pending → succeeded | failed; the appointment
 * confirms only when the charge succeeds. A `failed` charge allows a fresh
 * attempt (the retry path); an already `succeeded` charge is 409.
 */
export const paymentsService = {
  /** Start (or idempotently re-drive) the charge for a pending appointment. */
  initiate: (input: InitiatePaymentInput) =>
    http.post<Payment>(endpoints.payments.root, input),

  /**
   * Poll one charge. While the outcome is undecided the backend reconciles
   * with the provider on read (provider trouble never fails the read), so
   * polling this endpoint alone drives the flow.
   */
  get: (id: ID) => http.get<Payment>(endpoints.payments.byId(id)),

  /**
   * The booking's latest charge (receipt data included once succeeded). A 404
   * means "no charge yet" — callers that read this opportunistically should
   * map the 404 to `null` rather than surfacing an error.
   */
  byAppointment: (appointmentId: ID) =>
    http.get<Payment>(endpoints.payments.byAppointment(appointmentId)),
};
