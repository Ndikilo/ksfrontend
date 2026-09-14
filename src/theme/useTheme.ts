import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useThemeContext } from './ThemeProvider';
import type { Theme } from './theme';

/** The primary hook components use to read design tokens. */
export function useTheme(): Theme {
  return useThemeContext().theme;
}

/**
 * Build theme-aware StyleSheets without recreating them on every render.
 *
 *   const styles = useThemedStyles((t) => ({
 *     card: { backgroundColor: t.colors.surface, padding: t.spacing.lg },
 *   }));
 */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: Theme) => T,
): T {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
