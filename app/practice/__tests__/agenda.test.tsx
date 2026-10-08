import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, FlatList } from 'react-native';

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
const mockConfirm = jest.fn();
const mockCancel = jest.fn();
jest.mock('@/api/services', () => ({
  appointmentsService: {
    list: (...args: unknown[]) => mockList(...args),
    confirm: (...args: unknown[]) => mockConfirm(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
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
// Incoming requests (P7.T3) — pending bookings awaiting the practitioner's
// decision, named for WHO they are for.
const PENDING: Appointment = {
  ...UPCOMING,
  id: 'apt-pending-1',
  status: 'pending',
  patientName: 'Burma Tabi',
};
const PENDING_LATER: Appointment = {
  ...PENDING,
  id: 'apt-pending-2',
  patientName: 'Chantal Nkeng',
  startsAt: '2030-01-16T09:00:00.000Z',
  endsAt: '2030-01-16T10:00:00.000Z',
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

/**
 * The nearest ancestor carrying `accessibilityState` — the ui Button exposes
 * disabled/busy there (its Pressable), not on the label Text. Structural walk
 * so no react-test-renderer type import is needed (it ships none).
 */
type A11yNode = {
  props: { accessibilityState?: { disabled?: boolean; busy?: boolean } };
  parent: A11yNode | null;
};

const pressableState = (element: A11yNode): { disabled?: boolean; busy?: boolean } => {
  let node: A11yNode | null = element;
  while (node && node.props.accessibilityState === undefined) node = node.parent;
  return node?.props.accessibilityState ?? {};
};

beforeEach(() => {
  jest.resetAllMocks();
  mockOnRefocus = undefined;
  mockList.mockResolvedValue(page([UPCOMING, PAST_DONE]));
});

afterEach(async () => {
  // Drain VirtualizedList's pending `_updateCellsToRender` macrotask INSIDE
  // act — otherwise it fires during the NEXT test's render and produces a
  // spurious "not wrapped in act" warning (act hygiene, qc-008 rule). (The
  // remaining teardown noise — this list re-scheduling `_updateCellsToRender`
  // after unmount — reproduces on the untouched baseline and is left as the
  // known pre-existing VirtualizedList issue, Review 013 MINOR-10.)
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
    // Page 1 already reaches before now (PAST_DONE), so the coverage loop is
    // satisfied at mount — the next page loads ONLY via end-reached.
    mockList.mockResolvedValue(
      page([UPCOMING, PAST_DONE], { nextCursor: 'cursor-1', hasNextPage: true }),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    const OLDER_DONE: Appointment = {
      ...PAST_DONE,
      id: 'apt-2-older',
      startsAt: '2019-06-01T09:00:00.000Z',
    };
    mockList.mockResolvedValue(page([OLDER_DONE]));
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
    expect(screen.getByTestId('appointment-row-apt-2-older')).toBeTruthy();
  });

  it('a failed page load keeps the loaded history and offers a retry', async () => {
    // Coverage-complete first page (see the test above): the failure under
    // test is the END-REACHED page load, not the mount fetch.
    mockList.mockResolvedValue(
      page([UPCOMING, PAST_DONE], { nextCursor: 'cursor-1', hasNextPage: true }),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-1');

    mockList.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    const list = screen.UNSAFE_getByType(FlatList);
    act(() => list.props.onEndReached?.());

    expect(await screen.findByText('Try again')).toBeTruthy();
    // The first page's rows are still mounted.
    expect(screen.getByTestId('appointment-row-apt-1')).toBeTruthy();

    const OLDER_DONE: Appointment = {
      ...PAST_DONE,
      id: 'apt-2-older',
      startsAt: '2019-06-01T09:00:00.000Z',
    };
    mockList.mockResolvedValue(page([OLDER_DONE]));
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
    // And the retried page actually loaded: the past segment gains the older row.
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    expect(await screen.findByTestId('appointment-row-apt-2-older')).toBeTruthy();
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

describe('Incoming requests + day view (P7.T3)', () => {
  it('pending requests render the patient name with Confirm and Decline on the row', async () => {
    mockList.mockResolvedValue(page([PENDING]));
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));

    const row = screen.getByTestId('appointment-row-apt-pending-1');
    // WHO the request is for leads the row and its a11y label (standard §2).
    expect(screen.getByText('Burma Tabi')).toBeTruthy();
    expect(row.props.accessibilityLabel.startsWith('Burma Tabi, ')).toBe(true);
    expect(screen.getByText('Pending')).toBeTruthy();
    // Both decisions sit directly on the row.
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('Decline')).toBeTruthy();
  });

  it('confirm is optimistic, hits the endpoint, and settles the row', async () => {
    mockList.mockResolvedValue(page([PENDING, UPCOMING]));
    let resolveConfirm: (value: Appointment) => void = () => {};
    mockConfirm.mockReturnValue(
      new Promise<Appointment>((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));
    fireEvent.press(screen.getByText('Confirm'));

    // The endpoint got the id, and the row flips BEFORE the response — the
    // optimistic state is what the practitioner sees on 3G.
    expect(mockConfirm).toHaveBeenCalledWith('apt-pending-1');
    expect(await screen.findByText('Confirmed')).toBeTruthy();
    // In flight: this row's own Decline is paused, and Confirm shows its busy
    // spinner (the label gives way to the ActivityIndicator while loading).
    expect(pressableState(screen.getByText('Decline')).disabled).toBe(true);
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

    await act(async () => {
      resolveConfirm({ ...PENDING, status: 'confirmed' });
    });
    // Settled: the confirmed booking leaves the requests segment and joins
    // the upcoming agenda.
    expect(screen.queryByTestId('appointment-row-apt-pending-1')).toBeNull();
    fireEvent.press(screen.getByTestId('agenda-segment-upcoming'));
    expect(await screen.findByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(screen.getByTestId('appointment-row-apt-pending-1')).toBeTruthy();
  });

  it('pauses sibling decisions while one request is in flight', async () => {
    mockList.mockResolvedValue(page([PENDING, PENDING_LATER]));
    let resolveConfirm: (value: Appointment) => void = () => {};
    mockConfirm.mockReturnValue(
      new Promise<Appointment>((resolve) => {
        resolveConfirm = resolve;
      }),
    );
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));
    const [row1, row2] = screen.getAllByTestId(/appointment-row-apt-pending/);
    fireEvent.press(within(row1).getByText('Confirm'));

    // Row 1's Decline AND row 2's whole decision pair are disabled: two
    // lifecycle writes must never interleave.
    expect(pressableState(within(row1).getByText('Decline')).disabled).toBe(true);
    expect(pressableState(within(row2).getByText('Confirm')).disabled).toBe(true);
    expect(pressableState(within(row2).getByText('Decline')).disabled).toBe(true);

    await act(async () => {
      resolveConfirm({ ...PENDING, status: 'confirmed' });
    });
  });

  it('a failed confirm rolls the row back and surfaces the failure', async () => {
    mockList.mockResolvedValue(page([PENDING]));
    mockConfirm.mockRejectedValueOnce({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));
    fireEvent.press(screen.getByText('Confirm'));

    // The failure is visible and says what to do next; the row is back in the
    // segment as Pending — never silently gone, never stuck optimistic.
    expect(
      await screen.findByText('This request could not be updated. Please try again.'),
    ).toBeTruthy();
    expect(screen.getByTestId('appointment-row-apt-pending-1')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    // A plain failure does not refetch (no reason to believe the list moved).
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it('a 409 state conflict says so and refetches the true state', async () => {
    mockList.mockResolvedValue(page([PENDING]));
    mockConfirm.mockRejectedValueOnce({
      status: 409,
      code: 'APPOINTMENT_STATE_INVALID',
      message: 'state invalid',
    });
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));
    // The patient cancelled meanwhile — the refetch must return the TRUTH.
    mockList.mockResolvedValueOnce(page([{ ...PENDING, status: 'cancelled' }]));
    fireEvent.press(screen.getByText('Confirm'));

    expect(
      await screen.findByText(
        'This request has changed — the patient may have cancelled it. The list shows the current state.',
      ),
    ).toBeTruthy();
    // The refetch pins a NEW list call (standard §2): mount + conflict = 2.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    // The truth lands: the cancelled request leaves the pending decisions.
    await waitFor(() =>
      expect(screen.queryByTestId('appointment-row-apt-pending-1')).toBeNull(),
    );
  });

  it('decline confirms first, then hits the cancel endpoint and removes the request', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockList.mockResolvedValue(page([PENDING]));
    mockCancel.mockResolvedValue({ ...PENDING, status: 'cancelled' });
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));
    fireEvent.press(screen.getByText('Decline'));

    // Destructive actions confirm (standard §2) — consequence spelled out,
    // nothing sent until the destructive button fires.
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Decline this request?');
    expect(message).toContain('no longer available');
    expect(mockCancel).not.toHaveBeenCalled();

    const destructive = buttons?.find((button) => button?.text === 'Decline');
    await act(async () => {
      destructive?.onPress?.();
    });

    // Decline IS a practitioner cancel of a pending request (the backend's
    // `declined` scenario) — so the endpoint is the cancel one.
    expect(mockCancel).toHaveBeenCalledWith('apt-pending-1');
    await waitFor(() =>
      expect(screen.queryByTestId('appointment-row-apt-pending-1')).toBeNull(),
    );
    // The declined request lands in history as Cancelled.
    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    expect(await screen.findByTestId('appointment-row-apt-pending-1')).toBeTruthy();
    expect(screen.getByText('Cancelled')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('day view shows only that clinic date in time order, with a now anchor', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-15T10:00:00.000Z'));
    const DAY_EARLY: Appointment = {
      ...UPCOMING,
      id: 'apt-day-early',
      startsAt: '2030-01-15T08:00:00.000Z', // 09:00 Douala — already over at 11:00.
      endsAt: '2030-01-15T09:00:00.000Z',
    };
    const DAY_LATE: Appointment = {
      ...UPCOMING,
      id: 'apt-day-late',
      startsAt: '2030-01-15T11:00:00.000Z', // 12:00 Douala — still ahead.
      endsAt: '2030-01-15T12:00:00.000Z',
    };
    const OTHER_DAY: Appointment = {
      ...UPCOMING,
      id: 'apt-other-day',
      startsAt: '2030-01-16T09:00:00.000Z',
      endsAt: '2030-01-16T10:00:00.000Z',
    };
    // The backend lists newest start first — the day view must re-order.
    mockList.mockResolvedValue(page([OTHER_DAY, DAY_LATE, DAY_EARLY, PAST_DONE]));
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-day'));

    // Ascending time order regardless of the list's own order.
    const order = screen
      .getAllByTestId(/appointment-row-apt-day/)
      .map((row) => row.props.testID);
    expect(order).toEqual(['appointment-row-apt-day-early', 'appointment-row-apt-day-late']);
    // ONLY the selected clinic day: tomorrow's and 2020's rows stay out.
    expect(screen.queryByTestId('appointment-row-apt-other-day')).toBeNull();
    expect(screen.queryByTestId('appointment-row-apt-2')).toBeNull();
    // Today: the now/next anchor sits between ended and upcoming bookings.
    const anchored = screen
      .getAllByTestId(/agenda-now-marker|appointment-row-apt-day/)
      .map((row) => row.props.testID);
    expect(anchored).toEqual([
      'appointment-row-apt-day-early',
      'agenda-now-marker',
      'appointment-row-apt-day-late',
    ]);
    expect(screen.getByText('Today')).toBeTruthy();
    now.mockRestore();
  });

  it('the day navigator moves to the next day and back (no anchor off today)', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-15T10:00:00.000Z'));
    const DAY_LATE: Appointment = {
      ...UPCOMING,
      id: 'apt-day-late',
      startsAt: '2030-01-15T11:00:00.000Z',
      endsAt: '2030-01-15T12:00:00.000Z',
    };
    mockList.mockResolvedValue(page([DAY_LATE]));
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-day'));
    expect(await screen.findByTestId('appointment-row-apt-day-late')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();

    // Next: the 16th — empty, and no now anchor on a day that is not today.
    fireEvent.press(screen.getByLabelText('Next day'));
    expect(await screen.findByText(/No appointments on/)).toBeTruthy();
    expect(screen.queryByTestId('appointment-row-apt-day-late')).toBeNull();
    expect(screen.queryByTestId('agenda-now-marker')).toBeNull();

    // Back: the 15th again.
    fireEvent.press(screen.getByLabelText('Previous day'));
    expect(await screen.findByTestId('appointment-row-apt-day-late')).toBeTruthy();
    now.mockRestore();
  });

  it('an empty requests list explains itself calmly', async () => {
    mockList.mockResolvedValue(page([]));
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));

    expect(await screen.findByText('No new requests')).toBeTruthy();
    expect(
      screen.getByText(
        'Booking requests from your patients will appear here for you to confirm.',
      ),
    ).toBeTruthy();
  });

  it('a failed refetch shows the Banner over stale rows on the requests segment too', async () => {
    mockList.mockResolvedValue(page([PENDING]));
    const screen = renderScreen();
    fireEvent.press(await screen.findByTestId('agenda-segment-pending'));

    mockList.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    act(() => mockOnRefocus?.());

    // The failure is VISIBLE, the stale request stays mounted (standard §2).
    expect(await screen.findByText('No connection.')).toBeTruthy();
    expect(screen.getByTestId('appointment-row-apt-pending-1')).toBeTruthy();
  });
});

describe('Window coverage (Review 013 MAJOR-1 + MINOR-9)', () => {
  const NOW = Date.parse('2030-01-15T10:00:00.000Z');
  // A window whose oldest row is still inside the near future: a Day on the
  // 14th (or the Requests segment) is NOT covered by page 1 alone — every row
  // here sorts above the 14th, so absence on it is not yet provable.
  const FAR_FUTURE: Appointment = {
    ...UPCOMING,
    id: 'apt-far-future',
    startsAt: '2030-01-16T09:00:00.000Z',
    endsAt: '2030-01-16T10:00:00.000Z',
  };
  // Still ahead at NOW (starts 11:00) and on the 15th — the window's oldest row.
  const TODAY_ROW: Appointment = {
    ...UPCOMING,
    id: 'apt-today',
    startsAt: '2030-01-15T11:00:00.000Z',
    endsAt: '2030-01-15T12:00:00.000Z',
  };
  const windowPage = () =>
    page([FAR_FUTURE, TODAY_ROW], { nextCursor: 'cursor-1', hasNextPage: true });

  beforeEach(() => {
    // Pin "today" to the 15th so the day navigator starts there (the tests
    // step back to the 14th, older than every loaded row).
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('a Day older than the loaded window fetches to coverage before saying the day is empty', async () => {
    mockList
      .mockResolvedValueOnce(windowPage())
      .mockResolvedValueOnce(page([PAST_DONE])); // page 2 reaches 2020 — covers the 14th
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    fireEvent.press(screen.getByTestId('agenda-segment-day'));
    fireEvent.press(screen.getByLabelText('Previous day')); // 2030-01-14

    // Fetch-to-coverage: page 2 is pulled WITHOUT waiting for a scroll…
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        scope: 'practitioner',
        limit: 50,
        cursor: 'cursor-1',
      }),
    );
    // …and only once the window provably covers the 14th does the empty
    // state render — the honest answer, not a 50-row-window artefact.
    expect(await screen.findByText('No appointments on Jan 14, 2030')).toBeTruthy();
  });

  it('withholds the day empty state while the coverage fetch is still running', async () => {
    mockList.mockResolvedValueOnce(windowPage()).mockReturnValueOnce(
      new Promise<CursorPage<Appointment>>(() => {}),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    fireEvent.press(screen.getByTestId('agenda-segment-day'));
    fireEvent.press(screen.getByLabelText('Previous day'));

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    // Uncovered: NO empty claim — the footer spinner speaks instead.
    expect(screen.queryByText(/No appointments on/)).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('a failed coverage fetch offers Retry and still never shows the false day-empty state', async () => {
    mockList
      .mockResolvedValueOnce(windowPage())
      .mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    fireEvent.press(screen.getByTestId('agenda-segment-day'));
    fireEvent.press(screen.getByLabelText('Previous day'));

    expect(await screen.findByText('Try again')).toBeTruthy();
    expect(screen.queryByText(/No appointments on/)).toBeNull();

    // The retried page completes the coverage fetch → the honest empty state.
    mockList.mockResolvedValue(page([PAST_DONE]));
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('No appointments on Jan 14, 2030')).toBeTruthy();
    // Mount + failed coverage + retry = 3 (standard §2: pin the new call).
    expect(mockList).toHaveBeenCalledTimes(3);
  });

  it('the Requests segment fetches past far-future bookings before saying no new requests', async () => {
    // A near-term request pushed off page 1 by the far-future booking; the
    // same page reaches before now (2020), completing coverage in one step.
    const NEAR_PENDING: Appointment = {
      ...PENDING,
      id: 'apt-pending-near',
      startsAt: '2030-01-15T10:30:00.000Z',
      endsAt: '2030-01-15T11:30:00.000Z',
    };
    mockList
      .mockResolvedValueOnce(windowPage())
      .mockResolvedValueOnce(page([NEAR_PENDING, PAST_DONE]));
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    fireEvent.press(screen.getByTestId('agenda-segment-pending'));

    // Page 1 holds no pending request — but it also does not reach before
    // now, so absence is NOT provable: page 2 is fetched automatically…
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        scope: 'practitioner',
        limit: 50,
        cursor: 'cursor-1',
      }),
    );
    // …and the request that had fallen off the window appears.
    expect(await screen.findByTestId('appointment-row-apt-pending-near')).toBeTruthy();
    expect(screen.getByText('Burma Tabi')).toBeTruthy();
  });

  it('an empty Requests segment is only claimed once the window reaches before now', async () => {
    mockList
      .mockResolvedValueOnce(windowPage())
      .mockResolvedValueOnce(page([PAST_DONE])); // oldest row is in 2020 — before now

    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');
    fireEvent.press(screen.getByTestId('agenda-segment-pending'));

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    // Covered (the whole future is in hand) → the empty claim is now honest.
    expect(await screen.findByText('No new requests')).toBeTruthy();
  });

  it('the Upcoming segment fetches past far-future bookings so the nearest booking is not hidden', async () => {
    // Upcoming is the DEFAULT segment: with >50 far-future bookings the first
    // page holds only the far end of the horizon, and tomorrow's booking sorts
    // below it — the nearest, most actionable row must not be missing.
    const NEAR_UPCOMING: Appointment = {
      ...UPCOMING,
      id: 'apt-upcoming-near',
      startsAt: '2030-01-15T11:00:00.000Z',
      endsAt: '2030-01-15T12:00:00.000Z',
    };
    mockList
      .mockResolvedValueOnce(windowPage())
      .mockResolvedValueOnce(page([NEAR_UPCOMING, PAST_DONE]));

    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    // The coverage fetch fires on mount (no chip press needed)…
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith({
        scope: 'practitioner',
        limit: 50,
        cursor: 'cursor-1',
      }),
    );
    // …and the booking that had fallen off the window appears.
    expect(await screen.findByTestId('appointment-row-apt-upcoming-near')).toBeTruthy();
  });

  it('withholds the past empty state while the coverage fetch is still running', async () => {
    mockList.mockResolvedValueOnce(windowPage()).mockReturnValueOnce(
      new Promise<CursorPage<Appointment>>(() => {}),
    );
    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');

    fireEvent.press(screen.getByTestId('agenda-segment-past'));
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    // Uncovered: NO empty claim — the footer spinner speaks instead.
    expect(screen.queryByText('No past appointments')).toBeNull();
    expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('a re-focus refetch re-runs the coverage fetch so the gap cannot re-open (MINOR-9)', async () => {
    mockList
      .mockResolvedValueOnce(windowPage())
      // Coverage page 2 keeps a cursor — the agenda is deeper than one page.
      .mockResolvedValueOnce(page([PAST_DONE], { nextCursor: 'cursor-2', hasNextPage: true }))
      // The refocus refetch: a FRESH first page that again misses the day.
      .mockResolvedValueOnce(windowPage())
      .mockResolvedValueOnce(page([PAST_DONE]));

    const screen = renderScreen();
    await screen.findByTestId('appointment-row-apt-today');
    fireEvent.press(screen.getByTestId('agenda-segment-day'));
    fireEvent.press(screen.getByLabelText('Previous day'));
    expect(await screen.findByText('No appointments on Jan 14, 2030')).toBeTruthy();
    expect(mockList).toHaveBeenCalledTimes(2);

    act(() => mockOnRefocus?.());

    // The fresh first page reset the accumulation — the coverage fetch
    // re-runs (calls 3 + 4) instead of leaving the day falsely empty.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(4));
    expect(mockList).toHaveBeenNthCalledWith(4, {
      scope: 'practitioner',
      limit: 50,
      cursor: 'cursor-1',
    });
    expect(await screen.findByText('No appointments on Jan 14, 2030')).toBeTruthy();
  });
});
