import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AuthSession, User } from '@/types';

import TabsLayout from '../_layout';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — record Redirect targets; render tab titles as text so a
// rendered Tabs navigator is distinguishable from a redirect.
const mockRedirect = jest.fn(({ href }: { href: string }) => null);
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Tabs = ({ children }: { children: ReactNode }) => children;
  // A declared tab renders its localized title.
  Tabs.Screen = function TabScreenTitle({
    options,
  }: {
    options?: { title?: string; href?: string | null };
  }) {
    // href: null marks a routable-but-hidden screen (Find Care, P8.T4) —
    // it must not render a tab title.
    if (options?.href === null) return null;
    return options?.title ? <Text>{options.title}</Text> : null;
  };
  return {
    Redirect: (props: { href: string }) => mockRedirect(props),
    Tabs,
  };
});

// Auth seam — the guard reads status + session role from the store. The real
// (pure) role helpers stay wired in: the guard under test is their consumer.
const mockUseAuth = jest.fn();
jest.mock('@/store', () => ({
  ...jest.requireActual('@/store/roles'),
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

const user = (role: User['role']): User => ({
  id: 'user-1',
  fullName: 'Test User',
  email: 'test@example.com',
  role,
  locale: 'en',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const renderLayout = () =>
  render(
    <ThemeProvider>
      <TabsLayout />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Patient tabs layout guard (P7.T1)', () => {
  it('a practitioner session is redirected to the practitioner console', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('doctor') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/practice' }));
  });

  it('a nurse session is redirected too', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('nurse') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/practice' }));
  });

  it('a patient session gets the 5-tab set (P8.T4), no redirect', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    const screen = renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
    // P8.T4 tab set, in order: Home, Appointments, Chats, Health Record,
    // Account — Chats + Health Record are the MVP placeholders.
    expect(screen.getByText('Home')).toBeTruthy();
    expect(screen.getByText('Appointments')).toBeTruthy();
    expect(screen.getByText('Chats')).toBeTruthy();
    expect(screen.getByText('Health Record')).toBeTruthy();
    expect(screen.getByText('Account')).toBeTruthy();
    // Find Care is routable but NOT a tab anymore (href: null) — it is
    // reached from the home search entry + category chips instead.
    expect(screen.queryByText('Find Care')).toBeNull();
    expect(screen.queryByText('Profile')).toBeNull();
  });

  it('an admin session rides the patient app (out of mobile scope)', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('admin') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('a signed-out visitor is redirected to login', () => {
    mockUseAuth.mockReturnValue({ status: 'unauthenticated', session: null });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/login' }));
  });

  it('session restore (loading) shows a spinner and decides nothing yet', () => {
    mockUseAuth.mockReturnValue({ status: 'loading', session: null });
    const screen = renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.queryByText('Home')).toBeNull();
  });
});
