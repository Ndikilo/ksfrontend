import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { authService, isApiError, setAuthToken, setUnauthorizedHandler } from '@/api';
import { StorageKeys } from '@/constants';
import type { AuthSession, Credentials } from '@/types';
import { logger, storage } from '@/utils';

// Re-export so screens can `import { useAuth } from '@/store'` and get types too.

/**
 * App-wide authentication state (Single Responsibility: owns the session and
 * keeps the API client + secure storage in sync). Screens consume `useAuth()`;
 * they never read the token directly.
 */
type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
  signIn: (credentials: Credentials) => Promise<void>;
  /** Adopt an already-obtained session (e.g. after registration OTP verify). */
  authenticate: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  /** Persist (or clear) the session everywhere: state, API client, storage. */
  const applySession = useCallback(async (next: AuthSession | null) => {
    setSession(next);
    setAuthToken(next?.token ?? null);
    if (next) {
      await storage.setJSON(StorageKeys.authSession, next);
      setStatus('authenticated');
    } else {
      await storage.remove(StorageKeys.authSession);
      setStatus('unauthenticated');
    }
  }, []);

  const signIn = useCallback(
    async (credentials: Credentials) => {
      const next = await authService.login(credentials);
      await applySession(next);
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if the server call fails, clear the local session.
      logger.warn('auth', 'Logout request failed; clearing session locally', error);
    }
    await applySession(null);
  }, [applySession]);

  // Restore a persisted session on cold start, and force sign-out on any 401.
  useEffect(() => {
    setUnauthorizedHandler(() => void applySession(null));

    (async () => {
      const stored = await storage.getJSON<AuthSession>(StorageKeys.authSession);
      if (!stored?.token) {
        setStatus('unauthenticated');
        return;
      }
      await applySession(stored);

      // Re-validate the bearer token against the backend: a revoked session is
      // cleared, but an offline device keeps its stored session until it can ask.
      try {
        const user = await authService.me();
        if (user) {
          await applySession({ token: stored.token, user });
        } else {
          await applySession(null);
        }
      } catch (error) {
        if (isApiError(error) && error.status !== 0) {
          await applySession(null);
        } else {
          logger.warn('auth', 'Session check skipped (offline); keeping stored session');
        }
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, signIn, authenticate: applySession, signOut }),
    [status, session, signIn, applySession, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access auth state and actions from any component. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}
