import type { UserRole } from '@/types';

/**
 * Role → navigation decisions for the app shell (P7.T1). Kept pure so the
 * route guards in every layout (splash, auth, patient tabs, practitioner
 * console) share ONE source of truth and the table is unit-tested.
 */

/** Roles that get the practitioner console (`/practice`) instead of the patient tabs. */
const PRACTITIONER_ROLES: ReadonlySet<UserRole> = new Set(['doctor', 'nurse']);

/**
 * True when the signed-in user should land on the practitioner console.
 * Unknown/missing roles map to the patient app — that is also what
 * `authService.mapUser` falls back to, so both layers agree by construction.
 *
 * Admins are deliberately NOT practitioners here: the admin tooling is out of
 * mobile scope for the MVP, and the backend already scopes admins to plain
 * user powers (P3.T4 — no appointment superpowers), so they get the patient
 * app. Recorded as the P7.T1 decision in PROGRESS.md.
 */
export const isPractitionerRole = (role: UserRole | null | undefined): boolean =>
  role !== null && role !== undefined && PRACTITIONER_ROLES.has(role);

/**
 * The tab group a signed-in session should land on: the practitioner console
 * for doctor/nurse, the patient tabs for everyone else (patients, admins,
 * unknown). Used by the splash gate, the auth redirect and the patient-tabs
 * guard, so a role change mid-session moves the user to the right group.
 */
export const tabsRouteForRole = (role: UserRole | null | undefined): string =>
  isPractitionerRole(role) ? '/practice' : '/(tabs)';
