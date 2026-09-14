import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export type ScreenProps = {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). Set false for flex layouts. */
  scroll?: boolean;
  /** Which safe-area edges to inset (default top + bottom). */
  edges?: Edge[];
  /** Remove the default horizontal padding (for edge-to-edge lists). */
  noPadding?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/**
 * Standard screen wrapper: applies the themed background, safe-area insets and
 * consistent screen padding. Every route renders inside a <Screen> so spacing
 * and insets are handled in exactly one place.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  noPadding = false,
  style,
  contentStyle,
}: ScreenProps) {
  const theme = useTheme();
  const padding = noPadding ? undefined : theme.layout.screenPadding;

  const inner = (
    <View style={[!scroll && styles.flex, { padding }, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: theme.colors.background }, style]}
    >
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.grow, { padding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={contentStyle}>{children}</View>
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
});
