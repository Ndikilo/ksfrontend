import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** Fallback for unmatched routes (deep links to nonexistent screens). */
export default function NotFound() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="heading">{t('notFound.title')}</Text>
      <Link href="/" style={{ marginTop: theme.spacing.lg }}>
        <Text variant="body" color="primary">
          {t('notFound.goHome')}
        </Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
