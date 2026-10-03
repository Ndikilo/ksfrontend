import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';

/**
 * Last-known connectivity, readable synchronously. The http client's error
 * path is synchronous, so it cannot await NetInfo — this module keeps a
 * continuously-updated snapshot instead (subscribed once by `useOffline`).
 */

let online = true;
let subscription: NetInfoSubscription | null = null;

/** A state counts as online only when connected AND the internet is reachable
 *  (or still unknown — `null` — which is the case right after launch). */
export function isOnlineState(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

/** Subscribe once to connectivity changes (idempotent; `useOffline` calls it). */
export function startNetState(): void {
  if (subscription) return;
  subscription = NetInfo.addEventListener((state) => {
    online = isOnlineState(state);
  });
}

/** Last-known connectivity for synchronous callers (the http client). */
export function isOnline(): boolean {
  return online;
}

/** Test seam: drop the subscription and reset to the optimistic default. */
export function resetNetState(): void {
  subscription?.();
  subscription = null;
  online = true;
}
