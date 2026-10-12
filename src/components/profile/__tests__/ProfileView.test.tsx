import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';
import type { ReactNode } from 'react';

import '@/i18n';
import { ThemeProvider } from '@/theme';
import type { User } from '@/types';

import { ProfileView } from '../ProfileView';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// Auth seam — ProfileView reads the session and both auth actions.
const mockSignOut = jest.fn();
const mockDeleteAccount = jest.fn();
const mockUseAuth = jest.fn();
jest.mock('@/store', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

// Screen chrome — stub SafeAreaView (no provider in tests).
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const USER: User = {
  id: 'u-1',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  role: 'patient',
  locale: 'en',
  emailVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const renderView = () =>
  render(
    <ThemeProvider>
      <ProfileView />
    </ThemeProvider>,
  );

/** Tap "Delete my account", then resolve the dialog with the button whose
 *  label starts with `label` (cancel vs the destructive confirm). */
const pressDeleteAndAnswer = (screen: ReturnType<typeof renderView>, label: string) => {
  fireEvent.press(screen.getByText('Delete my account'));
  expect(alertSpy).toHaveBeenCalledTimes(1);
  const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[];
  const chosen = buttons.find((button) => button.text?.startsWith(label));
  expect(chosen).toBeTruthy();
  act(() => {
    chosen?.onPress?.();
  });
};

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  jest.resetAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockUseAuth.mockReturnValue({
    status: 'authenticated',
    session: { token: 't', user: USER },
    signOut: mockSignOut,
    deleteAccount: mockDeleteAccount,
  });
  mockDeleteAccount.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('Account deletion (ProfileView)', () => {
  it('the destructive action confirms through a dialog and never calls the service directly', () => {
    const screen = renderView();

    fireEvent.press(screen.getByText('Delete my account'));

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('Delete your account?');
    // The consequence is spelled out before the user can confirm.
    expect(message).toContain('permanently');
    expect(buttons).toHaveLength(2);
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('cancelling the dialog leaves the account and the service untouched', () => {
    const screen = renderView();

    pressDeleteAndAnswer(screen, 'Cancel');

    expect(mockDeleteAccount).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('confirming deletes the account server-side', async () => {
    const screen = renderView();

    pressDeleteAndAnswer(screen, 'Delete permanently');

    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
    // No failure banner on the happy path.
    expect(screen.queryByText(/could not be deleted/)).toBeNull();
  });

  it('a failed deletion keeps the user signed in and shows a retryable banner', async () => {
    mockDeleteAccount.mockRejectedValueOnce({ status: 0, message: 'No connection.' });
    const screen = renderView();

    pressDeleteAndAnswer(screen, 'Delete permanently');

    expect(await screen.findByText(/could not be deleted/)).toBeTruthy();
    // The service was called exactly once — no silent retry, session intact
    // (AuthContext only clears it when the promise resolves).
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);
  });

  it('while deletion is in flight the control shows busy and cannot re-fire', async () => {
    let resolveDelete: () => void = () => {};
    mockDeleteAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const screen = renderView();

    pressDeleteAndAnswer(screen, 'Delete permanently');

    // In flight: the label is replaced by the spinner (Button `loading`)…
    await waitFor(() => expect(screen.queryByText('Delete my account')).toBeNull());
    // …the dialog cannot be re-opened (button disabled + re-entrancy guard),
    // and Sign out is locked for the duration.
    fireEvent.press(screen.queryByText('Delete my account') ?? screen.UNSAFE_root);
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete();
    });
    // The failure banner never showed: the happy path cleared the state.
    expect(screen.queryByText(/could not be deleted/)).toBeNull();
  });

  it('a re-entrant confirm press cannot start a second concurrent deletion', async () => {
    let resolveDelete: () => void = () => {};
    mockDeleteAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const screen = renderView();

    pressDeleteAndAnswer(screen, 'Delete permanently');
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));

    // The dialog is already open on a real device when a double-press lands:
    // fire the confirm again from the SAME dialog instance.
    const buttons = (alertSpy.mock.calls[0]?.[2] ?? []) as AlertButton[];
    const destructive = buttons.find((button) => button.text?.startsWith('Delete permanently'));
    await act(async () => {
      destructive?.onPress?.();
    });
    expect(mockDeleteAccount).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete();
    });
  });

  it('sign-out remains wired alongside the new action', () => {
    const screen = renderView();

    fireEvent.press(screen.getByText('Sign out'));

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
