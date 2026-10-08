import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AuthSession, CursorPage, Profession, User } from '@/types';

import PractitionerRegisterScreen from '../register';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — record Redirect targets and the post-registration hop.
const mockReplace = jest.fn();
const mockRedirect = jest.fn(({ href }: { href: string }) => null);
jest.mock('expo-router', () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  },
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

// API seam — services only (useAsync imports the barrel for helpers).
const mockProfessions = jest.fn();
const mockGetProfile = jest.fn();
const mockRegister = jest.fn();
const mockMe = jest.fn();
jest.mock('@/api/services', () => ({
  referenceService: {
    professions: (...args: unknown[]) => mockProfessions(...args),
    languages: jest.fn(),
  },
  accountService: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
  },
  practitionerService: {
    register: (...args: unknown[]) => mockRegister(...args),
  },
  authService: {
    me: (...args: unknown[]) => mockMe(...args),
  },
}));

// Auth seam — the guards read status + session role; authenticate is the
// session-refresh hop after the backend grants the role.
const mockUseAuth = jest.fn();
const mockAuthenticate = jest.fn();
jest.mock('@/store', () => ({
  ...jest.requireActual('@/store/roles'),
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const PATIENT: User = {
  id: 'pat-1',
  fullName: 'Ama Mbeki',
  email: 'ama@example.com',
  role: 'patient',
  locale: 'en',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const session = (user: User): AuthSession => ({ token: 't', user });

const PROFESSION: Profession = {
  id: 'prof-1',
  nameEn: 'General practitioner',
  nameFr: 'Médecin généraliste',
  prefixHint: 'Dr.',
};

const professionsPage = (): CursorPage<Profession> => ({
  data: [PROFESSION],
  meta: { count: 1, limit: 100, nextCursor: null, hasNextPage: false },
});

const renderScreen = () =>
  render(
    <ThemeProvider>
      <PractitionerRegisterScreen />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    session: session(PATIENT),
    authenticate: mockAuthenticate,
  });
  mockProfessions.mockResolvedValue(professionsPage());
  // No base profile yet by default — the form starts empty.
  mockGetProfile.mockRejectedValue({ status: 404, message: 'None.', code: 'NOT_FOUND' });
  mockMe.mockResolvedValue(PATIENT);
});

/**
 * Open a Select sheet and pick an option by label (the real trigger → sheet
 * path). Both triggers read "Select…" until chosen, so `slot` picks which —
 * the role sheet is rendered first. Options live INSIDE the Modal, so they
 * are only queryable once the sheet is open.
 */
const chooseOption = async (
  screen: ReturnType<typeof renderScreen>,
  slot: 0 | 1,
  option: string,
) => {
  fireEvent.press(screen.getAllByText('Select…')[slot]);
  fireEvent.press(await screen.findByText(option));
};

/** Flush the professions/prefill promises so the form is fully interactive. */
const flush = async () => {
  await act(async () => {});
};

describe('Practitioner registration (P7.T4)', () => {
  it('a patient session gets the registration form over the professions catalog', async () => {
    const screen = renderScreen();

    expect(screen.getByText('Join as a practitioner')).toBeTruthy();
    expect(mockProfessions).toHaveBeenCalledWith({ limit: 100 });
    // The profession catalog landed: the sheet opens with its options.
    await flush();
    fireEvent.press(screen.getAllByText('Select…')[1]);
    expect(await screen.findByText('General practitioner')).toBeTruthy();
  });

  it('required fields block submission before anything is sent', async () => {
    const screen = renderScreen();
    await flush();

    fireEvent.press(screen.getByText('Create practitioner profile'));

    // Both Selects and both name fields are marked required.
    expect(screen.getAllByText('Required').length).toBe(4);
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('the happy path registers, refreshes the granted role, and lands on the console', async () => {
    mockRegister.mockResolvedValue({
      id: 'prof-9',
      userId: 'pat-1',
      professionId: 'prof-1',
      prefix: null,
      surname: 'Mbeki',
      givenNames: 'Ama',
      location: null,
      verificationStatus: 'incomplete',
    });
    const screen = renderScreen();
    await flush();

    await chooseOption(screen, 0, 'Doctor');
    // The role trigger now reads "Doctor" — the one remaining "Select…" is
    // the profession sheet.
    await chooseOption(screen, 0, 'General practitioner');
    fireEvent.changeText(screen.getByLabelText('Surname'), 'Mbeki');
    fireEvent.changeText(screen.getByLabelText('Given names'), 'Ama');
    fireEvent.press(screen.getByText('Create practitioner profile'));

    // The REAL registration contract: catalog profession + consent + acceptTerms.
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        role: 'doctor',
        professionId: 'prof-1',
        surname: 'Mbeki',
        givenNames: 'Ama',
        location: undefined,
        consentVersion: '1.0',
        acceptTerms: true,
      }),
    );

    // The role grant lives on the better-auth user — the session is re-read,
    // and a still-stale 'patient' is corrected to the granted role so the
    // console guard cannot bounce a fresh practitioner.
    await waitFor(() => expect(mockAuthenticate).toHaveBeenCalled());
    expect(mockAuthenticate).toHaveBeenCalledWith({
      token: 't',
      user: expect.objectContaining({ role: 'doctor' }),
    });
    // Never a bare success screen: the console is the next step.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/practice'));
  });

  it('the base profile prefills the name fields', async () => {
    mockGetProfile.mockResolvedValue({
      id: 'p1',
      userId: 'pat-1',
      surname: 'Nkemtaji',
      givenNames: 'Emmanuel',
      phone: null,
      dateOfBirth: null,
      sex: null,
      avatarFileKey: null,
    });
    const screen = renderScreen();

    await waitFor(() =>
      expect(screen.getByLabelText('Surname').props.value).toBe('Nkemtaji'),
    );
    expect(screen.getByLabelText('Given names').props.value).toBe('Emmanuel');
  });

  it('a professions failure is retryable and the retry issues a NEW call', async () => {
    mockProfessions.mockRejectedValue({ status: 500, message: 'Boom', code: 'INTERNAL' });
    const screen = renderScreen();

    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    mockProfessions.mockResolvedValue(professionsPage());
    fireEvent.press(screen.getByText('Try again'));
    expect(await screen.findByText('Join as a practitioner')).toBeTruthy();
    await flush();
    fireEvent.press(screen.getAllByText('Select…')[1]);
    expect(await screen.findByText('General practitioner')).toBeTruthy();
    expect(mockProfessions).toHaveBeenCalledTimes(2);
  });

  it('an already-practitioner session is bounced to the console', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: session({ ...PATIENT, role: 'doctor' }),
      authenticate: mockAuthenticate,
    });
    renderScreen();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/practice' }));
  });

  it('a signed-out visitor is redirected to login', () => {
    mockUseAuth.mockReturnValue({ status: 'unauthenticated', session: null });
    renderScreen();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/login' }));
  });
});
