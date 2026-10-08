import { fireEvent, render, act } from '@testing-library/react-native';

import i18n from '@/i18n'; // importing the instance initializes i18next for useTranslation
import { ThemeProvider } from '@/theme';
import type { Appointment } from '@/types';

import { AppointmentRow } from '../AppointmentRow';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — rows navigate to the appointment detail route.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
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
  // List-only persona names (P7.T1) — this component reads them via contextName.
  patientName: null,
  practitionerName: null,
};

const renderRow = (contextName?: string) =>
  render(
    <ThemeProvider>
      <AppointmentRow appointment={APPOINTMENT} contextName={contextName} />
    </ThemeProvider>,
  );

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});

describe('AppointmentRow (P7.T1 persona naming)', () => {
  it('renders the context name as the row primary line, type below it', () => {
    const screen = renderRow('Amina Fon');
    expect(screen.getByText('Amina Fon')).toBeTruthy();
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.getByText('5,000 XAF')).toBeTruthy();
  });

  it('without a context name the consultation type stays the primary line', () => {
    const screen = renderRow();
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.queryByText('Amina Fon')).toBeNull();
  });

  it('leads the accessibility label with the context name (Review 012 MAJOR)', () => {
    const screen = renderRow('Amina Fon');
    const row = screen.getByTestId('appointment-row-apt-1');
    const label = row.props.accessibilityLabel as string;
    // The persona name leads; the rest keeps the type/when/price/state order.
    expect(label.startsWith('Amina Fon, In person, ')).toBe(true);
    expect(label.indexOf('In person')).toBeLessThan(label.indexOf('5,000 XAF'));
    expect(label.indexOf('5,000 XAF')).toBeLessThan(label.indexOf('Confirmed'));
  });

  it('pushes the appointment detail route on tap', () => {
    const screen = renderRow('Amina Fon');
    fireEvent.press(screen.getByTestId('appointment-row-apt-1'));
    expect(mockPush).toHaveBeenCalledWith('/appointments/apt-1');
  });

  it('formats the price in the UI language (i18n.language, Review 012 minor 3)', async () => {
    const screen = renderRow();
    // English default: comma grouping.
    expect(screen.getByText('5,000 XAF')).toBeTruthy();

    await act(async () => {
      await i18n.changeLanguage('fr');
    });
    // The row must follow i18n.language — a bare toLocaleString() would keep
    // the runtime default locale and fail this pin. Expected computed with the
    // same Intl so the assertion is ICU-build independent.
    const expected = `${(5000).toLocaleString('fr')} XAF`;
    expect(screen.getByText(expected)).toBeTruthy();
  });
});
