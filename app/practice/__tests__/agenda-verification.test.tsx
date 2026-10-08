import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { Appointment, CursorPage, MyPractitioner } from '@/types';

import AgendaScreen from '../index';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — useFocusEffect runs its callback on every focus (like
// expo-router) and is captured so tests can drive a re-focus refetch.
let mockOnRefocus: (() => void) | undefined;
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: (callback: () => void) => {
    if (mockOnRefocus !== callback) {
      mockOnRefocus = callback;
      callback();
    }
  },
}));

// API seam — services only (useAsync imports the barrel for helpers).
const mockList = jest.fn();
const mockGetMine = jest.fn();
jest.mock('@/api/services', () => ({
  appointmentsService: {
    list: (...args: unknown[]) => mockList(...args),
    confirm: jest.fn(),
    cancel: jest.fn(),
  },
  practitionerService: {
    getMine: (...args: unknown[]) => mockGetMine(...args),
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
  startsAt: '2030-01-15T09:00:00.000Z',
  endsAt: '2030-01-15T10:00:00.000Z',
  priceXaf: 5000,
  cancellationNoticeHours: 24,
  cancellationFeeXaf: 0,
  lateCancellation: false,
  cancelledAt: null,
  cancelledByUserId: null,
  patientName: 'Amina Fon',
  practitionerName: null,
};

const page = (): CursorPage<Appointment> => ({
  data: [APPOINTMENT],
  meta: { count: 1, limit: 50, nextCursor: null, hasNextPage: false },
});

const mine = (verificationStatus: MyPractitioner['verificationStatus']): MyPractitioner => ({
  id: 'prof-1',
  userId: 'user-1',
  professionId: 'profession-1',
  prefix: 'Dr.',
  surname: 'Test',
  givenNames: 'Doctor',
  location: 'Douala',
  verificationStatus,
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
  mockList.mockResolvedValue(page());
  mockGetMine.mockResolvedValue(mine('verified'));
});

afterEach(async () => {
  // Drain pending macrotasks INSIDE act (act hygiene, qc-008 rule).
  await act(async () => {});
});

describe('Agenda verification banner (P7.T4)', () => {
  it('a pending_verification practitioner sees the calm under-review banner', async () => {
    mockGetMine.mockResolvedValue(mine('pending_verification'));
    const screen = renderScreen();

    expect(
      await screen.findByText(
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      ),
    ).toBeTruthy();
    // The agenda itself renders normally alongside the banner.
    expect(await screen.findByTestId('appointment-row-apt-1')).toBeTruthy();
  });

  it('an incomplete practitioner is told to finish setup', async () => {
    mockGetMine.mockResolvedValue(mine('incomplete'));
    const screen = renderScreen();

    expect(
      await screen.findByText(
        'Finish setting up your profile — patients cannot find or book you until your credentials are approved.',
      ),
    ).toBeTruthy();
  });

  it('a rejected practitioner is pointed at the Profile tab', async () => {
    mockGetMine.mockResolvedValue(mine('rejected'));
    const screen = renderScreen();

    expect(
      await screen.findByText(
        'Your credentials were not approved. Open the Profile tab to see the reason and send them again.',
      ),
    ).toBeTruthy();
  });

  it('a verified practitioner sees no banner', async () => {
    mockGetMine.mockResolvedValue(mine('verified'));
    const screen = renderScreen();

    await screen.findByTestId('appointment-row-apt-1');
    expect(
      screen.queryByText(
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      ),
    ).toBeNull();
  });

  it('the banner reflects the re-focus refetch (an approval clears it with a NEW call)', async () => {
    mockGetMine
      .mockResolvedValueOnce(mine('pending_verification'))
      .mockResolvedValueOnce(mine('verified'));
    const screen = renderScreen();
    expect(
      await screen.findByText(
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      ),
    ).toBeTruthy();

    act(() => mockOnRefocus?.());

    await act(async () => {});
    expect(mockGetMine).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText(
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      ),
    ).toBeNull();
  });

  it('a failed status check stays silent — the agenda and its own error Banner are unaffected', async () => {
    mockGetMine.mockRejectedValue({ status: 0, message: 'No connection.' });
    const screen = renderScreen();

    // The agenda renders; no verification banner, no crash.
    expect(await screen.findByTestId('appointment-row-apt-1')).toBeTruthy();
    expect(
      screen.queryByText(
        'Your credentials are under review. Patients cannot find or book you until they are approved — your calendar and profile stay editable.',
      ),
    ).toBeNull();
  });
});
