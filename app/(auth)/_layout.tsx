import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { tabsRouteForRole, useAuth } from '@/store';

/**
 * Auth group — bounce already-signed-in users straight into the app. A
 * `redirect` param (an in-app path, e.g. `/booking/…` from the booking flow's
 * sign-in gate) is honored so the user resumes what they were doing; anything
 * else falls back to the role's tab group (P7.T1: practitioners land on
 * `/practice`, patients on the patient tabs).
 */
export default function AuthLayout() {
  const { status, session } = useAuth();
  // Params of the focused (auth) screen — login or verify-otp both carry the
  // redirect through their hop of the flow.
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();
  if (status === 'authenticated') {
    // Only absolute in-app paths — never protocol-relative or external URLs.
    const target =
      redirect !== undefined && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : tabsRouteForRole(session?.user.role);
    return <Redirect href={target} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
