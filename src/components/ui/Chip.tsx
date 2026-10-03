import { useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type ChipProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> & {
  /** Visible chip text (e.g. a day label or a time). */
  label: string;
  /** Selected chips fill with the primary color and announce the state. */
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Selectable pill for compact choice rows (day pickers, time slots, quick
 * categories). Token-driven like Button, with pressed feedback, a 48dp touch
 * target, and `selected` exposed to screen readers via `accessibilityState`.
 * Pass `accessibilityLabel` for a richer announcement than the visible label
 * (e.g. time + consultation type + selection state).
 */
export function Chip({ label, selected = false, disabled = false, style, ...rest }: ChipProps) {
  const theme = useTheme();
  const container = useMemo(
    () => [
      styles.base,
      {
        backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
        borderRadius: theme.radius.control,
        minHeight: theme.layout.minTouchTarget,
        paddingHorizontal: theme.spacing.lg,
      },
      style,
    ],
    [theme, selected, style],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      hitSlop={theme.layout.hitSlop}
      style={({ pressed }) => [
        ...container,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...rest}
    >
      <Text variant="label" color={selected ? 'onPrimary' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
