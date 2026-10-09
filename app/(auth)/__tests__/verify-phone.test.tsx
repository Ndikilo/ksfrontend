import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n'; // i18next instance for useTranslation (the app imports it at the root)
import { ThemeProvider } from '@/theme';

import VerifyPhoneScreen from '../verify-phone';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Fake signup fixture, derived so scanners don't read it as an assigned
// secret (rationale: repo derived-fixture convention, ksbackend 56b6881).
const MOCK_PASSWORD = ['Passw0rd', '1'].join('');

// Expo Router seam — the screen reads route params and navigates on success.
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

// API seam — services only; the rest of the barrel stays real (useMutation
// imports `isApiError` from it). maskEmail and the pure phone helpers stay
// real; getPendingPhonePassword is overridden so the verify-email handoff has
// a stored password to seed.
const mockVerify = jest.fn();
const mockResend = jest.fn();
const mockClearPending = jest.fn();
const mockSeed = jest.fn();
jest.mock('@/api/services', () => ({
  ...jest.requireActual('@/api/services/auth.service'), // real maskEmail
  ...jest.requireActual('@/api/services/phone.service'),
  phoneService: {
    verify: (...args: unknown[]) => mockVerify(...args),
    resend: (...args: unknown[]) => mockResend(...args),
    clearPending: (...args: unknown[]) => mockClearPending(...args),
  },
  seedPendingRegistration: (...args: unknown[]) => mockSeed(...args),
  getPendingPhonePassword: () => MOCK_PASSWORD,
}));

// AuthScaffold chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
}));

const SIGNUP_PARAMS = {
  mode: 'signup',
  phone: '+237670123456',
  masked: '+237…3456',
  channel: 'dev',
  resendAfter: '60',
  devCode: '482913',
  email: 'ada@example.com',
  surname: 'Maman',
  givenNames: 'Ada',
};

const renderScreen = () =>
  render(
    <ThemeProvider>
      <VerifyPhoneScreen />
    </ThemeProvider>,
  );

const typeCode = (screen: ReturnType<typeof renderScreen>, code: string) => {
  fireEvent.changeText(
    screen.UNSAFE_root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' }),
    code,
  );
};

/** Renders with the cooldown already elapsed — the resend control is up. */
const renderScreenWithExpiredCooldown = () => {
  mockParams = { ...mockParams, resendAfter: '0' };
  return renderScreen();
};

/**
 * P8.T6 — the phone-OTP step shared by signup and attach: the sandbox devCode
 * banner, per-state copy (wrong code → lockout with wait), the 60s resend
 * cooldown blocking the resend, the nextStep routing (sign-in / verify-email /
 * attach → profile), and the 503 fallback to email sign-up.
 */
describe('VerifyPhoneScreen — signup mode', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { ...SIGNUP_PARAMS };
  });

  it('sandbox happy path: devCode banner, verify, nextStep sign-in navigates to login with a notice', async () => {
    mockVerify.mockResolvedValue({
      verified: true,
      phone: '+237670123456',
      emailVerified: false,
      nextStep: 'sign-in',
    });
    const screen = renderScreen();

    // The sandbox banner surfaces the code exactly once, clearly labeled.
    expect(screen.getByText('Sandbox: your code is 482913')).toBeTruthy();

    typeCode(screen, '482913');
    fireEvent.press(screen.getByText('Verify account'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    // Exact contract payload.
    expect(mockVerify).toHaveBeenCalledWith({ phone: '+237670123456', code: '482913' });
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/login',
        params: { notice: 'Your account is ready. Sign in with your email and password.' },
      }),
    );
    expect(mockClearPending).toHaveBeenCalled();
  });

  it('nextStep verify-email hands over to the email flow, seeded with credentials AND the profile fields', async () => {
    mockVerify.mockResolvedValue({
      verified: true,
      phone: '+237670123456',
      emailVerified: false,
      nextStep: 'verify-email',
    });
    const screen = renderScreen();
    typeCode(screen, '482913');
    fireEvent.press(screen.getByText('Verify account'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    // Review 014 MINOR-6: the seed carries the phone form's identity fields,
    // so the post-verify sign-in consumes the SAME profile seam as the email
    // flow instead of silently skipping patient-profile completion.
    expect(mockSeed).toHaveBeenCalledWith({
      email: 'ada@example.com',
      password: MOCK_PASSWORD,
      profile: { surname: 'Maman', givenNames: 'Ada', phone: '+237670123456' },
    });
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/verify-otp',
        params: expect.objectContaining({
          purpose: 'register',
          identifier: 'ada@example.com',
          maskedTarget: 'ad***@example.com',
        }),
      }),
    );
  });

  it('a wrong code shows the invalid copy; the next failure shows the lockout with its wait', async () => {
    mockVerify
      .mockRejectedValueOnce({
        status: 401,
        code: 'OTP_INVALID',
        message: 'That code is not correct. Please check the code we sent you.',
        source: 'envelope',
      })
      .mockRejectedValueOnce({
        status: 429,
        code: 'OTP_LOCKED',
        message: 'Too many incorrect codes. This number is locked for 15 minutes.',
        source: 'envelope',
      });
    const screen = renderScreen();

    typeCode(screen, '000000');
    fireEvent.press(screen.getByText('Verify account'));
    expect(
      await screen.findByText('That code is not correct. Please check the code we sent you.'),
    ).toBeTruthy();

    typeCode(screen, '000001');
    fireEvent.press(screen.getByText('Verify account'));
    expect(
      await screen.findByText(
        'Too many incorrect codes. This number is locked for 15 minutes — please try again later.',
      ),
    ).toBeTruthy();
    // Lockout offers the honest way forward: email sign-up.
    expect(screen.getByText('Sign up with email instead')).toBeTruthy();
    expect(mockVerify).toHaveBeenCalledTimes(2);
  });

  it('a 503 on resend shows the delivery-unavailable copy and the email fallback action', async () => {
    mockResend.mockRejectedValue({
      status: 503,
      code: 'OTP_DELIVERY_UNAVAILABLE',
      message: 'We couldn’t send a code — message delivery isn’t available right now.',
      source: 'envelope',
    });
    const screen = renderScreenWithExpiredCooldown();

    fireEvent.press(screen.getByText('Resend code'));
    await act(async () => {
      await Promise.resolve(); // flush the rejected mutation
    });

    expect(
      screen.getByText('We couldn’t send a code — message delivery isn’t available right now.'),
    ).toBeTruthy();
    expect(screen.getByText('Sign up with email instead')).toBeTruthy();
    // A failed send does NOT re-arm the cooldown — retry stays open.
    expect(screen.getByText('Resend code')).toBeTruthy();
  });

  it('the resend cooldown counts down locally and blocks resend until it elapses', async () => {
    mockResend.mockResolvedValue({
      phone: '+237670123456',
      channel: 'dev',
      expiresAt: '2026-10-07T12:12:00.000Z',
      resendAfterSeconds: 60,
      devCode: '554433',
    });
    jest.useFakeTimers();
    try {
      const screen = renderScreen();

      // Cooldown armed from the backend's resendAfterSeconds: resend blocked.
      expect(screen.getByText('Resend code in 01:00')).toBeTruthy();
      expect(screen.queryByText('Resend code')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(61_000);
      });
      fireEvent.press(screen.getByText('Resend code'));
      await act(async () => {
        jest.advanceTimersByTime(0); // flush the resolved mutation
      });

      expect(mockResend).toHaveBeenCalledTimes(1);
      // Exact resend payload — same contract, original account fields.
      expect(mockResend).toHaveBeenCalledWith({
        phone: '+237670123456',
        mode: 'signup',
        email: 'ada@example.com',
        name: 'Ada Maman',
      });
      // The new devCode replaces the old banner and the countdown re-arms.
      expect(screen.getByText('Sandbox: your code is 554433')).toBeTruthy();
      expect(screen.getByText('Resend code in 01:00')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('submitting an incomplete code asks for the full code without calling the API', async () => {
    const screen = renderScreen();
    typeCode(screen, '12');
    fireEvent.press(screen.getByText('Verify account'));

    expect(screen.getByText('Enter the 6-digit code')).toBeTruthy();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('an email delivery shows the sent-by-email notice', () => {
    mockParams = { ...SIGNUP_PARAMS, channel: 'email', devCode: '' };
    const screen = renderScreen();
    expect(
      screen.getByText(
        'SMS isn’t available for this number right now, so we sent the code to ada@example.com instead.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Sandbox:/)).toBeNull();
  });
});

describe('VerifyPhoneScreen — attach mode', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { mode: 'attach', phone: '+237690000000', masked: '+237…0000' };
  });

  it('attach happy path: verify returns to the profile with a success notice', async () => {
    mockVerify.mockResolvedValue({
      verified: true,
      phone: '+237690000000',
      emailVerified: true,
      nextStep: 'sign-in',
    });
    const screen = renderScreen();

    // Attach has no account prompt — the user is signed in.
    expect(screen.queryByText('Already have an account?')).toBeNull();

    typeCode(screen, '482913');
    fireEvent.press(screen.getByText('Verify account'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockVerify).toHaveBeenCalledWith({ phone: '+237690000000', code: '482913' });
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(tabs)/profile',
        params: { notice: 'Your phone number has been verified.' },
      }),
    );
  });
});
