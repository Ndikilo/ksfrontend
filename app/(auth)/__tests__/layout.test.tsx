import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { AuthSession, User } from '@/types';

import AuthLayout from '../_layout';

// Expo Router seam — record Redirect targets; the inner Stack renders children.
// `useLocalSearchParams` is configurable so tests can carry the deep-return
// `redirect` param the booking flow's sign-in gate passes through — and the
// `mode: 'attach'` param the phone-OTP screens use for signed-in users.
const mockRedirect = jest.fn(({ href }: { href: string }) => null);
let mockParams: { redirect?: string; mode?: string } = {};
jest.mock('expo-router', () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
  Stack: ({ children }: { children: ReactNode }) => children,
  useLocalSearchParams: () => mockParams,
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
  mockParams = {};
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

describe('Auth group deep-return vs role routing (Review 012 minor 1)', () => {
  it('a practitioner with a redirect param still lands on the console, NOT the redirect', () => {
    // Completing a patient-flow sign-in gate must not drop a practitioner
    // into a patient-only flow that would 403 at submit.
    mockParams = { redirect: '/booking/pro-1' };
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('nurse') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/practice' }));
    expect(mockRedirect).not.toHaveBeenCalledWith(
      expect.objectContaining({ href: '/booking/pro-1' }),
    );
  });

  it('a patient with a redirect param has the deep-return honored', () => {
    mockParams = { redirect: '/booking/pro-1' };
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: '/booking/pro-1' }),
    );
  });

  it('a non-path redirect (protocol-relative) is ignored for patients too', () => {
    mockParams = { redirect: '//evil.example.com' };
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)' }));
  });
});

describe('Auth group attach mode (P8.T6)', () => {
  it('a signed-in user on the phone-OTP screens in attach mode stays on the stack', () => {
    // Profile → "Add a phone number" runs the flow AS a signed-in user; the
    // authenticated redirect must not bounce them out mid-OTP.
    mockParams = { mode: 'attach' };
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('the redirect still applies to every other screen while signed in', () => {
    mockParams = { mode: 'signup' };
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      session: { token: 't', user: user('patient') } satisfies AuthSession,
    });
    renderLayout();
    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)' }));
  });
});
