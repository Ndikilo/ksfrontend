import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useTranslation } from 'react-i18next';

import { OfflineBanner } from '@/components/feedback';
import { useUpdateCheck } from '@/hooks';
import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/theme';
import { initSentry } from '@/utils/sentry';

// Error reporting first: capture even early render crashes once configured.
// No-op until a DSN is set in app.json > expo.extra.sentryDsn.
initSentry();

// Keep the native splash visible until the in-app splash screen takes over,
// so there's no white flash between them.
void SplashScreen.preventAutoHideAsync();

/**
 * Root route. Wraps the whole app in global providers, then renders the
 * navigator. Auth-gating and the splash decision live in the routes
 * themselves — this file only composes providers + the stack.
 */
export default function RootLayout() {
  // Silent OTA update checks (launch + foreground, throttled) — no-op until
  // expo.updates.url is configured; downloaded bundles apply on next start.
  useUpdateCheck();
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <OfflineBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="practice" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="+not-found"
          options={{ headerShown: true, title: t('notFound.headerTitle') }}
        />
      </Stack>
    </>
  );
}
