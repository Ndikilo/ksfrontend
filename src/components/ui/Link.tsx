import { Pressable, type ViewStyle } from 'react-native';

import { useTheme, type ColorScheme } from '@/theme';

import { Text, type TextProps } from './Text';

export type LinkProps = {
  label: string;
  onPress: () => void;
  color?: keyof ColorScheme;
  variant?: TextProps['variant'];
  underline?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

/**
 * Inline, tappable text link (e.g. "Sign up"). Reusable anywhere a textual
 * action is needed instead of a full button.
 */
export function Link({
  label,
  onPress,
  color = 'primary',
  variant = 'body',
  underline = true,
  disabled = false,
  style,
}: LinkProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      disabled={disabled}
      onPress={onPress}
      hitSlop={theme.layout.hitSlop}
      style={({ pressed }) => [{ opacity: pressed || disabled ? 0.6 : 1 }, style]}
    >
      <Text
        variant={variant}
        color={color}
        style={underline ? { textDecorationLine: 'underline' } : undefined}
      >
        {label}
      </Text>
    </Pressable>
  );
}
