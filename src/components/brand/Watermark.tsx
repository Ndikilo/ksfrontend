import { Image, StyleSheet, View } from 'react-native';

import { Images } from '@/constants';

/**
 * Faint decorative logos bleeding off two corners — the subtle brand texture
 * seen on the splash and onboarding screens. Purely decorative: it fills its
 * parent, ignores touches, and should sit behind the screen content.
 *
 * Swap in an icon-only asset via `source` once available for a cleaner look.
 */
export function Watermark({
  source = Images.logo,
  opacity = 0.05,
  size = 200,
}: {
  source?: number;
  opacity?: number;
  size?: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image
        source={source}
        resizeMode="contain"
        style={[styles.mark, { width: size, height: size, opacity, top: 70, right: -size * 0.28 }]}
      />
      <Image
        source={source}
        resizeMode="contain"
        style={[styles.mark, { width: size, height: size, opacity, bottom: 60, left: -size * 0.28 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'absolute' },
});
