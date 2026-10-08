import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { PractitionerCard, Profession } from '@/types';

import HomeScreen from '../index';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — record navigation + expose the focus callback so tests
// can simulate a RE-focus (the real hook runs it again on tab switches).
const mockPush = jest.fn();
let latestFocusEffect: () => void = () => {};
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    useFocusEffect: (callback: () => void) => {
      latestFocusEffect = callback;
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// API seam — services only (isApiError comes from the barrel's helpers).
const mockSearch = jest.fn();
jest.mock('@/api/services', () => ({
  searchService: { practitioners: (...args: unknown[]) => mockSearch(...args) },
}));

// Auth seam — the greeting reads the session user's full name.
const mockUseAuth = jest.fn();
jest.mock('@/store', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Greeting clock seam — pin the bucket so the header assertions are
// deterministic (the window boundaries themselves are unit-tested in
// src/utils/__tests__/greeting.test.ts).
jest.mock('@/utils', () => ({
  ...jest.requireActual('@/utils'),
  greetingBucketForDate: () => 'morning',
}));

const PROFESSION: Profession = {
  id: 'prof-doctor',
  nameEn: 'Doctor (General Practitioner)',
  nameFr: 'Médecin (généraliste)',
  prefixHint: 'Dr.',
};

const practitioner = (id: string, surname: string): PractitionerCard => ({
  id,
  professionId: PROFESSION.id,
  profession: PROFESSION,
  languages: [],
  prefix: 'Dr.',
  surname,
  givenNames: 'Ada',
  specialty: 'Cardiology',
  location: 'Douala',
  consultationTypes: ['in_person'],
  consultationFeeXaf: null,
  rating: { average: 4.9, count: 120 },
  nextAvailableAt: null,
  distanceKm: null,
  photoUrl: null,
});

const EIGHT = ['Nkotto', 'Mbarga', 'Fouda', 'Tchoumi', 'Ngo_Bell', 'Essomba', 'Kamdem', 'Njoya'];

const pageOf = (surnames: string[]) => ({
  data: surnames.map((surname, index) => practitioner(`pract-${index}`, surname)),
  meta: {
    count: surnames.length,
    page: 1,
    pageSize: 10,
    total: surnames.length,
    pageCount: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
});

const renderScreen = (fullName = 'Ada Nkotto') => {
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    session: {
      token: 't',
      user: { id: 'user-1', fullName, email: 'a@b.c', role: 'patient', locale: 'en' },
    },
  });
  return render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  jest.resetAllMocks();
  mockSearch.mockResolvedValue(pageOf(EIGHT));
});

describe('Home greeting (P8.T1)', () => {
  it('greets with the bucket phrase and the FIRST name from the session', () => {
    const screen = renderScreen('Ada Nkotto');
    // Bucket pinned to 'morning' by the clock seam; only the given name shows.
    expect(screen.getByText('Good morning, Ada 👋')).toBeTruthy();
  });

  it('falls back to a nameless greeting when the session carries no name', () => {
    const screen = renderScreen('   ');
    expect(screen.getByText('Good morning 👋')).toBeTruthy();
  });
});

describe('Home search entry + quick categories (P8.T2)', () => {
  it('the search entry navigates to Find Care', () => {
    const screen = renderScreen();
    fireEvent.press(screen.getByTestId('home-search-entry'));
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it.each(['Doctors', 'Nurses', 'Cardiologist', 'Dentists'])(
    'the %s chip navigates to pre-filtered search results',
    (label) => {
      const screen = renderScreen();
      fireEvent.press(screen.getByText(label));
      const category = label.toLowerCase();
      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/search', params: { category } }),
      );
    },
  );
});

describe('Doctors-near-you carousel (P8.T3)', () => {
  it('renders 8 cards (PRD: 6–8) and opens the practitioner page on tap', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getAllByText('⭐ 4.9 (120)')).toHaveLength(8));

    fireEvent.press(screen.getByText('Dr. Ada Nkotto'));
    expect(mockPush).toHaveBeenCalledWith('/practitioner/pract-0');
  });

  it('renders 6 cards when the window returns 6 (PRD minimum)', async () => {
    mockSearch.mockResolvedValue(pageOf(EIGHT.slice(0, 6)));
    const screen = renderScreen();
    await waitFor(() => expect(screen.getAllByText('⭐ 4.9 (120)')).toHaveLength(6));
  });

  it('runs the graceful no-location fallback: rating sort, no city, honest header', async () => {
    const screen = renderScreen();
    await screen.findByText('Top-rated doctors');
    // No location source exists — the request must NOT pretend otherwise:
    // no city filter, no distance sort (the API 422s on distance without
    // lat+lng), just the top-rated fallback documented in nearbyQuery.
    expect(mockSearch).toHaveBeenCalledWith({ sort: 'rating' });
    expect(screen.queryByText('Doctors in')).toBeNull();
  });

  it('shows skeletons on first load', () => {
    mockSearch.mockReturnValue(new Promise(() => undefined)); // never settles
    const screen = renderScreen();
    expect(screen.queryByTestId('nearby-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('nearby-list')).toBeNull();
  });

  it('first-load failure shows an ErrorState whose retry RE-ISSUES the request', async () => {
    mockSearch.mockRejectedValueOnce({ status: 0, message: 'Network error', source: 'client' });
    const screen = renderScreen();
    await screen.findByText('Something went wrong');
    expect(screen.queryByTestId('nearby-list')).toBeNull();

    mockSearch.mockResolvedValue(pageOf(EIGHT));
    fireEvent.press(screen.getByText('Try again'));
    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Top-rated doctors')).toBeTruthy();
    await waitFor(() => expect(screen.getAllByText('⭐ 4.9 (120)')).toHaveLength(8));
  });

  it('an empty successful window says so honestly and offers the full directory', async () => {
    mockSearch.mockResolvedValue(pageOf([]));
    const screen = renderScreen();
    // No location filter ran, so an empty page IS the full window — the
    // copy may claim "none yet" (standard §7 window honesty).
    await screen.findByText('No practitioners yet');
    fireEvent.press(screen.getByText('Browse all practitioners'));
    expect(mockPush).toHaveBeenCalledWith('/search');
  });

  it('a failed RE-focus refetch keeps the cards mounted and raises a Banner', async () => {
    const screen = renderScreen();
    await waitFor(() => expect(screen.getAllByText('⭐ 4.9 (120)')).toHaveLength(8));

    mockSearch.mockRejectedValueOnce({ status: 0, message: 'Network error', source: 'client' });
    // Simulate leaving the tab and coming back (hasFocused is already true).
    act(() => {
      latestFocusEffect();
    });
    await screen.findByText('Could not refresh — the list shown is the last one loaded.');
    // Stale-while-revalidate: the previously loaded cards stay mounted.
    expect(screen.getAllByText('⭐ 4.9 (120)')).toHaveLength(8);
    expect(mockSearch).toHaveBeenCalledTimes(2);
  });
});

describe('Health tips (P8.T5)', () => {
  it('renders the three static localized cards', () => {
    const screen = renderScreen();
    expect(screen.getByText('Health tips')).toBeTruthy();
    expect(screen.getByText('How much sugar is okay?')).toBeTruthy();
    expect(screen.getByText('Want to sleep better?')).toBeTruthy();
    expect(screen.getByText('Should soda be a daily drink?')).toBeTruthy();
  });
});
