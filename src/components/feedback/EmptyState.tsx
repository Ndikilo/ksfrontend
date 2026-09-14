import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type EmptyStateProps = {
  title: string;
  message?: string;
  /** Optional icon/illustration rendered above the title. */
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

/** Reusable "nothing here yet" / call-to-action block for empty lists. */
export function EmptyState({ title, message, icon, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl }]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="subheading" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textMuted" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  icon: { marginBottom: 8 },
  action: { marginTop: 16 },
});
