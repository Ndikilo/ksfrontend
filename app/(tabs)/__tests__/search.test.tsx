import { render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { PractitionerCard, Profession } from '@/types';

import SearchScreen from '../search';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — result rows navigate to the practitioner page; the
// home quick-category chips (P8.T2) deep-link in with a `category` param,
// configurable per test.
const mockPush = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
  useLocalSearchParams: () => mockParams,
}));

// API seam — services only (isApiError comes from the barrel's helpers).
// consultationTypeParam is part of the services barrel and runs BEFORE the
// request, so the mock must carry the real join behavior.
const mockSearch = jest.fn();
const mockProfessions = jest.fn();
jest.mock('@/api/services', () => ({
  searchService: { practitioners: (...args: unknown[]) => mockSearch(...args) },
  referenceService: { professions: (...args: unknown[]) => mockProfessions(...args) },
  consultationTypeParam: (types: string[]) =>
    types.length > 0 ? types.join(',') : undefined,
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
  mockParams = {};
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

describe('SearchScreen home-category pre-filters (P8.T2)', () => {
  it('a specialty category (cardiologist) sends the specialty stem on the FIRST query', async () => {
    mockParams = { category: 'cardiologist' };
    const screen = renderScreen();

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ specialty: 'Cardiolog' }),
      ),
    );
    // The pre-filter is never invisible: it renders as a selected chip.
    expect(screen.getByText(/Cardiologist/)).toBeTruthy();
  });

  it('a specialty category (dentists) maps to the dentistry stem', async () => {
    mockParams = { category: 'dentists' };
    const screen = renderScreen();

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ specialty: 'Dentist' })),
    );
    expect(screen.getByText(/Dentists/)).toBeTruthy();
  });

  it('a profession category (nurses) resolves the professionId from the catalog', async () => {
    mockParams = { category: 'nurses' };
    renderScreen();

    // The first query fires before the professions list arrives (no filter
    // yet); once it lands, the Nurse profession is resolved by name and the
    // query re-runs with its backend id.
    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ professionId: 'prof-nurse' }),
      ),
    );
  });

  it('a profession category (doctors) matches the doctor profession by name', async () => {
    mockParams = { category: 'doctors' };
    mockProfessions.mockResolvedValue({
      data: [
        PROFESSION,
        { id: 'prof-doctor', nameEn: 'Doctor (General Practitioner)', nameFr: 'Médecin', prefixHint: null },
      ],
      meta: {},
    });
    renderScreen();

    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ professionId: 'prof-doctor' }),
      ),
    );
  });

  it('an unknown category is ignored (plain search)', async () => {
    mockParams = { category: 'surgery-from-a-stale-link' };
    const screen = renderScreen();

    await screen.findByText('Home visit');
    expect(mockSearch).toHaveBeenCalledWith(
      expect.not.objectContaining({ specialty: expect.anything(), professionId: expect.anything() }),
    );
    expect(screen.queryByText(/Cardiologist/)).toBeNull();
  });
});
