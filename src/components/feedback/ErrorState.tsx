import { StyleSheet, View } from 'react-native';

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
  const message = typeof error === 'string' ? error : error.message;

  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      <Text variant="subheading" color="danger" align="center">
        Something went wrong
      </Text>
      <Text variant="body" color="textMuted" align="center">
        {message}
      </Text>
      {onRetry ? (
        <Button title="Try again" variant="outline" onPress={onRetry} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  action: { marginTop: 16 },
});
