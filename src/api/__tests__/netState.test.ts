import { isOnlineState, isOnline, resetNetState, subscribeOnline } from '../netState';

// Hoisted factory may only reference `mock`-prefixed variables.
const mockListeners: ((state: Record<string, unknown>) => void)[] = [];
let mockUnsubCalls = 0;

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (callback: (state: Record<string, unknown>) => void) => {
      mockListeners.push(callback);
      return () => {
        mockUnsubCalls += 1;
      };
    },
  },
}));

describe('isOnlineState — the connectivity rule', () => {
  it.each([
    [{ isConnected: true, isInternetReachable: true }, true],
    [{ isConnected: true, isInternetReachable: null }, true], // unknown = optimistic
    [{ isConnected: true, isInternetReachable: false }, false], // captive portal / no DNS
    [{ isConnected: false, isInternetReachable: null }, false],
    [{ isConnected: null, isInternetReachable: null }, false],
    [{}, false],
  ] as const)('%j → %j', (state, expected) => {
    expect(isOnlineState(state)).toBe(expected);
  });
});

describe('netState snapshot (sync read for the http client)', () => {
  beforeEach(() => {
    resetNetState();
    mockListeners.length = 0;
    mockUnsubCalls = 0;
  });

  it('starts optimistic (online) before any event arrives', () => {
    expect(isOnline()).toBe(true);
  });

  it('follows connectivity events from the NetInfo subscription', () => {
    const unsubscribe = subscribeOnline(() => {});
    expect(mockListeners).toHaveLength(1);

    mockListeners[0]({ isConnected: false, isInternetReachable: null });
    expect(isOnline()).toBe(false);

    mockListeners[0]({ isConnected: true, isInternetReachable: false });
    expect(isOnline()).toBe(false);

    mockListeners[0]({ isConnected: true, isInternetReachable: true });
    expect(isOnline()).toBe(true);

    unsubscribe();
  });

  it('opens exactly ONE NetInfo subscription no matter how many listeners attach', () => {
    const unsub1 = subscribeOnline(() => {});
    const unsub2 = subscribeOnline(() => {});
    const unsub3 = subscribeOnline(() => {});
    expect(mockListeners).toHaveLength(1);
    unsub1();
    unsub2();
    unsub3();
  });

  it('notifies every attached listener with the derived online value', () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeOnline((value) => seen.push(value));

    mockListeners[0]({ isConnected: false, isInternetReachable: null });
    mockListeners[0]({ isConnected: true, isInternetReachable: true });

    expect(seen).toEqual([false, true]);
    unsubscribe();
  });

  it('detaching a listener does NOT tear down the shared subscription', () => {
    const unsubscribe = subscribeOnline(() => {});
    unsubscribe();
    expect(mockUnsubCalls).toBe(0);
    expect(mockListeners).toHaveLength(1); // kept — the http client snapshot needs it

    mockListeners[0]({ isConnected: false, isInternetReachable: false });
    expect(isOnline()).toBe(false);
  });

  it('resetNetState unsubscribes and restores the optimistic default', () => {
    subscribeOnline(() => {});
    mockListeners[0]({ isConnected: false, isInternetReachable: null });
    expect(isOnline()).toBe(false);

    resetNetState();
    expect(mockUnsubCalls).toBe(1);
    expect(isOnline()).toBe(true);
  });
});
