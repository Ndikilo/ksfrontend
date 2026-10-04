import type { UserRole } from '@/types';

import { isPractitionerRole, tabsRouteForRole } from '../roles';

/** P7.T1 — the role→navigation table every route guard shares. */
describe('roles (P7.T1 shell routing)', () => {
  it.each([
    ['doctor', true],
    ['nurse', true],
    ['patient', false],
    // Admins are out of mobile scope; the backend scopes them to plain-user
    // powers, so they ride the patient app (documented P7.T1 decision).
    ['admin', false],
    ['dependent', false],
  ])('isPractitionerRole(%s) = %s', (role, expected) => {
    expect(isPractitionerRole(role as UserRole)).toBe(expected);
  });

  it('treats a missing/unknown role as the patient app (never the console)', () => {
    expect(isPractitionerRole(null)).toBe(false);
    expect(isPractitionerRole(undefined)).toBe(false);
  });

  it.each([
    ['doctor', '/practice'],
    ['nurse', '/practice'],
    ['patient', '/(tabs)'],
    ['admin', '/(tabs)'],
    [null, '/(tabs)'],
    [undefined, '/(tabs)'],
  ])('tabsRouteForRole(%s) = %s', (role, expected) => {
    expect(tabsRouteForRole(role as never)).toBe(expected);
  });
});
