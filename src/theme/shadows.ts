import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform elevation presets. iOS uses shadow* props; Android uses
 * `elevation`. Spread a preset onto any surface: `style={[styles.card, shadows.md]}`.
 */
type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const make = (elevation: number, radius: number, opacity: number, y: number): Shadow =>
  Platform.select<Shadow>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: { elevation },
    default: {},
  })!;

export const shadows = {
  none: make(0, 0, 0, 0),
  sm: make(2, 4, 0.08, 1),
  md: make(4, 10, 0.12, 3),
  lg: make(8, 18, 0.16, 6),
} as const;

export type ShadowKey = keyof typeof shadows;
