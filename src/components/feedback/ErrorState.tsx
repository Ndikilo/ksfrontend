import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import type { ApiError } from '@/types';

type ErrorStateProps = {
  error: ApiError | string;
  onRetry?: () => void;
};

/** Consistent error UI with an optional retry — pair with `useAsync`. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const message = typeof error === 'string' ? error : error.message;

  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      {/* Copy-safe danger token: `danger` on white is only 3.9:1 in light mode. */}
      <Text variant="subheading" color="dangerText" align="center">
        {t('errors.heading')}
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {message}
      </Text>
      {onRetry ? (
        <Button
          title={t('common.retry')}
          variant="outline"
          onPress={onRetry}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  action: { marginTop: 16 },
});
