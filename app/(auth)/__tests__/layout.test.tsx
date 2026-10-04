import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AuthSession, User } from '@/types';

import AuthLayout from '../_layout';

// Expo Router seam — record Redirect targets; the inner Stack renders children.
const mockRedirect = jest.fn(({ href }: { href: string }) => null);
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  Stack: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: () => ({}),
}));

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
      <AuthLayout />
    </ThemeProvider>,
  );

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Auth group redirect (P7.T1)', () => {
  it('a practitioner signing in lands on the practitioner console', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('doctor') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/practice' }));
  });

  it('a patient signing in lands on the patient tabs', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)' }));
  });

  it('an unauthenticated visitor stays on the auth stack', () => {
    mockUseAuth.mockReturnValue({ status: 'unauthenticated', session: null });
    renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
