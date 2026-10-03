import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { useOffline } from '@/hooks';
import { spacing, useTheme } from '@/theme';

/**
 * Full-width connectivity bar shown above the app content while the device is
 * offline. Global chrome mounted above the router: applies the top safe-area
 * inset itself (SDK 54 Android is edge-to-edge and iOS draws under the status
 * bar — nothing user-facing renders at y=0). Edge bar (no radius), warning
 * tokens with the copy-safe `warningText`, Android live region plus an
 * explicit announcement on the online→offline transition (iOS has no
 * live-region equivalent). Content stays usable — requests made while offline
 * fail with the localized offline message (see api/client.ts).
 */
export function OfflineBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const offline = useOffline();
  const insets = useSafeAreaInsets();
  const wasOffline = useRef(false);

  // VoiceOver has no live region — announce the transition to offline
  // explicitly (Android additionally announces via the live region below).
  useEffect(() => {
    if (offline && !wasOffline.current) {
      AccessibilityInfo.announceForAccessibility(t('offline.banner'));
    }
    wasOffline.current = offline;
  }, [offline, t]);

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
          paddingTop: insets.top + spacing.md,
        },
      ]}
    >
      <Ionicons name="cloud-offline" size={20} color={theme.colors.warning} />
      <Text variant="caption" style={[styles.label, { color: theme.colors.warningText }]}>
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
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  label: {
    flex: 1,
  },
});
