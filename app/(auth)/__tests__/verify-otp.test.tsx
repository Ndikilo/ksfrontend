import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n'; // i18next instance for useTranslation (the app imports it at the root)
import { ThemeProvider } from '@/theme';

import VerifyOtpScreen from '../verify-otp';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — the screen reads route params and pushes on success.
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    purpose: 'register',
    identifier: 'user@example.com',
    maskedTarget: 'u***@example.com',
  }),
  router: { push: jest.fn(), replace: jest.fn() },
}));

// Auth store seam — only `authenticate` is consumed on success.
jest.mock('@/store', () => ({
  useAuth: () => ({ authenticate: jest.fn() }),
}));

// API seam — services only; the rest of the barrel stays real (useMutation
// imports `isApiError` from it).
jest.mock('@/api/services', () => ({
  authService: {
    verifyRegistration: jest.fn(),
    verifyReset: jest.fn(),
    resendOtp: jest.fn(),
  },
}));

// AuthScaffold chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

/**
 * Pins the Review-003 MAJOR regression fix: every parameterized i18n key this
 * screen renders must be interpolated — a literal "{{...}}" in the tree means
 * a call site forgot its params (standard §2).
 */
describe('VerifyOtpScreen — parameterized copy (P2.T7)', () => {
  const renderScreen = () =>
    render(
      <ThemeProvider>
        <VerifyOtpScreen />
      </ThemeProvider>,
    );

  it('renders the entered-code subtitle with the masked target interpolated', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText(/sent to u\*\*\*@example\.com/)).toBeTruthy();
    expect(queryByText(/{{/)).toBeNull();
  });

  it('verifying an incomplete code shows the length interpolated, never a raw {{length}}', () => {
    const { UNSAFE_root: root, getByText, queryByText } = renderScreen();

    // Type one digit (code.length < OTP_LENGTH) and tap Verify.
    const input = root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' });
    fireEvent.changeText(input, '1');
    fireEvent.press(getByText('Verify account'));

    // The error caption and the field label both carry the interpolated
    // length — the screen's OTP_LENGTH matches what OtpInput announces.
    expect(getByText('Enter the 6-digit code')).toBeTruthy();
    expect(root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' })).toBeTruthy();
    expect(queryByText(/{{/)).toBeNull();
  });
});
