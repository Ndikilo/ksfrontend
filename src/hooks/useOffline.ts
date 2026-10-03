import { useEffect, useState } from 'react';

import { isOnline, subscribeOnline } from '@/api/netState';

/**
 * Live connectivity for the UI: `true` while the device is offline. Hooks into
 * the single shared NetInfo subscription in `api/netState`, which also feeds
 * the synchronous snapshot the http client reads on failures.
 */
export function useOffline(): boolean {
  // Seed from the snapshot so a consumer mounted after going offline shows
  // the real state immediately (fresh sessions start optimistic).
  const [offline, setOffline] = useState(!isOnline());

  useEffect(() => subscribeOnline((online) => setOffline(!online)), []);

  return offline;
}
