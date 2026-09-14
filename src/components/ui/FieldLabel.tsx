import { StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

/**
 * Shared form-field label ("Surname:" with an optional red required asterisk).
 * Used by Input, Select and DateField so every field label looks identical.
 */
export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const theme = useTheme();
  return (
    <Text variant="bodyStrong" style={styles.label}>
      {label}:
      {required ? (
        <Text variant="bodyStrong" style={{ color: theme.colors.danger }}>
          {' '}
          *
        </Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
});
