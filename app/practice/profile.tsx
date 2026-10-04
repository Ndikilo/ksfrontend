import { ProfileView, Screen } from '@/components';
import { useTheme } from '@/theme';

/**
 * Practitioner console profile tab (P7.T1): the shared profile body
 * (identity, appearance, sign-out). Practitioner-specific status
 * (verification, onboarding — P7.T4) joins this screen later.
 */
export default function PracticeProfileScreen() {
  const theme = useTheme();
  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <ProfileView />
    </Screen>
  );
}
