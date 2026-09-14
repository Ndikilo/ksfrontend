import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Variant = 'overlay' | 'surface' | 'ghost' | 'dark';

export type IconButtonProps = {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  /** Icon size in points (default 20). The touch target scales with it. */
  size?: number;
  variant?: Variant;
  /** Override the icon color (defaults per variant). */
  color?: string;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: ViewStyle;
};

/**
 * Circular, tappable icon button. Reusable for back/close/action affordances.
 * `overlay` is the translucent-dark style used on top of imagery (onboarding
 * back arrow); `surface` sits on a card; `ghost` is transparent.
 */
export function IconButton({
  name,
  onPress,
  size = 20,
  variant = 'surface',
  color,
  disabled = false,
  accessibilityLabel,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const diameter = size * 2;

  const backgrounds: Record<Variant, string> = {
    overlay: 'rgba(0, 0, 0, 0.4)',
    surface: theme.colors.surface,
    ghost: 'transparent',
    dark: theme.colors.text,
  };
  const onDark = variant === 'overlay' || variant === 'dark';
  const iconColor = color ?? (onDark ? theme.colors.textInverted : theme.colors.text);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={theme.layout.hitSlop}
      style={({ pressed }) => [
        styles.base,
        {
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
          backgroundColor: backgrounds[variant],
        },
        variant === 'surface' && theme.shadows.sm,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
});
