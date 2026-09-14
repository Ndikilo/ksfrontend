import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { Images, LOGO_ASPECT_RATIO } from '@/constants';
import { useTheme } from '@/theme';

export type LogoProps = {
  /** Rendered width in points; height is derived from the logo's aspect ratio. */
  width?: number;
  /** Wrap the logo in a white rounded card (as on the splash screen). */
  card?: boolean;
  style?: ViewStyle;
};

/** The Kana Sante logo lockup. Single source for rendering the brand mark. */
export function Logo({ width = 160, card = false, style }: LogoProps) {
  const theme = useTheme();
  const image = (
    <Image
      source={Images.logo}
      resizeMode="contain"
      style={{ width, height: width / LOGO_ASPECT_RATIO }}
    />
  );

  if (!card) return <View style={style}>{image}</View>;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.xl,
        },
        theme.shadows.sm,
        style,
      ]}
    >
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', justifyContent: 'center' },
});
