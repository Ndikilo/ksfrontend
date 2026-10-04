import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AuthSession, User } from '@/types';

import PracticeLayout from '../_layout';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Expo Router seam — record Redirect targets; render tab titles as text so a
// rendered Tabs navigator is distinguishable from a redirect.
const mockRedirect = jest.fn(({ href }: { href: string }) => null);
jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  const Tabs = ({ children }: { children: ReactNode }) => children;
  // A declared tab renders its localized title.
  Tabs.Screen = function TabScreenTitle({ options }: { options?: { title?: string } }) {
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
  id: 'pro-1',
  fullName: 'Dr Test',
  email: 'pro@example.com',
  role,
  locale: 'en',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});

const renderLayout = () =>
  render(
    <ThemeProvider>
      <PracticeLayout />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Practitioner console layout guard (P7.T1)', () => {
  it('a doctor session gets the practitioner tabs (agenda + profile)', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('doctor') } satisfies AuthSession,
    });
    const screen = renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText('Agenda')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('a nurse session gets the console too', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('nurse') } satisfies AuthSession,
    });
    const screen = renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(screen.getByText('Agenda')).toBeTruthy();
  });

  it('a patient session is bounced back to the patient tabs', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)' }));
  });

  it('an admin session is bounced back too (no console on mobile)', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('admin') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)' }));
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
    expect(screen.queryByText('Agenda')).toBeNull();
  });
});
