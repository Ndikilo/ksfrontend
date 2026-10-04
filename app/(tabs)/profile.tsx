import { ProfileView, Screen } from '@/components';
import { useTheme } from '@/theme';

/**
 * Patient Profile tab. P7.T1: the body (identity, appearance, sign-out) is
 * the shared `ProfileView`, also mounted by the practitioner console profile.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <ProfileView />
    </Screen>
  );
}
