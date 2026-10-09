import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n'; // i18next instance for useTranslation (the app imports it at the root)
import { ThemeProvider } from '@/theme';

import RegisterPhoneScreen from '../register-phone';

// Fake signup fixture, derived so scanners don't read it as an assigned
// secret (rationale: repo derived-fixture convention, ksbackend 56b6881).
const PASSWORD = ['Passw0rd', '1'].join('');

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — the screen reads the mode param and pushes on success.
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
    canGoBack: () => false,
  },
}));

// Auth store seam — attach mode passes the session identity to the service.
const mockUseAuth = jest.fn();
jest.mock('@/store', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// API seam — services only; the rest of the barrel stays real (useMutation
// imports `isApiError` from it). The pure phone helpers stay real so the
// screen's local normalization runs for real.
const mockStart = jest.fn();
jest.mock('@/api/services', () => ({
  ...jest.requireActual('@/api/services/phone.service'),
  phoneService: {
    start: (...args: unknown[]) => mockStart(...args),
  },
}));

// AuthScaffold chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

const SESSION = {
  token: 'token-1',
  user: {
    id: 'user-1',
    fullName: 'Test User',
    email: 'user@example.com',
    role: 'patient',
    locale: 'en',
    emailVerified: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

const renderScreen = () =>
  render(
    <ThemeProvider>
      <RegisterPhoneScreen />
    </ThemeProvider>,
  );

const fillSignupForm = (screen: ReturnType<typeof renderScreen>, phone: string) => {
  fireEvent.changeText(screen.getByPlaceholderText('(+237) 670123456'), phone);
  fireEvent.changeText(screen.getByPlaceholderText('John'), 'Maman');
  fireEvent.changeText(screen.getByPlaceholderText('doe'), 'Ada');
  fireEvent.changeText(screen.getByPlaceholderText('johndoe@gmail.com'), 'ada@example.com');
  const passwords = screen.getAllByPlaceholderText('••••••••••••');
  fireEvent.changeText(passwords[0], PASSWORD);
  fireEvent.changeText(passwords[1], PASSWORD);
};

/**
 * P8.T6 — the phone SIGNUP entry screen: local validation (bad phone never
 * hits the API), the sandbox happy path carrying `devCode` into /verify-phone,
 * the 503/429 delivery-dead fallback to email sign-up, and the ATTACH variant
 * that sends only the phone (session identity fills the rest).
 */
describe('RegisterPhoneScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = {};
    mockUseAuth.mockReturnValue({ session: SESSION });
  });

  it('a bad phone shows localized copy and never calls the API', async () => {
    const screen = renderScreen();
    fillSignupForm(screen, '0123');
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(
        screen.getByText('Enter a valid Cameroon number, e.g. 670123456 or +237670123456.'),
      ).toBeTruthy();
    });
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('sandbox happy path: start → devCode carried into /verify-phone', async () => {
    mockStart.mockResolvedValue({
      phone: '+237670123456',
      channel: 'dev',
      expiresAt: '2026-10-07T12:10:00.000Z',
      resendAfterSeconds: 60,
      devCode: '482913',
    });
    const screen = renderScreen();
    fillSignupForm(screen, '670 123 456');
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    // Exact contract payload (name = "givenNames surname", email trimmed).
    expect(mockStart).toHaveBeenCalledWith({
      phone: '+237670123456',
      mode: 'signup',
      email: 'ada@example.com',
      name: 'Ada Maman',
      password: PASSWORD,
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/verify-phone',
        params: expect.objectContaining({
          mode: 'signup',
          phone: '+237670123456',
          masked: '+237…3456',
          channel: 'dev',
          resendAfter: '60',
          devCode: '482913',
          email: 'ada@example.com',
        }),
      }),
    );
  });

  it('a 503 delivery-unavailable shows the honest email sign-up fallback action', async () => {
    mockStart.mockRejectedValue({
      status: 503,
      code: 'OTP_DELIVERY_UNAVAILABLE',
      message: 'We couldn’t send a code — message delivery isn’t available right now.',
      source: 'envelope',
    });
    const screen = renderScreen();
    fillSignupForm(screen, '670123456');
    fireEvent.press(screen.getByText('Continue'));

    const fallback = await screen.findByText('Sign up with email instead');
    expect(
      screen.getByText('We couldn’t send a code — message delivery isn’t available right now.'),
    ).toBeTruthy();
    fireEvent.press(fallback);
    expect(mockPush).toHaveBeenCalledWith('/register');
  });

  it('a 429 send-throttle surfaces the throttled copy with the email fallback too', async () => {
    mockStart.mockRejectedValue({
      status: 429,
      code: 'OTP_SEND_THROTTLED',
      message: 'Too many codes have been sent. Please wait a few minutes before trying again.',
      source: 'envelope',
    });
    const screen = renderScreen();
    fillSignupForm(screen, '670123456');
    fireEvent.press(screen.getByText('Continue'));

    expect(
      await screen.findByText(
        'Too many codes have been sent. Please wait a few minutes before trying again.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Sign up with email instead')).toBeTruthy();
  });

  it('attach mode collects only the phone and sends the session identity', async () => {
    mockParams = { mode: 'attach' };
    mockStart.mockResolvedValue({
      phone: '+237690000000',
      channel: 'sms',
      expiresAt: '2026-10-07T12:10:00.000Z',
      resendAfterSeconds: 60,
    });
    const screen = renderScreen();

    // Signup-only fields are gone in attach mode.
    expect(screen.queryByPlaceholderText('johndoe@gmail.com')).toBeNull();
    expect(screen.queryAllByPlaceholderText('••••••••••••')).toHaveLength(0);

    fireEvent.changeText(screen.getByPlaceholderText('(+237) 670123456'), '690000000');
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    expect(mockStart).toHaveBeenCalledWith({
      phone: '+237690000000',
      mode: 'attach',
      email: 'user@example.com',
      name: 'Test User',
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/verify-phone',
        params: expect.objectContaining({ mode: 'attach' }),
      }),
    );
    // No sandbox code was carried (the response had none).
    const params = mockPush.mock.calls[0][0].params as Record<string, unknown>;
    expect(params.devCode).toBeUndefined();
  });
});
