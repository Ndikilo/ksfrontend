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
  const { bg, fg, icon, border } = toneColors(theme.colors, tone);

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        { backgroundColor: bg, borderColor: border, borderRadius: theme.radius.md },
        style,
      ]}
    >
      <Ionicons name={ICONS[tone]} size={20} color={icon} />
      <Text variant="caption" style={{ color: fg, flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}

function toneColors(colors: ColorScheme, tone: Tone): {
  bg: string;
  fg: string;
  icon: string;
  border: string;
} {
  switch (tone) {
    case 'success':
      // Light-mode green on its tint is 2.75:1 — below even the 3:1 icon bar —
      // so the copy-safe token carries both copy and icon.
      return {
        bg: colors.successSurface,
        fg: colors.successText,
        icon: colors.successText,
        border: colors.success,
      };
    case 'error':
      // Copy in the copy-safe token (light red is 3.4:1, dark 3.9:1 — both
      // below AA text); red keeps icon/border (≥3:1 holds in both themes).
      return {
        bg: colors.dangerSurface,
        fg: colors.dangerText,
        icon: colors.danger,
        border: colors.danger,
      };
    case 'warning':
      // Amber on its tint fails AA in light mode (≈1.9:1); the copy-safe
      // warningText token carries copy and icon, border keeps the accent.
      return {
        bg: colors.warningSurface,
        fg: colors.warningText,
        icon: colors.warningText,
        border: colors.warning,
      };
    default:
      // Copy in the copy-safe token (dark blue is 3.2:1 — below AA text);
      // blue keeps icon/border (≥3:1 holds in both themes).
      return {
        bg: colors.infoSurface,
        fg: colors.infoText,
        icon: colors.info,
        border: colors.info,
      };
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
