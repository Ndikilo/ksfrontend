import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme, type ColorScheme, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  /** Type-scale variant from the theme (default: `body`). */
  variant?: TypographyVariant;
  /** Semantic color role, or `primary` shorthand. Defaults to `text`. */
  color?: keyof ColorScheme;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
};

/**
 * The ONLY text primitive used across the app. It pulls font styling from the
 * type scale and color from semantic roles, so text is automatically
 * theme/dark-mode aware and typographically consistent. Never use RN's raw
 * <Text> directly in screens.
 */
export function Text({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}
    />
  );
}
