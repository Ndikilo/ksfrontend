import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';

import '@/i18n';
import { Spinner } from '@/components/ui';
import { ThemeProvider } from '@/theme';
import type { Appointment, Payment } from '@/types';

import CheckoutScreen, { MAX_AUTO_POLLS, POLL_INTERVAL_MS } from '../[id]';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — the screen reads the appointment id and navigates.
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'apt-1' }),
  router: {
    get back() {
      return mockBack;
    },
    get replace() {
      return mockReplace;
    },
  },
}));

// API seam — services only (useMutation/useAsync import the barrel for helpers).
const mockGetAppointment = jest.fn();
const mockByAppointment = jest.fn();
const mockInitiate = jest.fn();
const mockGetPayment = jest.fn();
jest.mock('@/api/services', () => ({
  appointmentsService: {
    get: (...args: unknown[]) => mockGetAppointment(...args),
  },
  paymentsService: {
    initiate: (...args: unknown[]) => mockInitiate(...args),
    get: (...args: unknown[]) => mockGetPayment(...args),
    byAppointment: (...args: unknown[]) => mockByAppointment(...args),
  },
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// AppState seam — capture the screen's listener so tests can simulate
// background/foreground transitions (the normal mobile-money flow).
const appStateHandlers = new Set<(state: AppStateStatus) => void>();
const fireAppState = (state: AppStateStatus) => {
  appStateHandlers.forEach((handler) => handler(state));
};

const APPOINTMENT: Appointment = {
  id: 'apt-1',
  patientUserId: 'user-1',
  dependentId: null,
  practitionerProfileId: 'prof-1',
  slotId: 'slot-1',
  consultationOfferingId: 'off-1',
  status: 'pending',
  consultationType: 'in_person',
  startsAt: '2030-01-15T09:00:00.000Z',
  endsAt: '2030-01-15T10:00:00.000Z',
  priceXaf: 5000,
  cancellationNoticeHours: 24,
  cancellationFeeXaf: 2500,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
  // List-only persona names (P7.T1) — single-appointment responses name neither side.
  patientName: null,
  practitionerName: null,
};

const PENDING_CHARGE: Payment = {
  id: 'pay-1',
  appointmentId: 'apt-1',
  provider: 'momo',
  status: 'pending',
  amountXaf: 5000,
  providerChargeId: 'pay-1',
  failureReason: null,
  refundedAt: null,
  receiptNumber: null,
  receiptIssuedAt: null,
  createdAt: '2026-10-03T10:00:00.000Z',
};

const SUCCEEDED_CHARGE: Payment = {
  ...PENDING_CHARGE,
  status: 'succeeded',
  receiptNumber: 'KS-pay-1',
  receiptIssuedAt: '2026-10-03T10:05:00.000Z',
};

const FAILED_CHARGE: Payment = {
  ...PENDING_CHARGE,
  status: 'failed',
  failureReason: 'wallet refused',
};

const REFUNDED_CHARGE: Payment = {
  ...SUCCEEDED_CHARGE,
  status: 'refunded',
  refundedAt: '2026-10-03T10:20:00.000Z',
};

const NO_CHARGE = { status: 404, message: 'Not found', code: 'NOT_FOUND' };

const renderScreen = () =>
  render(
    <ThemeProvider>
      <CheckoutScreen />
    </ThemeProvider>,
  );

/** Drive a fresh checkout into the polling phase (MoMo chosen, phone typed). */
const enterPolling = async (
  screen: ReturnType<typeof renderScreen>,
  phone = '+237690000000',
): Promise<void> => {
  fireEvent.press(await screen.findByText('Choose how to pay'));
  fireEvent.press(await screen.findByText('MoMo'));
  fireEvent.changeText(screen.getByLabelText('Mobile Money number'), phone);
  fireEvent.press(screen.getByText('Pay 5,000 XAF'));
};

/** Fresh pending appointment, no charge yet. */
beforeEach(() => {
  jest.resetAllMocks();
  appStateHandlers.clear();
  mockGetAppointment.mockResolvedValue(APPOINTMENT);
  mockByAppointment.mockRejectedValue(NO_CHARGE);
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    event: string,
    handler: (state: string) => void,
  ) => {
    appStateHandlers.add(handler as (state: AppStateStatus) => void);
    return {
      remove: () =>
        appStateHandlers.delete(handler as (state: AppStateStatus) => void),
    };
  }) as typeof AppState.addEventListener);
});

describe('checkout screen (P5.T5)', () => {
  it('shows the amount, the method sheet, and blocks Pay until method + valid phone', async () => {
    const screen = renderScreen();
    expect(await screen.findByText('5,000 XAF')).toBeTruthy();

    // No method chosen yet → Pay stays disabled.
    expect(screen.getByText('Pay 5,000 XAF')).toBeDisabled();

    // Open the method sheet and pick MoMo.
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('MoMo'));

    // An invalid wallet number is caught before any request fires.
    fireEvent.changeText(screen.getByLabelText('Mobile Money number'), '123');
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));
    expect(
      await screen.findByText('Enter the phone number of the wallet to debit.'),
    ).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('initiates the charge, polls to success, and shows the receipt — ANNOUNCED to screen readers', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    // The first status poll fires immediately on entering the pending phase
    // (the backend reconciles with the provider on read).
    mockGetPayment.mockResolvedValue(SUCCEEDED_CHARGE);

    const screen = renderScreen();
    await enterPolling(screen);

    await waitFor(() =>
      expect(mockInitiate).toHaveBeenCalledWith({
        appointmentId: 'apt-1',
        provider: 'momo',
        payerPhone: '+237690000000',
      }),
    );

    expect(await screen.findByText('Payment received')).toBeTruthy();
    expect(await screen.findByText('KS-pay-1')).toBeTruthy();
    expect(mockGetPayment).toHaveBeenCalledWith('pay-1');
    // The outcome is announced, not only shown (money-flow honesty bar).
    await waitFor(() =>
      expect(announce).toHaveBeenCalledWith('Payment received'),
    );
  });

  it('stops auto-polling at the cap, says so statically, and check-again re-kicks with a fresh budget', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(PENDING_CHARGE); // never decides

    const screen = renderScreen();
    // Pick the method + wallet number, but press Pay only UNDER fake timers so
    // the whole poll lifecycle runs on the clock we control.
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('MoMo'));
    fireEvent.changeText(
      screen.getByLabelText('Mobile Money number'),
      '+237690000000',
    );

    jest.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.press(screen.getByText('Pay 5,000 XAF'));
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(1); // the immediate first check

      for (let i = 0; i < MAX_AUTO_POLLS; i += 1) {
        await act(async () => {
          jest.advanceTimersByTime(POLL_INTERVAL_MS);
        });
      }
      // Hard cap: exactly MAX_AUTO_POLLS reads — the loop is stopped.
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS);

      // The spinner is GONE — a static exhausted state says what happened
      // instead of spinning forever over a stopped loop.
      expect(screen.UNSAFE_queryByType(Spinner)).toBeNull();
      expect(
        screen.getByText('We haven’t received the confirmation yet.'),
      ).toBeTruthy();

      // Time passing changes nothing: the loop is stopped, not hiding.
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS * 5);
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS);

      // Check-again re-kicks: a NEW call (standard retry-pin rule) and the
      // spinner returns — polling is live again, not just re-worded.
      await act(async () => {
        fireEvent.press(screen.getByText('I approved it — check again'));
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS + 1);
      expect(mockGetPayment).toHaveBeenLastCalledWith('pay-1');
      expect(screen.UNSAFE_queryByType(Spinner)).toBeTruthy();

      // The re-kick granted a fresh auto-poll budget: the cadence runs again.
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS + 2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('check-again pins a NEW status call even before the cap (the retry must re-issue)', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(PENDING_CHARGE);

    const screen = renderScreen();
    await enterPolling(screen);

    await waitFor(() => expect(mockGetPayment).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByText('I approved it — check again'));
    await waitFor(() => expect(mockGetPayment).toHaveBeenCalledTimes(2));
    expect(mockGetPayment).toHaveBeenLastCalledWith('pay-1');
  });

  it('backgrounding mid-poll fires nothing; returning to the foreground re-checks once', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(PENDING_CHARGE);

    const screen = renderScreen();
    await enterPolling(screen);
    await waitFor(() => expect(mockGetPayment).toHaveBeenCalledTimes(1));

    // The user left to approve the SIM push: backgrounding is silent.
    await act(async () => {
      fireAppState('background');
    });
    expect(mockGetPayment).toHaveBeenCalledTimes(1);

    // Coming back immediately reconciles — exactly one extra read.
    await act(async () => {
      fireAppState('active');
    });
    await waitFor(() => expect(mockGetPayment).toHaveBeenCalledTimes(2));
    expect(mockGetPayment).toHaveBeenLastCalledWith('pay-1');
  });

  it('foregrounding AFTER the cap re-kicks the live loop (new call + cadence); the honest exhausted state returns if no result lands', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(PENDING_CHARGE); // never decides

    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('MoMo'));
    fireEvent.changeText(
      screen.getByLabelText('Mobile Money number'),
      '+237690000000',
    );

    jest.useFakeTimers();
    try {
      await act(async () => {
        fireEvent.press(screen.getByText('Pay 5,000 XAF'));
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(1); // the immediate first check

      // Burn the auto-poll budget: the loop stops and says so.
      for (let i = 0; i < MAX_AUTO_POLLS; i += 1) {
        await act(async () => {
          jest.advanceTimersByTime(POLL_INTERVAL_MS);
        });
      }
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS);
      expect(screen.UNSAFE_queryByType(Spinner)).toBeNull();
      expect(
        screen.getByText('We haven’t received the confirmation yet.'),
      ).toBeTruthy();

      // Review-010 pin: the user backgrounds past the cap (approving the SIM
      // push is the normal flow) and returns. The 'active' handler must
      // RESTART the chain — a NEW immediate call + the spinner back — never
      // just re-show a spinner over a dead loop.
      await act(async () => {
        fireAppState('active');
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS + 1);
      expect(mockGetPayment).toHaveBeenLastCalledWith('pay-1');
      expect(screen.UNSAFE_queryByType(Spinner)).toBeTruthy();

      // The loop actually TICKS again (fresh cadence), not a one-off check.
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
      });
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS + 2);

      // No decision landed and the re-kicked budget burns out too: the honest
      // exhausted state returns — the cap is still enforced on the new chain.
      for (let i = 0; i < MAX_AUTO_POLLS; i += 1) {
        await act(async () => {
          jest.advanceTimersByTime(POLL_INTERVAL_MS);
        });
      }
      expect(mockGetPayment).toHaveBeenCalledTimes(MAX_AUTO_POLLS * 2);
      expect(screen.UNSAFE_queryByType(Spinner)).toBeNull();
      expect(
        screen.getByText('We haven’t received the confirmation yet.'),
      ).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('resumes a pending/initiated charge into polling without re-initiating (never "sent to .")', async () => {
    mockByAppointment.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(PENDING_CHARGE);

    const screen = renderScreen();
    expect(await screen.findByText('Confirm on your phone')).toBeTruthy();
    // MAJOR 1 regression pin: the resumed record carries NO payer phone, so
    // the phone-free copy renders — the empty {{phone}} interpolation is dead.
    expect(
      screen.getByText(
        'Approve the payment request on your phone. This can take a moment.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/sent to/)).toBeNull();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('a refunded charge gets its own honest outcome (money came back) and no retry', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    mockGetPayment.mockResolvedValue(REFUNDED_CHARGE);

    const screen = renderScreen();
    await enterPolling(screen);

    expect(await screen.findByText('Payment failed')).toBeTruthy();
    expect(
      screen.getByText('Your payment was returned to your wallet.'),
    ).toBeTruthy();
    // "No money was taken" would be FALSE for a refund.
    expect(screen.queryByText(/no money was taken/)).toBeNull();
    // And there is nothing to retry — the booking is cancelled; leave.
    expect(screen.queryByText('Try again')).toBeNull();
    expect(screen.getByText('View appointment')).toBeTruthy();
  });

  it('a failed charge shows the failure state, surfaces the reason, and Try again re-enters the method step (new charge)', async () => {
    mockInitiate.mockResolvedValueOnce(FAILED_CHARGE);
    // The retry creates a NEW charge that succeeds — the server allows a
    // fresh attempt after `failed`.
    mockInitiate.mockResolvedValueOnce(SUCCEEDED_CHARGE);
    mockGetPayment.mockResolvedValue(SUCCEEDED_CHARGE);

    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('Orange Money'));
    fireEvent.changeText(
      screen.getByLabelText('Mobile Money number'),
      '690000000',
    );
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));

    expect(await screen.findByText('Payment failed')).toBeTruthy();
    expect(
      screen.getByText('The payment didn’t go through — no money was taken.'),
    ).toBeTruthy();
    // The provider's failure reason is surfaced, never swallowed.
    expect(screen.getByText('wallet refused')).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));
    // Back on the method step — the previous rail stays selected (a retry
    // usually reuses it); switch rails anyway to prove re-selection works.
    fireEvent.press(await screen.findByText('Orange Money'));
    fireEvent.press(await screen.findByText('MoMo'));
    fireEvent.changeText(
      screen.getByLabelText('Mobile Money number'),
      '690000000',
    );
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));

    expect(await screen.findByText('Payment received')).toBeTruthy();
    expect(mockInitiate).toHaveBeenCalledTimes(2);
  });

  it('resumes a charge that already succeeded (app killed mid-payment) straight to the receipt', async () => {
    mockByAppointment.mockResolvedValue(SUCCEEDED_CHARGE);
    const screen = renderScreen();
    expect(await screen.findByText('Payment received')).toBeTruthy();
    expect(screen.getByText('KS-pay-1')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('an appointment that can no longer be paid never shows a pay form — and offers the way out', async () => {
    mockGetAppointment.mockResolvedValue({
      ...APPOINTMENT,
      status: 'cancelled',
    });
    const screen = renderScreen();
    expect(
      await screen.findByText('This appointment can no longer be paid.'),
    ).toBeTruthy();
    expect(screen.queryByText('Choose how to pay')).toBeNull();
    // Not a dead end: the outline View-appointment button is the exit.
    expect(screen.getByText('View appointment')).toBeTruthy();
  });
});
