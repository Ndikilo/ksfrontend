import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';
import { useOffline } from '@/hooks';
import { spacing, useTheme } from '@/theme';

/**
 * Full-width connectivity bar shown above the app content while the device is
 * offline. Edge bar (no radius), warning tokens, live region so screen readers
 * announce the transition. Content stays usable — requests made while offline
 * fail with the localized offline message (see api/client.ts).
 */
export function OfflineBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const offline = useOffline();

  if (!offline) return null;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.warningSurface,
          borderBottomColor: theme.colors.warning,
        },
      ]}
    >
      <Ionicons name="cloud-offline" size={16} color={theme.colors.warning} />
      <Text variant="caption" style={[styles.label, { color: theme.colors.warning }]}>
        {t('offline.banner')}
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    flex: 1,
  },
});
