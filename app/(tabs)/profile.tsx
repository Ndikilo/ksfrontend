import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Banner } from '@/components/feedback';
import { Button, ProfileView, Screen } from '@/components';
import { isPractitionerRole, useAuth } from '@/store';
import { useTheme } from '@/theme';

/**
 * Patient Profile tab. P7.T1: the body (identity, appearance, sign-out) is
 * the shared `ProfileView`, also mounted by the practitioner console profile.
 * P7.T4: a signed-in non-practitioner gets the one-tap practitioner
 * registration entry — the start of the register → credentials → review flow.
 * P8.T6: a signed-in user can attach a verified phone number (phone-OTP flow
 * in attach mode); the success notice arrives via the `notice` param.
 */
export default function ProfileScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status, session } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();
  const showPractitionerEntry =
    status === 'authenticated' && !isPractitionerRole(session?.user.role);

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      {notice ? <Banner tone="success" message={notice} /> : null}
      <ProfileView />
      {status === 'authenticated' ? (
        <Button
          title={t('profile.addPhone')}
          variant="ghost"
          onPress={() => router.push({ pathname: '/register-phone', params: { mode: 'attach' } })}
        />
      ) : null}
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
