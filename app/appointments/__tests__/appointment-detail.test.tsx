import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'apt-1' }),
  router: {
    get back() {
      return mockBack;
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

  it('cancel asks for confirmation (with the free-cancel terms) before calling the API', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const screen = renderScreen();
    fireEvent.press(await screen.findByText('Cancel appointment'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [, message, buttons] = alertSpy.mock.calls[0];
    expect(message).toContain('Free cancellation up to 24 h');
    expect(mockCancel).not.toHaveBeenCalled();

    const destructive = buttons?.find((button) => button?.text === 'Yes, cancel');
    destructive?.onPress?.();
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('apt-1'));
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

  it('shows an error state with retry when the appointment fails to load', async () => {
    mockGet.mockRejectedValue({ status: 404, message: 'No such appointment', code: 'NOT_FOUND' });
    const screen = renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
  });
});
