import { act, renderHook } from '@testing-library/react-native';

import { isOnline, resetNetState } from '@/api/netState';
import { useOffline } from '../useOffline';

// Hoisted factory may only reference `mock`-prefixed variables.
const mockListeners: ((state: Record<string, unknown>) => void)[] = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (callback: (state: Record<string, unknown>) => void) => {
      mockListeners.push(callback);
      return () => {
        mockListeners.splice(mockListeners.indexOf(callback), 1);
      };
    },
  },
}));

describe('useOffline — the connectivity hook', () => {
  beforeEach(() => {
    resetNetState();
    mockListeners.length = 0;
  });

  it('reports online (false) until NetInfo says otherwise', () => {
    const { result } = renderHook(() => useOffline());
    expect(result.current).toBe(false);
  });

  it('flips to offline when the device disconnects, back on reconnect', () => {
    const { result } = renderHook(() => useOffline());
    expect(mockListeners.length).toBeGreaterThan(0);
    const emit = mockListeners[mockListeners.length - 1];

    act(() => emit({ isConnected: false, isInternetReachable: null }));
    expect(result.current).toBe(true);

    act(() => emit({ isConnected: true, isInternetReachable: true }));
    expect(result.current).toBe(false);
  });

  it('treats connected-but-no-internet (captive portal) as offline', () => {
    const { result } = renderHook(() => useOffline());
    const emit = mockListeners[mockListeners.length - 1];

    act(() => emit({ isConnected: true, isInternetReachable: false }));
    expect(result.current).toBe(true);
  });

  it('keeps feeding the synchronous netState snapshot for the http client', () => {
    renderHook(() => useOffline());

    // The hook calls startNetState() → netState holds its own subscription and
    // receives the same NetInfo event as the hook's listener.
    act(() => mockListeners.forEach((emit) => emit({ isConnected: false, isInternetReachable: false })));
    expect(isOnline()).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useOffline());
    const listenersBefore = mockListeners.length;
    unmount();
    expect(mockListeners.length).toBe(listenersBefore - 1);
  });
});
