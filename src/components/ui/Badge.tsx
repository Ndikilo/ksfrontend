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
      // Copy uses the copy-safe tokens: status colors on their tints fail
      // WCAG AA text (4.5:1) in at least one theme (light green is 2.75:1,
      // light red 3.4:1, light amber 1.9:1, dark blue 3.2:1).
      return { bg: colors.successSurface, fg: colors.successText };
    case 'warning':
      return { bg: colors.warningSurface, fg: colors.warningText };
    case 'danger':
      return { bg: colors.dangerSurface, fg: colors.dangerText };
    case 'info':
      return { bg: colors.infoSurface, fg: colors.infoText };
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
