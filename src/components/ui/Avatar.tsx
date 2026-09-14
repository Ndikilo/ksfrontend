import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { initials } from '@/utils';

import { Text } from './Text';

type AvatarProps = {
  name: string;
  uri?: string;
  size?: number;
};

/** Circular avatar that falls back to the user's initials when no image. */
export function Avatar({ name, uri, size = 44 }: AvatarProps) {
  const theme = useTheme();
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimension]} />;
  }

  return (
    <View
      style={[
        styles.fallback,
        dimension,
        { backgroundColor: theme.colors.primaryMuted },
      ]}
    >
      <Text variant="bodyStrong" style={{ color: theme.colors.primary }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { resizeMode: 'cover' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
