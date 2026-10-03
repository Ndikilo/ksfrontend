import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { FlatList } from 'react-native';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { Appointment, CursorPage } from '@/types';

import AppointmentsScreen, { splitAppointments } from '../appointments';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — rows navigate to the detail route. useFocusEffect runs
// its callback on every focus (like expo-router) and is captured so tests can
// drive a re-focus refetch (the SWR rule under test).
let mockOnRefocus: (() => void) | undefined;
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    get push() {
      return mockPush;
    },
  },
  useFocusEffect: (callback: () => void) => {
    // expo-router runs the callback on focus — approximated by running it
    // once per stable callback identity (the screen wraps it in useCallback).
    if (mockOnRefocus !== callback) {
      mockOnRefocus = callback;
      callback();
    }
  },
}));

// API seam — services only (useMutation/useAsync import the barrel for helpers).
const mockList = jest.fn();
jest.mock('@/api/services', () => ({
  appointmentsService: { list: (...args: unknown[]) => mockList(...args) },
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const UPCOMING: Appointment = {
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
  cancellationFeeXaf: 0,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
};
const SOONER: Appointment = { ...UPCOMING, id: 'apt-2', startsAt: '2030-01-10T09:00:00.000Z' };
const PAST_DONE: Appointment = {
  ...UPCOMING,
  id: 'apt-3',
  status: 'completed',
  startsAt: '2020-01-15T09:00:00.000Z',
};
const CANCELLED_FUTURE: Appointment = {
  ...UPCOMING,
  id: 'apt-4',
  status: 'cancelled',
  cancelledAt: '2029-12-01T00:00:00.000Z',
};

const page = (
  data: Appointment[],
  meta: Partial<CursorPage<Appointment>['meta']> = {},
): CursorPage<Appointment> => ({
  data,
  meta: { count: data.length, limit: 50, nextCursor: null, hasNextPage: false, ...meta },
});

const renderScreen = () =>
  render(
    <ThemeProvider>
      <AppointmentsScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockOnRefocus = undefined;
  mockList.mockResolvedValue(page([UPCOMING, PAST_DONE]));
});

describe('splitAppointments (pure)', () => {
  it('splits by clinic clock: future active = upcoming, everything else = past', () => {
    const now = Date.parse('2030-01-01T00:00:00.000Z');
    const { upcoming, past } = splitAppointments(
      [UPCOMING, SOONER, PAST_DONE, CANCELLED_FUTURE],
      now,
    );
    // Soonest-first for upcoming, most-recent-first for past.
    expect(upcoming.map((a) => a.id)).toEqual(['apt-2', 'apt-1']);
    expect(past.map((a) => a.id)).toEqual(['apt-4', 'apt-3']);
  });

  it('a cancelled booking with a future start is history, not upcoming', () => {
    const { upcoming, past } = splitAppointments([CANCELLED_FUTURE], Date.parse('2029-01-01T00:00:00.000Z'));
    expect(upcoming).toEqual([]);
    expect(past.map((a) => a.id)).toEqual(['apt-4']);
  });
});

describe('AppointmentsScreen (P4.T2)', () => {
  it('lists upcoming appointments with type, clinic time, price and status', async () => {
    const screen = renderScreen();
    expect(await screen.findByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.getByText('5,000 XAF')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    expect(mockList).toHaveBeenCalledWith({ limit: 50 });
  });

  it('rows announce type + when + price + state to screen readers', async () => {
    const screen = renderScreen();
    const row = await screen.findByTestId('appointment-row-apt-1');
    expect(row.props.accessibilityLabel).toContain('In person');
    expect(row.props.accessibilityLabel).toContain('5,000 XAF');
    expect(row.props.accessibilityLabel).toContain('Pending');
  });

  it('switches to the past list with the Past segment chip', async () => {
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');
    fireEvent.press(screen.getByText('Past'));
    expect(await screen.findByTestId('appointment-row-apt-3')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.queryByTestId('appointment-row-apt-1')).toBeNull();
  });

  it('shows the upcoming empty state with a real next action', async () => {
    mockList.mockResolvedValue(page([]));
    const screen = renderScreen();
    expect(await screen.findByText('No upcoming appointments')).toBeTruthy();
    expect(screen.getByText('Find a practitioner')).toBeTruthy();
  });

  it('shows the past empty state when history is empty', async () => {
    mockList.mockResolvedValue(page([]));
    const screen = renderScreen();
    await screen.findByText('No upcoming appointments');
    fireEvent.press(screen.getByText('Past'));
    expect(await screen.findByText('No past appointments')).toBeTruthy();
  });

  it('shows an error state with retry when the list fails', async () => {
    mockList.mockRejectedValue({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    mockList.mockResolvedValue(page([UPCOMING]));
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy());
  });

  it('loads the next cursor page on end reached (history is never capped)', async () => {
    mockList.mockResolvedValue(
      page([UPCOMING], { nextCursor: 'cursor-1', hasNextPage: true }),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    mockList.mockResolvedValue(page([PAST_DONE]));
    const list = screen.UNSAFE_getByType(FlatList);
    act(() => list.props.onEndReached?.());

    await waitFor(() =>
      expect(mockList).toHaveBeenCalledWith({ limit: 50, cursor: 'cursor-1' }),
    );
    fireEvent.press(screen.getByText('Past'));
    expect(await screen.findByTestId('appointment-row-apt-3')).toBeTruthy();
  });

  it('a failed page load keeps the loaded history and offers a retry', async () => {
    mockList.mockResolvedValue(
      page([UPCOMING], { nextCursor: 'cursor-1', hasNextPage: true }),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    mockList.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    const list = screen.UNSAFE_getByType(FlatList);
    act(() => list.props.onEndReached?.());

    expect(await screen.findByText('Try again')).toBeTruthy();
    // The first page's rows are still mounted.
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();

    mockList.mockResolvedValue(page([PAST_DONE]));
    fireEvent.press(screen.getByText('Try again'));
    // The retry must issue a NEW call (standard §2): toHaveBeenCalledWith
    // alone is vacuous — it matches the FAILED call already in history, which
    // is exactly the dead-retry-tap regression qc-007 caught (the stale
    // closure returned before fetching). Mount + failed page + retry = 3.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
    expect(mockList).toHaveBeenLastCalledWith({ limit: 50, cursor: 'cursor-1' });
    // And the retried page actually loaded: the past segment gains apt-3.
    fireEvent.press(screen.getByText('Past'));
    expect(await screen.findByTestId('appointment-row-apt-3')).toBeTruthy();
  });

  it('a re-focus refetch keeps the list mounted (stale-while-revalidate)', async () => {
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    // Refetch resolves later — while it is in flight the rows stay mounted.
    let resolveRefetch: (value: CursorPage<Appointment>) => void = () => {};
    mockList.mockReturnValue(
      new Promise<CursorPage<Appointment>>((resolve) => {
        resolveRefetch = resolve;
      }),
    );
    act(() => mockOnRefocus?.());
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(screen.queryByTestId('appointments-spinner')).toBeNull();

    await act(async () => {
      resolveRefetch(page([SOONER, UPCOMING]));
    });
    expect(screen.getByTestId('appointment-row-apt-2')).toBeTruthy();
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();
  });
});
