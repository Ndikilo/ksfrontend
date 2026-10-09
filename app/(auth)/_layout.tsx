import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { isPractitionerRole, tabsRouteForRole, useAuth } from '@/store';

/**
 * Auth group — bounce already-signed-in users straight into the app. A
 * `redirect` param (an in-app path, e.g. `/booking/…` from the booking flow's
 * sign-in gate) is honored so the user resumes what they were doing — but only
 * for non-practitioner sessions (Review 012 minor 1): role routing wins, so a
 * practitioner completing a patient-flow gate lands on their console instead
 * of a patient-only flow that would 403 at submit. Everyone else falls back to
 * their role's tab group (P7.T1: practitioners on `/practice`, patients on the
 * patient tabs).
 */
export default function AuthLayout() {
  const { status, session } = useAuth();
  // Params of the focused (auth) screen — login or verify-otp both carry the
  // redirect through their hop of the flow. `mode: 'attach'` marks the
  // phone-OTP screens (P8.T6) being used BY a signed-in user (Profile → add a
  // phone number): the redirect below must not bounce them out mid-flow.
  const { redirect, mode } = useLocalSearchParams<{ redirect?: string; mode?: string }>();
  if (status === 'authenticated' && mode !== 'attach') {
    // Deep-return is safe only when it cannot cross the role boundary: safe
    // in-app absolute paths (never protocol-relative or external URLs) for
    // non-practitioners; practitioners always take the role table's answer.
    const safeRedirect =
      !isPractitionerRole(session?.user.role) &&
      redirect !== undefined &&
      redirect.startsWith('/') &&
      !redirect.startsWith('//')
        ? redirect
        : undefined;
    return <Redirect href={safeRedirect ?? tabsRouteForRole(session?.user.role)} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
