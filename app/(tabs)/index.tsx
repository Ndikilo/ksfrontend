import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, Divider, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';

/**
 * Home screen. Purely composed from UI primitives + theme tokens — no raw
 * <Text>, no hard-coded colors or spacing. This is the pattern every screen
 * should follow.
 */
export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { session } = useAuth();
  const name = session?.user.fullName ?? 'there';

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={styles.header}>
        <Text variant="title">{t('home.greeting', { name })}</Text>
        <Text variant="body" color="textMuted">
          {t('home.subtitle')}
        </Text>
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <Text variant="subheading">{t('home.nextAppointment')}</Text>
          <Badge label={t('home.scheduled')} tone="success" />
        </View>
        <Divider spacing={theme.spacing.md} />
        <Text variant="body">{t('home.appointmentWith')}</Text>
        <Text variant="caption" color="textMuted">
          {t('home.appointmentWhen')}
        </Text>
      </Card>

      <Card elevation="none">
        <Text variant="subheading" style={{ marginBottom: theme.spacing.sm }}>
          {t('home.tipsTitle')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('home.tipsBody')}
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
