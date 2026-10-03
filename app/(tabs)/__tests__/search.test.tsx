import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { PractitionerCard, Profession } from '@/types';

import SearchScreen from '../search';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — result rows navigate to the practitioner page.
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

// API seam — services only (isApiError comes from the barrel's helpers).
const mockSearch = jest.fn();
const mockProfessions = jest.fn();
jest.mock('@/api/services', () => ({
  searchService: { practitioners: (...args: unknown[]) => mockSearch(...args) },
  referenceService: { professions: (...args: unknown[]) => mockProfessions(...args) },
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const PROFESSION: Profession = {
  id: 'prof-nurse',
  nameEn: 'Nurse',
  nameFr: 'Infirmier',
  prefixHint: null,
};

const HOME_VISIT_PRACTITIONER: PractitionerCard = {
  id: 'pract-1',
  professionId: PROFESSION.id,
  profession: PROFESSION,
  languages: [],
  prefix: null,
  surname: 'Nkotto',
  givenNames: 'Ada',
  specialty: null,
  location: 'Douala',
  consultationTypes: ['home_visit'],
  consultationFeeXaf: 5000,
  rating: { average: 4.8, count: 12 },
  nextAvailableAt: null,
  distanceKm: null,
  photoUrl: null,
};

const renderScreen = () =>
  render(
    <ThemeProvider>
      <SearchScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockProfessions.mockResolvedValue({ data: [PROFESSION], meta: {} });
  mockSearch.mockResolvedValue({
    data: [HOME_VISIT_PRACTITIONER],
    meta: {
      count: 1,
      page: 1,
      pageSize: 10,
      total: 1,
      pageCount: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  });
});

describe('SearchScreen consultation filter chips', () => {
  it('BLOCKER (Review 006): renders home visit with a real label, never the raw i18n key', async () => {
    const screen = renderScreen();

    // The filter chip for home_visit resolves through the typed
    // CONSULTATION_TYPE_KEYS map — `search.home_visit` does not exist, so the
    // old dynamic-key construction rendered the literal key instead.
    expect(await screen.findByText('Home visit')).toBeTruthy();
    expect(screen.queryByText('search.home_visit')).toBeNull();
    // The other types keep their labels too.
    expect(screen.getByText('In person')).toBeTruthy();
    expect(screen.getByText('Video')).toBeTruthy();
  });
});
