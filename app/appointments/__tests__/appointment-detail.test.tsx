import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { Appointment, PublicSlot } from '@/types';

import AppointmentDetailScreen from '../[id]';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — the screen reads the appointment id and goes back.
const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'apt-1' }),
  router: {
    get back() {
      return mockBack;
    },
    get push() {
      return mockPush;
    },
  },
}));

// API seam — services only (useMutation/useAsync import the barrel for helpers).
const mockGet = jest.fn();
const mockCancel = jest.fn();
const mockReschedule = jest.fn();
const mockOpenSlots = jest.fn();
jest.mock('@/api/services', () => ({
  appointmentsService: {
    get: (...args: unknown[]) => mockGet(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    reschedule: (...args: unknown[]) => mockReschedule(...args),
    openSlots: (...args: unknown[]) => mockOpenSlots(...args),
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
  status: 'confirmed',
  consultationType: 'in_person',
  // Far enough ahead that cancelling is ON-TIME against the 24 h window.
  startsAt: '2030-01-15T09:00:00.000Z',
  endsAt: '2030-01-15T10:00:00.000Z',
  priceXaf: 5000,
  cancellationNoticeHours: 24,
  cancellationFeeXaf: 2500,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
};

const SLOT: PublicSlot = {
  key: 'rule:r1:2030-01-20T08:00:00.000Z',
  startsAt: '2030-01-20T08:00:00.000Z',
  endsAt: '2030-01-20T09:00:00.000Z',
  consultationTypes: ['in_person'],
  locationId: null,
  source: 'rule',
};

const renderScreen = () =>
  render(
    <ThemeProvider>
      <AppointmentDetailScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockGet.mockResolvedValue(APPOINTMENT);
  mockOpenSlots.mockResolvedValue({
    data: [SLOT],
    meta: { count: 1, from: SLOT.startsAt, to: SLOT.endsAt },
  });
});

describe('AppointmentDetailScreen (P4.T2)', () => {
  it('renders the snapshot facts: type, clinic time, price, policy and status', async () => {
    const screen = renderScreen();
    expect(await screen.findByText('In person')).toBeTruthy();
    expect(screen.getByText('5,000 XAF')).toBeTruthy();
    // The booking's OWN policy snapshot with real numbers (fee > 0 branch).
    expect(
      screen.getByText(
        'Free cancellation up to 24 h before the start. Later cancellations are charged 2,500 XAF.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('appointment-status-confirmed')).toBeTruthy();
  });

  it('cancel asks for confirmation (with the free terms) before calling the API', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Cancel appointment'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, message, buttons] = alertSpy.mock.calls[0];
    // On-time with a fee: the fee never triggers, so the dialog speaks in
    // CANCEL terms (not the general booking-policy wording).
    expect(message).toContain('You can cancel free of charge');
    expect(mockCancel).not.toHaveBeenCalled();

    const destructive = buttons?.find((button) => button?.text === 'Yes, cancel');
    // act: the confirm handler starts a mutation — state updates must be
    // wrapped (qc-007 minor: Alert onPress outside act).
    await act(async () => {
      destructive?.onPress?.();
    });
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('apt-1'));
    alertSpy.mockRestore();
  });

  it('a fee-0 late cancellation also cancels free of charge (no fee theater)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGet.mockResolvedValue({
      ...APPOINTMENT,
      cancellationFeeXaf: 0,
      startsAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Cancel appointment'));

    const [, message] = alertSpy.mock.calls[0];
    expect(message).toContain('You can cancel free of charge');
    // Neither late-cancel phrase leaks into the fee-0 dialog.
    expect(message).not.toContain('late cancellation');
    expect(message).not.toContain('XAF fee applies');
    alertSpy.mockRestore();
  });

  it('warns about the late fee in the confirmation when inside the notice window', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGet.mockResolvedValue({
      ...APPOINTMENT,
      // Starts in 1 h — well inside the 24 h window, fee > 0 → late warning.
      startsAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Cancel appointment'));

    const [, message] = alertSpy.mock.calls[0];
    expect(message).toContain('late cancellation');
    expect(message).toContain('2,500 XAF');
    alertSpy.mockRestore();
  });

  it('a cancelled appointment shows the banners and hides the lifecycle actions', async () => {
    mockGet.mockResolvedValue({
      ...APPOINTMENT,
      status: 'cancelled',
      cancelledAt: '2029-12-14T10:00:00.000Z',
      lateCancellation: true,
    });
    const screen = renderScreen();
    expect(await screen.findByText('This appointment was cancelled.')).toBeTruthy();
    expect(screen.getByText(/2,500 XAF fee applies/)).toBeTruthy();
    expect(screen.queryByText('Cancel appointment')).toBeNull();
    expect(screen.queryByText('Reschedule')).toBeNull();
  });

  it('a late cancellation under a 0-fee policy shows no fee banner', async () => {
    mockGet.mockResolvedValue({
      ...APPOINTMENT,
      status: 'cancelled',
      cancelledAt: '2029-12-14T10:00:00.000Z',
      cancellationFeeXaf: 0,
      lateCancellation: true,
    });
    const screen = renderScreen();
    expect(await screen.findByText('This appointment was cancelled.')).toBeTruthy();
    // "the 0 XAF fee applies" is money-copy nonsense — the banner is gated.
    expect(screen.queryByText(/fee applies/)).toBeNull();
  });

  it('started appointments hide Cancel and Reschedule (the backend rejects them)', async () => {
    mockGet.mockResolvedValue({
      ...APPOINTMENT,
      // Started 1 h ago, still confirmed.
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
      endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const screen = renderScreen();
    expect(await screen.findByTestId('appointment-status-confirmed')).toBeTruthy();
    expect(screen.queryByText('Cancel appointment')).toBeNull();
    expect(screen.queryByText('Reschedule')).toBeNull();
  });

  it('reschedule: opens the slot picker, picks a slot and confirms the move', async () => {
    mockReschedule.mockResolvedValue({ ...APPOINTMENT, slotId: 'slot-2' });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    // The picker loads the practitioner's open slots, filtered to this type.
    expect(await screen.findByTestId(`reschedule-slot-${SLOT.key}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId(`reschedule-slot-${SLOT.key}`));
    fireEvent.press(screen.getByText('Confirm new time'));

    await waitFor(() =>
      expect(mockReschedule).toHaveBeenCalledWith('apt-1', { slotId: SLOT.key }),
    );
    // Success is confirmed in copy (the picker closes, the card shows the new time).
    expect(await screen.findByText('Your appointment has been moved.')).toBeTruthy();
  });

  it('reschedule slot chips announce time + type + state to screen readers', async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    const chip = await screen.findByTestId(`reschedule-slot-${SLOT.key}`);
    expect(chip.props.accessibilityLabel).toContain('In person');
    expect(chip.props.accessibilityLabel).toContain('not selected');
    fireEvent.press(chip);
    expect(
      screen.getByTestId(`reschedule-slot-${SLOT.key}`).props.accessibilityLabel,
    ).toContain('selected');
  });

  it('reschedule: "Keep current time" closes the picker without moving', async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    expect(await screen.findByText('Confirm new time')).toBeTruthy();
    fireEvent.press(screen.getByText('Keep current time'));

    // Back to the closed state — no reschedule call, no success banner.
    expect(await screen.findByText('Reschedule')).toBeTruthy();
    expect(mockReschedule).not.toHaveBeenCalled();
    expect(screen.queryByText('Your appointment has been moved.')).toBeNull();
  });

  it('a subsequent cancel clears the just-rescheduled banner', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockReschedule.mockResolvedValue({ ...APPOINTMENT, slotId: 'slot-2' });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    const slotChip = await screen.findByTestId(`reschedule-slot-${SLOT.key}`);
    fireEvent.press(slotChip);
    fireEvent.press(screen.getByText('Confirm new time'));
    expect(await screen.findByText('Your appointment has been moved.')).toBeTruthy();

    // Cancelling right after a move must not keep shouting "has been moved".
    fireEvent.press(screen.getByText('Cancel appointment'));
    const destructive = alertSpy.mock.calls[0][2]?.find(
      (button) => button?.text === 'Yes, cancel',
    );
    // act: the confirm handler starts a mutation (qc-007 minor — the warning
    // surfaced at this line, same pattern as the first cancel test).
    await act(async () => {
      destructive?.onPress?.();
    });
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('apt-1'));
    expect(screen.queryByText('Your appointment has been moved.')).toBeNull();
    alertSpy.mockRestore();
  });

  it('reschedule: an empty picker offers the refresh action instead of a dead end', async () => {
    mockOpenSlots.mockResolvedValue({
      data: [],
      meta: { count: 0, from: SLOT.startsAt, to: SLOT.endsAt },
    });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    expect(await screen.findByText('No open times in the next two weeks.')).toBeTruthy();
    fireEvent.press(screen.getByText('Refresh times'));
    await waitFor(() => expect(mockOpenSlots).toHaveBeenCalledTimes(2));
    // qc-007 minor: the EMPTY branch also keeps a close affordance.
    fireEvent.press(screen.getByText('Keep current time'));
    expect(await screen.findByText('Reschedule')).toBeTruthy();
  });

  it('shows an error state with retry when the appointment fails to load', async () => {
    mockGet.mockRejectedValue({ status: 404, message: 'No such appointment', code: 'NOT_FOUND' });
    const screen = renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
  });

  it('a pending appointment explains itself (payment is the path to confirmed) with a Pending badge and the Pay CTA', async () => {
    mockGet.mockResolvedValue({ ...APPOINTMENT, status: 'pending' });
    const screen = renderScreen();
    expect(
      await screen.findByText(
        'This appointment is reserved for you — it confirms as soon as your payment goes through.',
      ),
    ).toBeTruthy();
    expect(screen.getByTestId('appointment-status-pending')).toBeTruthy();
    // P5: paying is how the booking confirms — the CTA opens checkout.
    fireEvent.press(screen.getByText('Pay 5,000 XAF'));
    expect(mockPush).toHaveBeenCalledWith('/checkout/apt-1');
  });

  it('SLOT_TAKEN on reschedule clears the dead slot and refetches availability', async () => {
    mockReschedule.mockRejectedValue({
      status: 409,
      code: 'SLOT_TAKEN',
      message: 'That time was just taken.',
    });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    const slotChip = await screen.findByTestId(`reschedule-slot-${SLOT.key}`);
    fireEvent.press(slotChip);
    // Re-query after the press — the original handle predates the re-render.
    expect(screen.getByTestId(`reschedule-slot-${SLOT.key}`).props.accessibilityState).toMatchObject(
      { selected: true },
    );
    fireEvent.press(screen.getByText('Confirm new time'));

    await waitFor(() => expect(mockReschedule).toHaveBeenCalled());
    // Recovery: the localized 409 copy is shown, the dead slot is deselected
    // (a second Confirm could only 409 again) and availability is refetched.
    expect(await screen.findByText('That time was just taken.')).toBeTruthy();
    await waitFor(() => expect(mockOpenSlots).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId(`reschedule-slot-${SLOT.key}`).props.accessibilityState).toMatchObject(
      { selected: false },
    );
  });

  it('a slots-load failure inside the reschedule picker offers a retry', async () => {
    mockOpenSlots.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Reschedule'));

    expect(await screen.findByText('No connection.')).toBeTruthy();
    // qc-007 minor: the ERROR branch keeps a close affordance too — the user
    // can back out to the detail screen without abandoning it.
    expect(screen.getByText('Keep current time')).toBeTruthy();
    mockOpenSlots.mockResolvedValue({
      data: [SLOT],
      meta: { count: 1, from: SLOT.startsAt, to: SLOT.endsAt },
    });
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByTestId(`reschedule-slot-${SLOT.key}`)).toBeTruthy();
    expect(mockOpenSlots).toHaveBeenCalledTimes(2);
  });
});
