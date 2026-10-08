import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AvailabilityException, AvailabilityRule } from '@/types';

import AvailabilityScreen from '../availability';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — useFocusEffect runs its callback on every focus (like
// expo-router) and is captured so tests can drive a re-focus refetch.
let mockOnRefocus: (() => void) | undefined;
jest.mock('expo-router', () => ({
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
const mockListRules = jest.fn();
const mockReplaceRules = jest.fn();
const mockListExceptions = jest.fn();
const mockCreateException = jest.fn();
const mockDeleteException = jest.fn();
jest.mock('@/api/services', () => ({
  availabilityService: {
    listRules: (...args: unknown[]) => mockListRules(...args),
    replaceRules: (...args: unknown[]) => mockReplaceRules(...args),
    listExceptions: (...args: unknown[]) => mockListExceptions(...args),
    createException: (...args: unknown[]) => mockCreateException(...args),
    deleteException: (...args: unknown[]) => mockDeleteException(...args),
  },
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Native date picker seam — the picker "returns" a fixed date the moment it
// is presented (the only part that is native). DateField maps that to its
// onChange(Date), exactly like a real set event on Android/iOS. The ref guard
// matters: DateField hands the picker a fresh onChange each render, so firing
// per-effect-run would loop forever.
const mockPickedDate = new Date(2026, 11, 25); // 2026-12-25, local calendar
jest.mock('@react-native-community/datetimepicker', () => {
  const { useEffect, useRef } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockPicker = ({ onChange }: { onChange?: (event: unknown, date?: Date) => void }) => {
    const fired = useRef(false);
    useEffect(() => {
      if (!fired.current) {
        fired.current = true;
        onChange?.({ type: 'set' }, mockPickedDate);
      }
    }, [onChange]);
    return <View />;
  };
  return { __esModule: true, default: MockPicker };
});

const RULE: AvailabilityRule = {
  id: 'rule-1',
  weekday: 1, // Monday
  startTime: '09:00',
  endTime: '17:00',
  slotDurationMin: 30,
  consultationTypes: ['in_person'],
  locationId: null,
  timezone: 'Africa/Douala',
  validFrom: null,
  validTo: null,
};

const BLOCKED_DAY: AvailabilityException = {
  id: 'exc-1',
  date: '2026-12-25',
  kind: 'blocked',
  startTime: null,
  endTime: null,
  consultationTypes: null,
  locationId: null,
};

const EXTRA_HOURS: AvailabilityException = {
  id: 'exc-2',
  date: '2026-12-27',
  kind: 'extra',
  startTime: '14:00',
  endTime: '18:00',
  consultationTypes: ['video'],
  locationId: null,
};

const rulesPage = (data: AvailabilityRule[]) => ({
  data,
  meta: { count: data.length, limit: data.length, nextCursor: null, hasNextPage: false },
});
const exceptionsPage = (data: AvailabilityException[]) => ({
  data,
  meta: { count: data.length, limit: data.length, nextCursor: null, hasNextPage: false },
});

// Same formatter the screen uses — the screen passes the in-app language
// explicitly (codified standard §7), 'en' under the test harness.
const expectedDate = (key: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'utc' }).format(
    new Date(`${key}T12:00:00Z`),
  );

const renderScreen = () =>
  render(
    <ThemeProvider>
      <AvailabilityScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockOnRefocus = undefined;
  mockListRules.mockResolvedValue(rulesPage([RULE]));
  mockListExceptions.mockResolvedValue(exceptionsPage([BLOCKED_DAY, EXTRA_HOURS]));
});

afterEach(async () => {
  // Drain pending macrotasks INSIDE act so they cannot fire during the NEXT
  // test's render (act hygiene, qc-008 rule).
  await act(async () => {});
});

describe('Practitioner availability editor (P7.T2)', () => {
  it('lists the weekly rules with day, window, duration and types', async () => {
    const screen = renderScreen();

    expect(await screen.findByText('Monday')).toBeTruthy();
    expect(screen.getByText(/09:00 – 17:00/)).toBeTruthy();
    expect(screen.getByText(/30 min/)).toBeTruthy();
    expect(screen.getByText('In person')).toBeTruthy();
    expect(mockListRules).toHaveBeenCalledTimes(1);
  });

  it('creates a rule through the replace contract and adopts the server id', async () => {
    mockListRules.mockResolvedValue(rulesPage([]));
    const serverRule = { ...RULE, id: 'srv-1' };
    // Held in flight so the OPTIMISTIC phase is observable.
    let resolveReplace: (page: ReturnType<typeof rulesPage>) => void = () => {};
    mockReplaceRules.mockReturnValue(
      new Promise((resolve) => {
        resolveReplace = resolve;
      }),
    );
    const screen = renderScreen();

    fireEvent.press(await screen.findByText('Add weekly rule')); // empty-state action
    // Defaults: Monday 09:00–17:00, 30 min, in person — save directly.
    fireEvent.press(screen.getByTestId('rule-save'));

    // The PUT carries the FULL set, wire-shaped (no client id on the body).
    await waitFor(() =>
      expect(mockReplaceRules).toHaveBeenCalledWith([
        {
          weekday: 1,
          startTime: '09:00',
          endTime: '17:00',
          slotDurationMin: 30,
          consultationTypes: ['in_person'],
          locationId: null,
          timezone: 'Africa/Douala',
          validFrom: null,
          validTo: null,
        },
      ]),
    );
    // While the PUT is in flight the optimistic row (client id) is shown…
    expect(screen.getByTestId('rule-card-rule-temp-1')).toBeTruthy();
    // …and the server response replaces it with the real id.
    await act(async () => {
      resolveReplace(rulesPage([serverRule]));
    });
    expect(await screen.findByTestId('rule-card-srv-1')).toBeTruthy();
    expect(screen.queryByTestId('rule-card-rule-temp-1')).toBeNull();
  });

  it('rejects an end time before the start time without calling the API', async () => {
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByText('Add weekly rule'));
    // Open the "To" picker (its trigger shows the current end, 17:00)…
    fireEvent.press(screen.getByText('17:00'));
    // …and pick 00:00 — before the default 09:00 start. (The picker sheet
    // virtualizes; the first options are the ones rendered to press.)
    fireEvent.press(screen.getByText('00:00'));
    fireEvent.press(screen.getByTestId('rule-save'));

    expect(await screen.findByText('The end time must be after the start time.')).toBeTruthy();
    expect(mockReplaceRules).not.toHaveBeenCalled();
    // The form stays open for correction.
    expect(screen.getByTestId('rule-form')).toBeTruthy();
  });

  it('warns when a new rule overlaps an existing one on the same day', async () => {
    const screen = renderScreen();
    await screen.findByText('Monday');

    // The default draft (Monday 09:00–17:00) collides with RULE itself.
    fireEvent.press(screen.getByText('Add weekly rule'));
    fireEvent.press(screen.getByTestId('rule-save'));

    expect(
      await screen.findByText('This rule overlaps an existing rule on the same day.'),
    ).toBeTruthy();
    expect(mockReplaceRules).not.toHaveBeenCalled();
  });

  it('a failed rules save reopens the form prefilled with the entered values and the error inside', async () => {
    const serverRule = { ...RULE, id: 'srv-wed', weekday: 3 };
    mockReplaceRules.mockRejectedValueOnce({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByText('Add weekly rule'));
    // Move the draft to Wednesday so it does not collide with RULE.
    fireEvent.press(screen.getByTestId('rule-weekday-3'));
    fireEvent.press(screen.getByTestId('rule-save'));

    // The PUT failed — the entered draft must NOT be destroyed (Review 013
    // MAJOR-2): the form is back, Wednesday is still selected, and the error
    // Banner renders INSIDE the form card.
    expect(await screen.findByTestId('rule-form')).toBeTruthy();
    const form = screen.getByTestId('rule-form');
    expect(within(form).getByText('Boom')).toBeTruthy();
    const wednesday = within(form).getByTestId('rule-weekday-3');
    expect(wednesday.props.accessibilityState?.selected).toBe(true);

    // A corrected attempt succeeds: the PUT re-issues with the SAME draft
    // (the full replace set: the existing Monday rule + the Wednesday draft)
    // and the form closes for good.
    mockReplaceRules.mockResolvedValue(rulesPage([serverRule]));
    fireEvent.press(within(form).getByTestId('rule-save'));
    await waitFor(() =>
      expect(mockReplaceRules).toHaveBeenLastCalledWith([
        expect.objectContaining({ weekday: 1 }),
        expect.objectContaining({ weekday: 3, startTime: '09:00', endTime: '17:00' }),
      ]),
    );
    expect(await screen.findByTestId('rule-card-srv-wed')).toBeTruthy();
    expect(screen.queryByTestId('rule-form')).toBeNull();
  });

  it('deletes a rule only after a confirm dialog stating the booking consequence', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockReplaceRules.mockResolvedValue(rulesPage([]));
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByLabelText('Delete rule — Monday'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Delete this rule?');
    // The consequence is spelled out: these slot keys stop being bookable.
    expect(message).toContain('Patients will no longer be offered these times.');
    expect(mockReplaceRules).not.toHaveBeenCalled();

    const destructive = buttons?.find((button) => button?.text === 'Delete rule');
    await act(async () => {
      destructive?.onPress?.();
    });
    await waitFor(() => expect(mockReplaceRules).toHaveBeenCalledWith([]));
    expect(await screen.findByText('No weekly rules yet')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('rolls a failed rules save back and shows the error over the restored row', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockReplaceRules.mockRejectedValueOnce({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByLabelText('Delete rule — Monday'));
    const destructive = alertSpy.mock.calls[0][2]?.find(
      (button) => button?.text === 'Delete rule',
    );
    await act(async () => {
      destructive?.onPress?.();
    });

    // The row comes back and the failure is visible — not silent.
    expect(await screen.findByText('Boom')).toBeTruthy();
    expect(screen.getByText('Monday')).toBeTruthy();
    alertSpy.mockRestore();
  });

  it('shows an error state with a retry that issues a NEW request', async () => {
    mockListRules.mockRejectedValue({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Boom')).toBeTruthy();

    mockListRules.mockResolvedValue(rulesPage([RULE]));
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(screen.getByText('Monday')).toBeTruthy());
    // The retry re-issued the failed GET (never toHaveBeenCalledWith alone).
    expect(mockListRules).toHaveBeenCalledTimes(2);
  });

  it('shows the rules empty state explaining that rules drive the bookable calendar', async () => {
    mockListRules.mockResolvedValue(rulesPage([]));
    const screen = renderScreen();

    expect(await screen.findByText('No weekly rules yet')).toBeTruthy();
    expect(
      screen.getByText(
        'Weekly rules decide the times patients can book. Add one to open your calendar.',
      ),
    ).toBeTruthy();
  });

  it('renders exceptions as closed-vs-extra with dates and windows', async () => {
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));

    // Full-day block: a Closed badge + "Closed all day".
    expect(await screen.findByTestId('exception-card-exc-1')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.getByText('Closed all day')).toBeTruthy();
    // Extra hours: a badge, the window and its consultation type.
    expect(screen.getByText('Extra hours')).toBeTruthy();
    expect(screen.getByText('14:00 – 18:00')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
    expect(screen.getByText(expectedDate('2026-12-27'))).toBeTruthy();
  });

  it('shows the exceptions empty state with the add action', async () => {
    mockListExceptions.mockResolvedValue(exceptionsPage([]));
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));

    expect(await screen.findByText('No exceptions')).toBeTruthy();
    expect(
      screen.getByText(
        'Close a day or add extra hours on a specific date. Exceptions override your weekly rules.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Add exception')).toBeTruthy();
  });

  it('creates an all-day closed exception via POST', async () => {
    mockListExceptions.mockResolvedValue(exceptionsPage([]));
    const created = { ...BLOCKED_DAY, id: 'srv-exc-1' };
    mockCreateException.mockResolvedValue(created);
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));
    fireEvent.press(await screen.findByText('Add exception'));
    // Present the native picker — the seam answers 2026-12-25.
    fireEvent.press(screen.getByText('dd/mm/yyyy'));
    // Kind defaults to Closed + All day; save.
    await waitFor(() => expect(screen.getByText('25/12/2026')).toBeTruthy());
    fireEvent.press(screen.getByTestId('exception-save'));

    await waitFor(() =>
      expect(mockCreateException).toHaveBeenCalledWith({
        date: '2026-12-25',
        kind: 'blocked',
        startTime: null,
        endTime: null,
        consultationTypes: null,
        locationId: null,
      }),
    );
    // The optimistic temp card is replaced by the server row.
    expect(await screen.findByTestId('exception-card-srv-exc-1')).toBeTruthy();
    expect(mockDeleteException).not.toHaveBeenCalled();
  });

  it('a failed exception create reopens the form prefilled with the entered values and the error inside', async () => {
    mockCreateException.mockRejectedValueOnce({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));
    fireEvent.press(await screen.findByText('Add exception'));
    // Present the native picker — the seam answers 2026-12-25 — then save.
    fireEvent.press(screen.getByText('dd/mm/yyyy'));
    await waitFor(() => expect(screen.getByText('25/12/2026')).toBeTruthy());
    fireEvent.press(screen.getByTestId('exception-save'));

    // The POST failed — the entered draft must NOT be destroyed (Review 013
    // MAJOR-2): the form reopens with the picked date still in it and the
    // error Banner rendered INSIDE the form card.
    expect(await screen.findByTestId('exception-form')).toBeTruthy();
    const form = screen.getByTestId('exception-form');
    expect(within(form).getByText('Boom')).toBeTruthy();
    expect(within(form).getByText('25/12/2026')).toBeTruthy();

    // The retried save succeeds with the SAME draft and the form closes.
    mockCreateException.mockResolvedValue({ ...BLOCKED_DAY, id: 'srv-exc-retry' });
    fireEvent.press(within(form).getByTestId('exception-save'));
    await waitFor(() =>
      expect(mockCreateException).toHaveBeenLastCalledWith(
        expect.objectContaining({ date: '2026-12-25', kind: 'blocked' }),
      ),
    );
    expect(await screen.findByTestId('exception-card-srv-exc-retry')).toBeTruthy();
    expect(screen.queryByTestId('exception-form')).toBeNull();
  });

  it('edits an exception by creating the replacement first, then deleting the old row', async () => {
    // The backend has NO exception update: the screen saves a new row and
    // removes the old one only after the create succeeded.
    const updated = { ...EXTRA_HOURS, id: 'srv-exc-2' };
    mockCreateException.mockResolvedValue(updated);
    mockDeleteException.mockResolvedValue(undefined);
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));
    fireEvent.press(screen.getByLabelText(`Edit exception — ${expectedDate('2026-12-27')}`));

    // The form opens PREFILLED with the row's kind (Extra hours) and window.
    expect(screen.getByTestId('exception-form')).toBeTruthy();
    expect(screen.getByText('14:00')).toBeTruthy();
    fireEvent.press(screen.getByTestId('exception-save'));

    await waitFor(() =>
      expect(mockCreateException).toHaveBeenCalledWith({
        date: '2026-12-27',
        kind: 'extra',
        startTime: '14:00',
        endTime: '18:00',
        consultationTypes: ['video'],
        locationId: null,
      }),
    );
    await waitFor(() => expect(mockDeleteException).toHaveBeenCalledWith('exc-2'));
    // CREATE lands before DELETE — a failed edit can never lose the row.
    expect(mockCreateException.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeleteException.mock.invocationCallOrder[0],
    );
    expect(await screen.findByTestId('exception-card-srv-exc-2')).toBeTruthy();
    expect(screen.queryByTestId('exception-card-exc-2')).toBeNull();
  });

  it('deleting a blocked exception confirms that the times reopen', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockDeleteException.mockResolvedValue(undefined);
    const screen = renderScreen();
    await screen.findByText('Monday');

    fireEvent.press(screen.getByTestId('availability-segment-exceptions'));
    await screen.findByTestId('exception-card-exc-1');
    fireEvent.press(screen.getByLabelText(`Delete exception — ${expectedDate('2026-12-25')}`));

    const [, message] = alertSpy.mock.calls[0];
    expect(message).toContain('The blocked times on this date become bookable again.');

    const destructive = alertSpy.mock.calls[0][2]?.find(
      (button) => button?.text === 'Delete exception',
    );
    await act(async () => {
      destructive?.onPress?.();
    });
    await waitFor(() => expect(mockDeleteException).toHaveBeenCalledWith('exc-1'));
    // The blocked day is gone; the unrelated exception stays.
    expect(await screen.findByTestId('exception-card-exc-2')).toBeTruthy();
    expect(screen.queryByTestId('exception-card-exc-1')).toBeNull();
    alertSpy.mockRestore();
  });

  it('a failed re-focus refetch shows a Banner over the stale rows', async () => {
    const screen = renderScreen();
    await screen.findByText('Monday');

    mockListRules.mockRejectedValueOnce({ status: 0, code: 'OFFLINE', message: 'No connection.' });
    act(() => mockOnRefocus?.());

    // The failure is VISIBLE, the stale rows stay mounted, no full-screen
    // spinner replaces them — never a silent refetch failure.
    expect(await screen.findByText('No connection.')).toBeTruthy();
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.queryByTestId('availability-spinner')).toBeNull();
  });
});
