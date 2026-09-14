import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme, type ColorScheme } from '@/theme';

type Tone = 'success' | 'error' | 'info' | 'warning';

export type BannerProps = {
  message: string;
  tone?: Tone;
  style?: ViewStyle;
};

const ICONS: Record<Tone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

/** Inline status banner (e.g. the green "Password reset successful"). Reusable. */
export function Banner({ message, tone = 'info', style }: BannerProps) {
  const theme = useTheme();
  const { bg, fg, border } = toneColors(theme.colors, tone);

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: bg, borderColor: border, borderRadius: theme.radius.md },
        style,
      ]}
    >
      <Ionicons name={ICONS[tone]} size={20} color={fg} />
      <Text variant="caption" style={{ color: fg, flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

function toneColors(colors: ColorScheme, tone: Tone) {
  switch (tone) {
    case 'success':
      return { bg: colors.successSurface, fg: colors.success, border: colors.success };
    case 'error':
      return { bg: colors.dangerSurface, fg: colors.danger, border: colors.danger };
    case 'warning':
      return { bg: colors.warningSurface, fg: colors.warning, border: colors.warning };
    default:
      return { bg: colors.infoSurface, fg: colors.info, border: colors.info };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
});
