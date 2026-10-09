import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { PractitionerCard, Profession } from '@/types';

import { PractitionerCardView } from '../PractitionerCardView';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const PROFESSION: Profession = {
  id: 'prof-doctor',
  nameEn: 'Doctor (General Practitioner)',
  nameFr: 'Médecin (généraliste)',
  prefixHint: 'Dr.',
};

const item = (overrides: Partial<PractitionerCard> = {}): PractitionerCard => ({
  id: 'pract-1',
  professionId: PROFESSION.id,
  profession: PROFESSION,
  languages: [],
  prefix: 'Dr.',
  surname: 'Nkotto',
  givenNames: 'Ada',
  specialty: 'Cardiology',
  location: 'Douala',
  consultationTypes: ['in_person'],
  consultationFeeXaf: 2500000,
  rating: { average: 4.9, count: 120 },
  nextAvailableAt: '2030-01-15T09:00:00Z',
  distanceKm: null,
  photoUrl: null,
  ...overrides,
});

const renderCard = (card: PractitionerCard = item()) =>
  render(
    <ThemeProvider>
      <PractitionerCardView
        item={card}
        professionLabel="Doctor (General Practitioner)"
        onPress={() => {}}
      />
    </ThemeProvider>,
  );

/**
 * Review 014 pins for the shared discovery card: the availability teaser is
 * CLINIC-local (§5 teaser-timezone rule), the fee formats through the in-app
 * language (§7 format locale), and icons are Ionicons — never emoji.
 */
describe('PractitionerCardView (Review 014)', () => {
  it('MAJOR-1: renders the next-available teaser at the CLINIC hour, not the runner offset', () => {
    // 08:00 UTC = 09:00 on the Douala wall clock (Africa/Douala, fixed +1).
    // Whatever timezone the test runner runs in (a UTC runner would read
    // 08:00, a UTC-5 runner 03:00), the patient must see the clinic's 09:00 —
    // the pin fails the moment the card drops the explicit timeZone.
    const screen = renderCard(item({ nextAvailableAt: '2030-01-15T08:00:00Z' }));
    const teaser = screen.getByText(/2030/);
    expect(teaser.props.children).toMatch(/9:00/);
    expect(teaser.props.children).not.toMatch(/8:00/); // UTC runner offset
    expect(teaser.props.children).not.toMatch(/3:00/); // UTC-5 runner offset
  });

  it('MAJOR-1: a teaser on the UTC/Douala date boundary renders the Douala calendar date', () => {
    // 2030-01-15T23:30:00Z is already Jan 16, 00:30 in Douala — the card must
    // say the 16th, because that is when the slot happens back home.
    const screen = renderCard(item({ nextAvailableAt: '2030-01-15T23:30:00Z' }));
    const teaser = screen.getByText(/2030/);
    expect(teaser.props.children).toMatch(/Jan 16, 2030/);
    expect(teaser.props.children).not.toMatch(/Jan 15, 2030/); // the UTC date
    expect(teaser.props.children).toMatch(/12:30/);
  });

  it('MINOR-4: formats the fee through the in-app language, not the device locale', () => {
    const screen = renderCard(item({ consultationFeeXaf: 2500000 }));
    // en grouping (the i18n instance defaults to en in tests); the fee is
    // rendered from `toLocaleString(i18n.language)` — a runner with a
    // fr/de device locale would group differently without the explicit arg.
    expect(screen.getByText(/2,500,000 XAF/)).toBeTruthy();
  });

  it('MINOR-5: rating/location lines carry no emoji — Ionicons accents only', () => {
    const screen = renderCard();
    expect(screen.getByText(/4\.9 \(120\)/)).toBeTruthy();
    expect(screen.getByText('Douala')).toBeTruthy();
    expect(screen.queryByText(/⭐/)).toBeNull();
    expect(screen.queryByText(/📍/)).toBeNull();
  });

  it('MINOR-5: the profession line is plain text — no emoji glyph before the label', () => {
    const screen = renderCard();
    expect(screen.getByText(/Doctor \(General Practitioner\) • Cardiology/)).toBeTruthy();
    expect(screen.queryByText(/🩺|🫀|🦷/)).toBeNull();
  });
});
