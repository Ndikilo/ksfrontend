import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { Appointment, Payment } from '@/types';

import CheckoutScreen from '../[id]';

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

const NO_CHARGE = { status: 404, message: 'Not found', code: 'NOT_FOUND' };

const renderScreen = () =>
  render(
    <ThemeProvider>
      <CheckoutScreen />
    </ThemeProvider>,
  );

/** Fresh pending appointment, no charge yet. */
beforeEach(() => {
  jest.resetAllMocks();
  mockGetAppointment.mockResolvedValue(APPOINTMENT);
  mockByAppointment.mockRejectedValue(NO_CHARGE);
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
    expect(await screen.findByText('Enter the phone number of the wallet to debit.')).toBeTruthy();
    expect(mockInitiate).not.toHaveBeenCalled();
  });

  it('initiates the charge, polls to success, and shows the receipt', async () => {
    mockInitiate.mockResolvedValue(PENDING_CHARGE);
    // The first status poll fires immediately on entering the pending phase
    // (the backend reconciles with the provider on read).
    mockGetPayment.mockResolvedValue(SUCCEEDED_CHARGE);

    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('MoMo'));
    fireEvent.changeText(screen.getByLabelText('Mobile Money number'), '+237690000000');
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));

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
  });

  it('a failed charge shows the failure state and Try again re-enters the method step (new charge)', async () => {
    mockInitiate.mockResolvedValueOnce(FAILED_CHARGE);
    // The retry creates a NEW charge that succeeds — the server allows a
    // fresh attempt after `failed`.
    mockInitiate.mockResolvedValueOnce(SUCCEEDED_CHARGE);
    mockGetPayment.mockResolvedValue(SUCCEEDED_CHARGE);

    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Choose how to pay'));
    fireEvent.press(await screen.findByText('Orange Money'));
    fireEvent.changeText(screen.getByLabelText('Mobile Money number'), '690000000');
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));

    expect(await screen.findByText('Payment failed')).toBeTruthy();
    expect(screen.getByText('The payment didn’t go through — no money was taken.')).toBeTruthy();

    fireEvent.press(screen.getByText('Try again'));
    // Back on the method step — the previous rail stays selected (a retry
    // usually reuses it); switch rails anyway to prove re-selection works.
    fireEvent.press(await screen.findByText('Orange Money'));
    fireEvent.press(await screen.findByText('MoMo'));
    fireEvent.changeText(screen.getByLabelText('Mobile Money number'), '690000000');
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

  it('an appointment that can no longer be paid never shows a pay form', async () => {
    mockGetAppointment.mockResolvedValue({ ...APPOINTMENT, status: 'cancelled' });
    const screen = renderScreen();
    expect(await screen.findByText('This appointment can no longer be paid.')).toBeTruthy();
    expect(screen.queryByText('Choose how to pay')).toBeNull();
  });
});
