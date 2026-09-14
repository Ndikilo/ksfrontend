import { StyleSheet, View } from 'react-native';

import { useTheme, type ColorScheme } from '@/theme';

import { Text } from './Text';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

/** Small status pill. Tone selects a matching surface + text color pair. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const theme = useTheme();
  const { bg, fg } = toneColors(theme.colors, tone);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderRadius: theme.radius.full },
      ]}
    >
      <Text variant="label" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

function toneColors(colors: ColorScheme, tone: Tone): { bg: string; fg: string } {
  switch (tone) {
    case 'primary':
      return { bg: colors.primaryMuted, fg: colors.primary };
    case 'success':
      return { bg: colors.successSurface, fg: colors.success };
    case 'warning':
      return { bg: colors.warningSurface, fg: colors.warning };
    case 'danger':
      return { bg: colors.dangerSurface, fg: colors.danger };
    case 'info':
      return { bg: colors.infoSurface, fg: colors.info };
    default:
      return { bg: colors.surfaceAlt, fg: colors.textMuted };
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
