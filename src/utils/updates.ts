import * as Updates from 'expo-updates';

import { logger } from './logger';

/**
 * Minimum delay between OTA update checks — AppState fires `active` on every
 * app switch, so the hook throttles with this interval (network courtesy; the
 * update server is polled at most once per foreground session per 15 minutes).
 */
export const UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Ask the update server for a newer OTA bundle and download it when found.
 *
 * Silent by design: a downloaded bundle is applied on the NEXT cold start,
 * never via an in-session reload — restarting the app out from under an
 * active booking or payment would be worse than running one bundle behind.
 *
 * Returns `true` when a newer bundle was downloaded (pending restart).
 * No-op (`false`) when OTA updates aren't configured — Expo Go, dev clients
 * without the native module, or before `expo.updates.url` is set (README →
 * "Over-the-air updates"); every expo-updates call stays dormant there.
 */
export async function checkAndDownloadUpdate(): Promise<boolean> {
  if (!Updates.isEnabled) return false;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return false;
    logger.info('updates', 'New OTA bundle found — downloading');
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      logger.info('updates', 'OTA bundle downloaded — applies on next app start');
      return true;
    }
  } catch (error) {
    // Updates are a background nicety: a failed check must never surface to
    // the user. Logged only (Sentry picks it up once a DSN is configured).
    logger.warn('updates', 'Update check failed', error);
  }
  return false;
}
