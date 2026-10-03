import { isOnlineState, isOnline, resetNetState, startNetState } from '../netState';

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
    startNetState();
    expect(mockListeners).toHaveLength(1);

    mockListeners[0]({ isConnected: false, isInternetReachable: null });
    expect(isOnline()).toBe(false);

    mockListeners[0]({ isConnected: true, isInternetReachable: false });
    expect(isOnline()).toBe(false);

    mockListeners[0]({ isConnected: true, isInternetReachable: true });
    expect(isOnline()).toBe(true);
  });

  it('subscribes only once (idempotent start)', () => {
    startNetState();
    startNetState();
    startNetState();
    expect(mockListeners).toHaveLength(1);
  });

  it('resetNetState unsubscribes and restores the optimistic default', () => {
    startNetState();
    mockListeners[0]({ isConnected: false, isInternetReachable: null });
    expect(isOnline()).toBe(false);

    resetNetState();
    expect(mockUnsubCalls).toBe(1);
    expect(isOnline()).toBe(true);
  });
});
