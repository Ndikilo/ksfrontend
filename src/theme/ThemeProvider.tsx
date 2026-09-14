import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { getTheme, type Theme } from './theme';

type ColorSchemeName = 'light' | 'dark';
type ThemePreference = ColorSchemeName | 'system';

type ThemeContextValue = {
  theme: Theme;
  /** The user's explicit choice, or `system` to follow the OS. */
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Wraps the app once (in the root layout) and exposes the resolved theme to
 * every descendant via `useTheme()`. Respects the OS setting by default and
 * lets the user override it.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: ColorSchemeName =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return { theme: getTheme(resolved), preference, setPreference };
  }, [preference, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Access the full theme context (theme + preference controls). */
export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within a <ThemeProvider>.');
  }
  return ctx;
}
