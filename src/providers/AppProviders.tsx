import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/feedback';
import { restoreLanguage } from '@/i18n'; // side-effect import also initializes i18n
import { AuthProvider } from '@/store';
import { ThemeProvider } from '@/theme';

/**
 * Single place that composes every global provider, in the correct order:
 *   Gesture root → Safe area → Error boundary → Theme → Auth.
 * The root layout renders just <AppProviders>, keeping routing files clean.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  // i18n starts on the device language (see @/i18n); apply the saved choice, if any.
  useEffect(() => {
    void restoreLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
