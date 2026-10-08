import type {
  AvailabilityException,
  AvailabilityExceptionInput,
  AvailabilityRule,
  AvailabilityRuleInput,
  ID,
} from '@/types';

import { http } from '../client';
import { endpoints } from '../endpoints';

/**
 * Response of the rules endpoints (`{ data, meta }`). The backend wraps the
 * weekly set in its standard envelope even though it is never paginated.
 */
export type AvailabilityRulesPage = {
  data: AvailabilityRule[];
  meta: { count: number; limit: number; nextCursor: null; hasNextPage: false };
};

/** Same envelope for the (unpaginated by design) exceptions list. */
export type AvailabilityExceptionsPage = {
  data: AvailabilityException[];
  meta: { count: number; limit: number; nextCursor: null; hasNextPage: false };
};

/**
 * The practitioner console's calendar source of truth. The weekly rules run
 * through a single REPLACE endpoint (PUT with the full set — there is no
 * per-rule create/update/delete), while exceptions have real create/delete
 * (an edit is a create + delete composite on the client). Every change here
 * directly reshapes the `rule:{id}:{startsAt}` / `exception:{id}:{startsAt}`
 * slot keys patients book.
 */
export const availabilityService = {
  /** The weekly schedule (the signed-in practitioner's). */
  listRules: () =>
    http.get<AvailabilityRulesPage>(endpoints.practitioners.myAvailabilityRules),

  /** Replace the whole weekly schedule; the response carries the new rule ids. */
  replaceRules: (rules: AvailabilityRuleInput[]) =>
    http.put<AvailabilityRulesPage>(endpoints.practitioners.myAvailabilityRules, { rules }),

  /** Every non-deleted exception, date-ordered. */
  listExceptions: () =>
    http.get<AvailabilityExceptionsPage>(endpoints.practitioners.myAvailabilityExceptions),

  /** Create a date exception (closed day/hours or extra availability). */
  createException: (input: AvailabilityExceptionInput) =>
    http.post<AvailabilityException>(endpoints.practitioners.myAvailabilityExceptions, input),

  /** Remove a date exception — the affected times fall back to the weekly rules. */
  deleteException: (id: ID) =>
    http.delete<void>(endpoints.practitioners.myAvailabilityExceptionById(id)),
};
