import { act, render } from '@testing-library/react-native';

import { resetNetState } from '@/api/netState';
import { ThemeProvider } from '@/theme';
import { OfflineBanner } from '../OfflineBanner';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Hoisted factory may only reference `mock`-prefixed variables.
const mockListeners: ((state: Record<string, unknown>) => void)[] = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (callback: (state: Record<string, unknown>) => void) => {
      mockListeners.push(callback);
      return () => mockListeners.splice(mockListeners.indexOf(callback), 1);
    },
  },
}));

const emit = (state: Record<string, unknown>) =>
  act(() => mockListeners.forEach((listener) => listener(state)));

describe('OfflineBanner', () => {
  beforeEach(() => {
    resetNetState();
    mockListeners.length = 0;
  });

  it('renders nothing while online', () => {
    const { queryByText } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    expect(queryByText('You are offline — booking and payments need a connection.')).toBeNull();
  });

  it('shows the localized offline copy while offline (alert semantics)', () => {
    const { getByText, UNSAFE_root: root } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    emit({ isConnected: false, isInternetReachable: null });

    expect(getByText('You are offline — booking and payments need a connection.')).toBeTruthy();
    // Alert semantics: announced by screen readers as a live region.
    expect(root.findByProps({ accessibilityRole: 'alert', accessibilityLiveRegion: 'polite' })).toBeTruthy();
  });

  it('hides again once connectivity returns', () => {
    const { getByText, queryByText } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    emit({ isConnected: false, isInternetReachable: null });
    expect(getByText('You are offline — booking and payments need a connection.')).toBeTruthy();

    emit({ isConnected: true, isInternetReachable: true });
    expect(queryByText('You are offline — booking and payments need a connection.')).toBeNull();
  });
});
