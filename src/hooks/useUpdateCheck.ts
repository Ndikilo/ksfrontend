import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { UPDATE_CHECK_INTERVAL_MS, checkAndDownloadUpdate } from '@/utils/updates';

/**
 * OTA update checks: once shortly after launch, then every time the app
 * returns to the foreground, throttled to one network call per
 * UPDATE_CHECK_INTERVAL_MS. Silent — no UI, no in-session reload; a
 * downloaded bundle applies on the next cold start (see utils/updates.ts).
 * No-op when OTA updates aren't configured (Expo Go, missing updates.url).
 */
export function useUpdateCheck(): void {
  const lastCheckAt = useRef(0);

  useEffect(() => {
    const maybeCheck = () => {
      const now = Date.now();
      if (now - lastCheckAt.current < UPDATE_CHECK_INTERVAL_MS) return;
      lastCheckAt.current = now;
      void checkAndDownloadUpdate();
    };

    maybeCheck();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') maybeCheck();
    });
    return () => subscription.remove();
  }, []);
}
