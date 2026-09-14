import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/theme';

/** A one-pixel themed separator. `spacing` adds vertical margin around it. */
export function Divider({
  spacing = 0,
  style,
  ...rest
}: ViewProps & { spacing?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          height: 1,
          backgroundColor: theme.colors.border,
          marginVertical: spacing,
        },
        style,
      ]}
      {...rest}
    />
  );
}
