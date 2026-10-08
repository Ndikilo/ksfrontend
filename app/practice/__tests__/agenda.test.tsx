import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { FlatList } from 'react-native';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { Appointment, CursorPage } from '@/types';

import AgendaScreen from '../index';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — rows navigate to the detail route. useFocusEffect runs
// its callback on every focus (like expo-router) and is captured so tests can
// drive a re-focus refetch.
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

// API seam — services only (useAsync imports the barrel for helpers).
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
  status: 'confirmed',
  consultationType: 'in_person',
  startsAt: '2030-01-15T09:00:00.000Z',
  endsAt: '2030-01-15T10:00:00.000Z',
  priceXaf: 5000,
  cancellationNoticeHours: 24,
  cancellationFeeXaf: 0,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
  // Practitioner-scope rows name WHO the booking is for (P7.T1).
  patientName: 'Amina Fon',
  practitionerName: null,
};
const PAST_DONE: Appointment = {
  ...UPCOMING,
  id: 'apt-2',
  status: 'completed',
  startsAt: '2020-01-15T09:00:00.000Z',
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
      <AgendaScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockOnRefocus = undefined;
  mockList.mockResolvedValue(page([UPCOMING, PAST_DONE]));
});

afterEach(async () => {
  // Drain VirtualizedList's pending `_updateCellsToRender` macrotask INSIDE
  // act — otherwise it fires during the NEXT test's render and produces a
  // spurious "not wrapped in act" warning (act hygiene, qc-008 rule).
  await act(async () => {});
});

describe('Practitioner agenda (P7.T1)', () => {
  it('lists the professional agenda via scope=practitioner', async () => {
    const screen = renderScreen();

    expect(await screen.findByTestId('appointment-row-apt-1')).toBeTruthy();
    // The role-aware scope is the whole point of this screen.
    expect(mockList).toHaveBeenCalledWith({ scope: 'practitioner', limit: 50 });
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.getByText('5,000 XAF')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
  });

  it('rows announce type + when + price + state to screen readers', async () => {
    const screen = renderScreen();
    const row = await screen.findByTestId('appointment-row-apt-1');
    expect(row.props.accessibilityLabel).toContain('In person');
    expect(row.props.accessibilityLabel).toContain('5,000 XAF');
    expect(row.props.accessibilityLabel).toContain('Confirmed');
  });

  it('rows lead with the patient name (persona naming, Review 012 MAJOR)', async () => {
    const screen = renderScreen();
    const row = await screen.findByTestId('appointment-row-apt-1');
    // The name is the row's primary line AND leads the a11y label — a nameless
    // agenda fails the Doctolib/Zocdoc benchmark (codified standard §2).
    expect(screen.getByText('Amina Fon')).toBeTruthy();
    expect(row.props.accessibilityLabel.startsWith('Amina Fon, ')).toBe(true);
    // The booking type is still visible below the name.
    expect(screen.getByText('In person')).toBeTruthy();
  });

  it('a failed re-focus refetch shows a Banner over the stale rows (standard §2)', async () => {
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    mockList.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    act(() => mockOnRefocus?.());

    // The failure is VISIBLE (Banner), the stale rows stay mounted, and no
    // full-screen spinner replaces them — never a silent refetch failure.
    expect(await screen.findByText('No connection.')).toBeTruthy();
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(screen.queryByTestId('agenda-spinner')).toBeNull();
  });

  it('switches to the past list with the Past segment chip', async () => {
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    expect(await screen.findByTestId('appointment-row-apt-2')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.queryByTestId('appointment-row-apt-1')).toBeNull();
  });

  it('shows the upcoming empty state with an explanation', async () => {
    mockList.mockResolvedValue(page([]));
    const screen = renderScreen();
    expect(await screen.findByText('No upcoming appointments')).toBeTruthy();
    expect(screen.getByText('Bookings your patients make will appear here.')).toBeTruthy();
  });

  it('shows the past empty state when history is empty', async () => {
    mockList.mockResolvedValue(page([]));
    const screen = renderScreen();
    await screen.findByText('No upcoming appointments');
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
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
      expect(mockList).toHaveBeenCalledWith({
        scope: 'practitioner',
        limit: 50,
        cursor: 'cursor-1',
      }),
    );
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    expect(await screen.findByTestId('appointment-row-apt-2')).toBeTruthy();
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
    // alone is vacuous — it matches the FAILED call already in history.
    // Mount + failed page + retry = 3.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(3));
    expect(mockList).toHaveBeenLastCalledWith({
      scope: 'practitioner',
      limit: 50,
      cursor: 'cursor-1',
    });
    // And the retried page actually loaded: the past segment gains apt-2.
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    expect(await screen.findByTestId('appointment-row-apt-2')).toBeTruthy();
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
    expect(mockList).toHaveBeenLastCalledWith({ scope: 'practitioner', limit: 50 });
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(screen.queryByTestId('agenda-spinner')).toBeNull();

    await act(async () => {
      resolveRefetch(page([UPCOMING]));
    });
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();
  });
});
