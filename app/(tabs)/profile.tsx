import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, ProfileView, Screen } from '@/components';
import { isPractitionerRole, useAuth } from '@/store';
import { useTheme } from '@/theme';

/**
 * Patient Profile tab. P7.T1: the body (identity, appearance, sign-out) is
 * the shared `ProfileView`, also mounted by the practitioner console profile.
 * P7.T4: a signed-in non-practitioner gets the one-tap practitioner
 * registration entry — the start of the register → credentials → review flow.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status, session } = useAuth();
  const showPractitionerEntry =
    status === 'authenticated' && !isPractitionerRole(session?.user.role);

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <ProfileView />
      {showPractitionerEntry ? (
        <Button
          title={t('practitionerRegister.entry')}
          variant="ghost"
          onPress={() => router.push('/practitioner/register')}
        />
      ) : null}
    </Screen>
  );
}
