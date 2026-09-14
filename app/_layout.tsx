import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/theme';

// Keep the native splash visible until the in-app splash screen takes over,
// so there's no white flash between them.
void SplashScreen.preventAutoHideAsync();

/**
 * Root route. Wraps the whole app in global providers, then renders the
 * navigator. Auth-gating and the splash decision live in the routes
 * themselves — this file only composes providers + the stack.
 */
export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'Not found' }} />
      </Stack>
    </>
  );
}
