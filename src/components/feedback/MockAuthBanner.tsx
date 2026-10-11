import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { spacing, useTheme } from '@/theme';

/**
 * Full-width warning shown above the app content while mock authentication is
 * active. `env.mockAuth` is dev/demo-only (release builds force it off with a
 * loud error — see config/env.ts), and the mock auth backend accepts any
 * well-formed code by design — which is exactly why a demo must be visibly
 * labeled: the OTP-complaint retrospective showed a mock demo can be mistaken
 * for the real app. Same global-chrome placement and warning treatment as
 * OfflineBanner: applies the top safe-area inset itself (SDK 54 Android is
 * edge-to-edge and iOS draws under the status bar).
 */
export function MockAuthBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!env.mockAuth) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.warningSurface,
          borderBottomColor: theme.colors.warning,
          paddingTop: insets.top + spacing.md,
        },
      ]}
    >
      <Ionicons name="flask" size={20} color={theme.colors.warning} />
      <Text variant="caption" style={[styles.label, { color: theme.colors.warningText }]}>
        {t('demoMode.banner')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    flex: 1,
  },
});
