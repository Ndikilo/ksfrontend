import NetInfo, { type NetInfoSubscription } from '@react-native-community/netinfo';

/**
 * Last-known connectivity, readable synchronously. The http client's error
 * path is synchronous, so it cannot await NetInfo — this module keeps a
 * continuously-updated snapshot instead. Exactly ONE NetInfo subscription
 * exists here: UI consumers (`useOffline`) attach cheap listeners to it, and
 * the subscription deliberately outlives them so the snapshot stays fresh for
 * the http client even when no screen is listening.
 */

type OnlineListener = (online: boolean) => void;

let online = true;
let subscription: NetInfoSubscription | null = null;
const listeners = new Set<OnlineListener>();

/** A state counts as online only when connected AND the internet is reachable
 *  (or still unknown — `null` — which is the case right after launch). */
export function isOnlineState(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function ensureSubscription(): void {
  if (subscription) return;
  subscription = NetInfo.addEventListener((state) => {
    online = isOnlineState(state);
    for (const listener of listeners) listener(online);
  });
}

/** Observe connectivity changes via the single shared NetInfo subscription.
 *  Returns an unsubscribe that detaches only the given listener. */
export function subscribeOnline(listener: OnlineListener): () => void {
  ensureSubscription();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Last-known connectivity for synchronous callers (the http client). */
export function isOnline(): boolean {
  return online;
}

/** Test seam: drop the subscription + listeners and restore the optimistic
 *  default. */
export function resetNetState(): void {
  subscription?.();
  subscription = null;
  listeners.clear();
  online = true;
}
