import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export type PageIndicatorProps = {
  count: number;
  index: number;
  style?: ViewStyle;
};

/**
 * Row of equal-size pagination dots; the active one is filled with the brand
 * color, the rest are muted. Reusable for any carousel/pager.
 */
export function PageIndicator({ count, index, style }: PageIndicatorProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: i === index ? theme.colors.primary : theme.colors.borderStrong },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
