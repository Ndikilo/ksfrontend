import { render } from '@testing-library/react-native';
import { StyleSheet, View } from 'react-native';

import { spacing, ThemeProvider } from '@/theme';
import { env } from '@/config/env';
// Side-effect import: initializes i18n so `t()` resolves real copy (the app's
// provider chain does this; this file's imports otherwise never touch it).
import '@/i18n';
import { MockAuthBanner } from '../MockAuthBanner';

// No SafeAreaProvider in these tests — pin the inset the banner must apply.
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 0, left: 0, right: 0 }),
}));

// The icon package drags in expo-font/expo-asset native modules — stub it and
// capture props so icon rules are assertable.
const mockIconProps: { name?: string; size?: number }[] = [];
jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: { name?: string; size?: number }) => {
    mockIconProps.push(props);
    return null;
  },
}));

// env is read at render time (not import-evaluated), so per-test overrides work.
const setMockAuth = (value: boolean) => {
  (env as { mockAuth: boolean }).mockAuth = value;
};

describe('MockAuthBanner', () => {
  afterEach(() => {
    setMockAuth(false);
    mockIconProps.length = 0;
  });

  it('renders nothing when mock auth is off (the committed default)', () => {
    setMockAuth(false);
    const { queryByText } = render(
      <ThemeProvider>
        <MockAuthBanner />
      </ThemeProvider>,
    );
    expect(queryByText(/DEMO MODE/)).toBeNull();
    expect(mockIconProps).toHaveLength(0);
  });

  it('renders the localized demo warning when mock auth is on', () => {
    setMockAuth(true);
    const { getByText, UNSAFE_getByType } = render(
      <ThemeProvider>
        <MockAuthBanner />
      </ThemeProvider>,
    );
    expect(getByText(/DEMO MODE/)).toBeTruthy();
    expect(UNSAFE_getByType(View)).toBeTruthy();
  });

  it('applies the top safe-area inset so content never renders at y=0', () => {
    setMockAuth(true);
    const { UNSAFE_getAllByType } = render(
      <ThemeProvider>
        <MockAuthBanner />
      </ThemeProvider>,
    );
    const [container] = UNSAFE_getAllByType(View);
    const flat = StyleSheet.flatten(container.props.style);
    expect(flat.paddingTop).toBe(47 + spacing.md);
  });
});
