import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

/** Labelled checkbox (e.g. "Remember me"). Reusable in forms and lists. */
export function Checkbox({ checked, onChange, label, disabled, style }: CheckboxProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={theme.layout.hitSlop}
      onPress={() => onChange(!checked)}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      <View
        style={[
          styles.box,
          {
            borderRadius: theme.radius.sm,
            borderColor: checked ? theme.colors.primary : theme.colors.borderStrong,
            backgroundColor: checked ? theme.colors.primary : 'transparent',
          },
        ]}
      >
        {checked ? <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} /> : null}
      </View>
      {label ? (
        <Text variant="body" color="textMuted">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
});
