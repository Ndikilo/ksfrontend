import { ProfileView, Screen } from '@/components';
import { VerificationCard } from '@/components/practice';
import { useTheme } from '@/theme';

/**
 * Practitioner console profile tab (P7.T1). The verification card (P7.T4)
 * leads the screen — credentials status is the practitioner's primary
 * onboarding concern — followed by the shared profile body (identity,
 * appearance, sign-out).
 */
export default function PracticeProfileScreen() {
  const theme = useTheme();
  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <VerificationCard />
      <ProfileView />
    </Screen>
  );
}
