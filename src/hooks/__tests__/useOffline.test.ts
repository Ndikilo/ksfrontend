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

const lastEmit = () => mockListeners[mockListeners.length - 1];

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
    expect(mockListeners).toHaveLength(1); // rides the ONE shared subscription

    act(() => lastEmit()({ isConnected: false, isInternetReachable: null }));
    expect(result.current).toBe(true);

    act(() => lastEmit()({ isConnected: true, isInternetReachable: true }));
    expect(result.current).toBe(false);
  });

  it('treats connected-but-no-internet (captive portal) as offline', () => {
    const { result } = renderHook(() => useOffline());

    act(() => lastEmit()({ isConnected: true, isInternetReachable: false }));
    expect(result.current).toBe(true);
  });

  it('keeps feeding the synchronous netState snapshot for the http client', () => {
    renderHook(() => useOffline());

    act(() => lastEmit()({ isConnected: false, isInternetReachable: false }));
    expect(isOnline()).toBe(false);
  });

  it('seeds from the snapshot when mounted mid-offline (not the optimistic default)', () => {
    const first = renderHook(() => useOffline());
    act(() => lastEmit()({ isConnected: false, isInternetReachable: null }));
    expect(first.result.current).toBe(true);
    first.unmount();

    // Fresh mount while the device is still offline: show the banner at once.
    const second = renderHook(() => useOffline());
    expect(second.result.current).toBe(true);
  });

  it('shares one NetInfo subscription across consumers; it outlives unmount', () => {
    const a = renderHook(() => useOffline());
    const b = renderHook(() => useOffline());
    expect(mockListeners).toHaveLength(1);

    a.unmount();
    b.unmount();
    // Deliberately kept alive — the http client reads the snapshot on failures.
    expect(mockListeners).toHaveLength(1);
    act(() => lastEmit()({ isConnected: true, isInternetReachable: false }));
    expect(isOnline()).toBe(false);
  });
});
