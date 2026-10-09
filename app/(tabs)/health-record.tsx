import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { Badge, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Health Record tab (P8.T4) — an MVP placeholder, deliberately
 * non-functional: a "coming soon" badge, an explanation of what will be
 * stored here, and NO action affordance that could pretend to work. Records
 * and documents arrive after the MVP; the tab exists so the bottom-nav set
 * matches the PRD and the route is deep-linkable from day one.
 */
export default function HealthRecordScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <View style={styles.header}>
        <Text variant="title">{t('placeholders.healthRecordTitle')}</Text>
        <Badge label={t('placeholders.comingSoon')} tone="info" />
      </View>
      {/* Message-led composition (Review 014 MINOR-7): the screen title lives
          in the header above — the empty state leads with its own line, so
          the title is never read twice on one screen. */}
      <EmptyState
        icon={
          <Ionicons name="document-text-outline" size={48} color={theme.colors.textMuted} />
        }
        title={t('placeholders.healthRecordEmptyTitle')}
        message={t('placeholders.healthRecordMessage')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
