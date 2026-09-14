import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  /** Optional element rendered before the label (e.g. an icon). */
  leftAccessory?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * The single button primitive. All variants/sizes are driven by theme tokens,
 * so a brand tweak updates every button. Handles loading and disabled states,
 * press feedback, and accessibility out of the box.
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  leftAccessory,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const { container, label, spinnerColor } = useMemo(
    () => resolveVariant(theme, variant, size),
    [theme, variant, size],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      hitSlop={theme.layout.hitSlop}
      style={({ pressed }) => [
        styles.base,
        container,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View style={styles.content}>
          {leftAccessory}
          <Text variant="bodyStrong" style={label}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Maps (variant, size) to concrete container/label styles from the theme. */
function resolveVariant(theme: Theme, variant: Variant, size: Size) {
  const { colors, radius, spacing } = theme;

  const sizes: Record<Size, ViewStyle> = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, minHeight: 36 },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 48 },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, minHeight: 56 },
  };

  const variants: Record<Variant, { container: ViewStyle; textColor: string }> = {
    primary: { container: { backgroundColor: colors.primary }, textColor: colors.onPrimary },
    secondary: {
      container: { backgroundColor: colors.surfaceAlt },
      textColor: colors.text,
    },
    outline: {
      container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
      textColor: colors.text,
    },
    ghost: { container: { backgroundColor: 'transparent' }, textColor: colors.primary },
    danger: { container: { backgroundColor: colors.danger }, textColor: colors.onPrimary },
  };

  const v = variants[variant];
  return {
    container: { ...sizes[size], borderRadius: radius.control, ...v.container },
    label: { color: v.textColor },
    spinnerColor: v.textColor,
  };
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
