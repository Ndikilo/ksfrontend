import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { logger } from './logger';

/**
 * Secure key/value storage. Native builds use the device keychain/keystore.
 * Browsers have no keystore (expo-secure-store's web module is an empty
 * stub), so on web the store degrades to localStorage — the same tradeoff
 * the deployed web demo makes; native never touches it. It fails soft: a
 * read error resolves to `null` and a write error is logged rather than
 * thrown, so storage hiccups never crash a screen.
 */
const webStorage: Storage | null =
  Platform.OS === 'web' && typeof window !== 'undefined' ? window.localStorage : null;

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (webStorage) return webStorage.getItem(key);
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      logger.error('storage', `Failed to read "${key}"`, error);
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (webStorage) {
        webStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      logger.error('storage', `Failed to write "${key}"`, error);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (webStorage) {
        webStorage.removeItem(key);
        return;
      }
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
