import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n'; // i18next instance for useTranslation (the app imports it at the root)
import { ThemeProvider } from '@/theme';
import type { ApiError, Appointment, Dependent, PractitionerDetail, PublicSlot } from '@/types';

import BookingScreen, { groupSlotsByDay, SuccessStep } from '../[id]';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — the screen reads the practitioner id and navigates.
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'prac-1' }),
  router: {
    get push() {
      return mockPush;
    },
    get replace() {
      return mockReplace;
    },
  },
}));

// Auth seam — `session` drives the signed-out gate.
const mockSession = { value: null as unknown };
jest.mock('@/store', () => ({
  useAuth: () => ({ session: mockSession.value }),
}));

// API seam — services only; the rest of the barrel stays real (useMutation
// imports `isApiError` from it).
const mockPractitioner = jest.fn();
const mockOpenSlots = jest.fn();
const mockBook = jest.fn();
const mockListDependents = jest.fn();
jest.mock('@/api/services', () => ({
  searchService: { practitioner: (...args: unknown[]) => mockPractitioner(...args) },
  appointmentsService: {
    openSlots: (...args: unknown[]) => mockOpenSlots(...args),
    book: (...args: unknown[]) => mockBook(...args),
  },
  dependentsService: { list: (...args: unknown[]) => mockListDependents(...args) },
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const SLOT: PublicSlot = {
  key: 'rule:r1:2026-06-10T08:00:00.000Z',
  startsAt: '2026-06-10T08:00:00.000Z',
  endsAt: '2026-06-10T09:00:00.000Z',
  consultationTypes: ['in_person'],
  locationId: null,
  source: 'rule',
};
const OTHER_DAY_SLOT: PublicSlot = {
  ...SLOT,
  key: 'rule:r1:2026-06-11T08:00:00.000Z',
  startsAt: '2026-06-11T08:00:00.000Z',
  endsAt: '2026-06-11T09:00:00.000Z',
};

const PRACTITIONER = {
  prefix: 'Dr',
  givenNames: 'Amara',
  surname: 'Diallo',
  offerings: [
    { id: 'off-1', consultationType: 'in_person', durationMin: 60, priceXaf: 5000, active: true },
    { id: 'off-2', consultationType: 'video', durationMin: 30, priceXaf: 2500, active: true },
  ],
} as unknown as PractitionerDetail;

const DEPENDENT = {
  id: 'dep-1',
  surname: 'Diallo',
  givenNames: 'Petit',
  dateOfBirth: '2020-01-01',
  sex: 'male',
  relationship: 'child',
  phone: null,
  location: null,
} as Dependent;

const BOOKED: Appointment = {
  id: 'apt-1',
  patientUserId: 'user-1',
  dependentId: null,
  practitionerProfileId: 'prof-1',
  slotId: 'slot-1',
  consultationOfferingId: 'off-1',
  status: 'pending',
  consultationType: 'in_person',
  startsAt: SLOT.startsAt,
  endsAt: SLOT.endsAt,
  priceXaf: 5000,
  cancellationNoticeHours: 24,
  cancellationFeeXaf: 2500,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
};

const SLOT_TAKEN: ApiError = {
  status: 409,
  message: 'This time was just booked. Please pick another slot.',
  code: 'SLOT_TAKEN',
  source: 'envelope',
};

const renderScreen = () =>
  render(
    <ThemeProvider>
      <BookingScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockSession.value = { token: 't' };
  mockPractitioner.mockResolvedValue(PRACTITIONER);
  mockOpenSlots.mockResolvedValue({
    data: [SLOT, OTHER_DAY_SLOT],
    meta: { count: 2, from: SLOT.startsAt, to: OTHER_DAY_SLOT.endsAt },
  });
  mockListDependents.mockResolvedValue({ data: [DEPENDENT], meta: { count: 1, limit: 100, nextCursor: null, hasNextPage: false } });
});

describe('BookingScreen (P4.T1)', () => {
  it('renders the availability picker with day and time chips once loaded', async () => {
    const screen = renderScreen();
    expect(await screen.findByTestId(`booking-slot-${SLOT.key}`)).toBeTruthy();
    expect(screen.getByTestId(`booking-day-2026-06-10`)).toBeTruthy();
    expect(screen.getByTestId(`booking-day-2026-06-11`)).toBeTruthy();
  });

  it('picker → confirm → success, with interpolated policy copy and no raw braces', async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId(`booking-slot-${SLOT.key}`));
    fireEvent.press(screen.getByText('Next'));

    // Confirm step: who + offering + policy notice, offering filtered to the slot.
    expect(await screen.findByText(/Who is this appointment for/)).toBeTruthy();
    expect(screen.getByText('Myself')).toBeTruthy();
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.queryByText('Video')).toBeNull();
    expect(screen.getByText(/notice window without a fee/)).toBeTruthy();
    expect(screen.queryByText(/{{/)).toBeNull();

    fireEvent.press(screen.getByText('Confirm booking'));
    // The mutation resolves without an error banner: the flow accepted the
    // booking (public slot key + selected offering, self-booking).
    await waitFor(() => expect(mockBook).toHaveBeenCalledTimes(1));
    expect(mockBook).toHaveBeenCalledWith({ slotId: SLOT.key, offeringId: 'off-1' });
    expect(screen.queryByText(SLOT_TAKEN.message)).toBeNull();
  });

  it('a taken slot keeps the user on confirm with the localized reason and a way back', async () => {
    mockBook.mockRejectedValue(SLOT_TAKEN);
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId(`booking-slot-${SLOT.key}`));
    fireEvent.press(screen.getByText('Next'));
    fireEvent.press(await screen.findByText('Confirm booking'));

    expect(await screen.findByText(SLOT_TAKEN.message)).toBeTruthy();
    // Recovery: back to the times, error cleared.
    fireEvent.press(screen.getByText('Back to times'));
    expect(await screen.findByTestId(`booking-slot-${SLOT.key}`)).toBeTruthy();
  });

  it('offers booking for a managed dependent', async () => {
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId(`booking-slot-${SLOT.key}`));
    fireEvent.press(screen.getByText('Next'));
    // Open the "who" sheet, then pick the dependent from the options.
    fireEvent.press(await screen.findByText('Myself'));
    fireEvent.press(await screen.findByText('Petit Diallo'));
    fireEvent.press(screen.getByText('Confirm booking'));
    await waitFor(() => expect(mockBook).toHaveBeenCalledTimes(1));
    expect(mockBook).toHaveBeenCalledWith({
      slotId: SLOT.key,
      offeringId: 'off-1',
      dependentId: 'dep-1',
    });
  });

  it('shows the empty state when no slot is open, with a retry', async () => {
    mockOpenSlots.mockResolvedValue({
      data: [],
      meta: { count: 0, from: SLOT.startsAt, to: SLOT.endsAt },
    });
    const screen = renderScreen();
    expect(await screen.findByText('No open slots')).toBeTruthy();
    expect(screen.getByText(/no bookable times in the next two weeks/)).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('shows an error state with retry when the practitioner fails to load', async () => {
    mockPractitioner.mockRejectedValue({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('asks signed-out users to sign in before booking', async () => {
    mockSession.value = null;
    const screen = renderScreen();
    expect(await screen.findByText('Sign in to book an appointment.')).toBeTruthy();
    fireEvent.press(screen.getByText('Sign in'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
    expect(mockOpenSlots).not.toHaveBeenCalled();
  });

  describe('groupSlotsByDay (pure)', () => {
    it('groups by local calendar day, soonest first, keeping slot order within a day', () => {
      const days = groupSlotsByDay([OTHER_DAY_SLOT, SLOT]);
      expect(days.map((day) => day.key)).toEqual(['2026-06-10', '2026-06-11']);
      expect(days[0]?.slots.map((slot) => slot.key)).toEqual([SLOT.key]);
    });
  });
});

describe('SuccessStep (P4.T1)', () => {
  const renderSuccess = (appointment: Appointment) =>
    render(
      <ThemeProvider>
        <SuccessStep appointment={appointment} practitionerName="Dr Amara Diallo" onDone={() => mockReplace('done')} />
      </ThemeProvider>,
    );

  it('shows the summary and the FEE branch of the policy snapshot, interpolated', () => {
    const screen = renderSuccess(BOOKED);
    expect(screen.getByText('Appointment booked')).toBeTruthy();
    expect(screen.getByText(/Dr Amara Diallo — /)).toBeTruthy();
    expect(screen.getByText('5,000 XAF')).toBeTruthy();
    expect(screen.getByText(/up to 24 h before the start/)).toBeTruthy();
    expect(screen.getByText(/2,500 XAF/)).toBeTruthy();
    expect(screen.queryByText(/{{/)).toBeNull();
    fireEvent.press(screen.getByText('Done'));
    expect(mockReplace).toHaveBeenCalled();
  });

  it('uses the free-cancellation copy when the snapshot fee is zero', () => {
    const screen = renderSuccess({ ...BOOKED, cancellationFeeXaf: 0 });
    expect(screen.getByText(/up to 24 h before the start/)).toBeTruthy();
    expect(screen.queryByText(/XAF fee/)).toBeNull();
    expect(screen.queryByText(/{{/)).toBeNull();
  });
});
