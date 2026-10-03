import { act, render } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { resetNetState } from '@/api/netState';
import { spacing, ThemeProvider } from '@/theme';
import { OfflineBanner } from '../OfflineBanner';

// The icon package drags in expo-font/expo-asset native modules — stub it and
// capture props so icon-size/style rules are assertable.
const mockIconProps: { name?: string; size?: number }[] = [];
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { name?: string; size?: number }) => {
    mockIconProps.push(props);
    return null;
  },
}));

// No SafeAreaProvider in these tests — pin the inset the banner must apply.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }),
}));

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
  let announce: jest.SpyInstance;

  beforeEach(() => {
    resetNetState();
    mockListeners.length = 0;
    mockIconProps.length = 0;
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announce.mockRestore();
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

  it('clears the status bar: applies the top safe-area inset itself', () => {
    const { getByText, UNSAFE_root: root } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    emit({ isConnected: false, isInternetReachable: null });

    expect(getByText('You are offline — booking and payments need a connection.')).toBeTruthy();
    const container = root.findByProps({ accessibilityRole: 'alert' });
    const flat = StyleSheet.flatten(container.props.style);
    // Global chrome must never render at y=0 (MAJOR 1, DESIGN-STANDARD.md).
    expect(flat.paddingTop).toBe(47 + spacing.md);
  });

  it('announces the transition to screen readers on going offline', () => {
    const { getByText } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    emit({ isConnected: false, isInternetReachable: null });
    expect(getByText('You are offline — booking and payments need a connection.')).toBeTruthy();
    expect(announce).toHaveBeenCalledWith('You are offline — booking and payments need a connection.');

    // Back online: no announcement. Offline again: announced again.
    emit({ isConnected: true, isInternetReachable: true });
    expect(announce).toHaveBeenCalledTimes(1);
    emit({ isConnected: false, isInternetReachable: null });
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('matches the kit icon size (20) and copies in the AA warningText token', () => {
    const { getByText, UNSAFE_root: root } = render(
      <ThemeProvider>
        <OfflineBanner />
      </ThemeProvider>,
    );
    emit({ isConnected: false, isInternetReachable: null });

    expect(mockIconProps.at(-1)?.size).toBe(20);
    const label = getByText('You are offline — booking and payments need a connection.');
    // Copy color comes from the theme, injected via style — flatten to check.
    const flat = StyleSheet.flatten(label.props.style);
    expect(String(flat.color)).toBe('#7A5200'); // palette.amber900 (light theme AA token)
    // The status color stays for the icon/border accents:
    expect(mockIconProps.at(-1)?.name).toBe('cloud-offline');
    const container = root.findByProps({ accessibilityRole: 'alert' });
    const containerStyle = StyleSheet.flatten(container.props.style);
    expect(String(containerStyle.borderBottomColor)).toBe('#E5A50A'); // palette.amber500
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
