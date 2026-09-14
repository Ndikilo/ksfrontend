import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme, type ShadowKey } from '@/theme';

export type CardProps = ViewProps & {
  /** Elevation preset (default `sm`). Set `none` for a flat, bordered card. */
  elevation?: ShadowKey;
  padded?: boolean;
};

/** A themed surface container — the base for list rows, panels and sheets. */
export function Card({ elevation = 'sm', padded = true, style, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderColor: theme.colors.border,
          padding: padded ? theme.spacing.lg : 0,
        },
        theme.shadows[elevation],
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
});
