import * as SecureStore from 'expo-secure-store';

import { logger } from './logger';

/**
 * Secure key/value storage backed by the device keychain/keystore.
 * Use this for anything sensitive (auth tokens, PII). It fails soft: a read
 * error resolves to `null` and a write error is logged rather than thrown, so
 * storage hiccups never crash a screen.
 */
export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error('storage', `Failed to read "${key}"`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('storage', `Failed to write "${key}"`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('storage', `Failed to delete "${key}"`, error);
    }
  },

  /** Convenience helpers for JSON payloads. */
  async getJSON<T>(key: string): Promise<T | null> {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await this.set(key, JSON.stringify(value));
  },
};
