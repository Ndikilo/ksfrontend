import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { authService } from '@/api';
import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Button, Input } from '@/components/ui';
import { useMutation } from '@/hooks';
import type { OtpChallenge, RegisterPayload, Sex } from '@/types';
import { isStrongPassword } from '@/utils';

/**
 * Register — step 2 of 2 (password). Reuses the profile from step 1 (passed as
 * params), applies the shared password policy, then calls `authService.register`
 * which sends an OTP and routes to verification.
 */
export default function RegisterPasswordScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    surname: string;
    givenNames: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    sex: Sex;
  }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const passwordStrong = isStrongPassword(password);
  const passwordError =
    (submitted || password.length > 0) && !passwordStrong ? t('validation.password') : null;
  const confirmMismatch =
    confirm.length > 0 && confirm !== password ? t('validation.passwordMismatch') : null;
  const confirmSuccess = passwordStrong && confirm.length > 0 && confirm === password;

  const { mutate, isLoading } = useMutation<OtpChallenge, RegisterPayload>(
    authService.register,
    {
      onSuccess: (challenge) =>
        router.push({
          pathname: '/verify-otp',
          params: {
            purpose: 'register',
            identifier: challenge.identifier,
            maskedTarget: challenge.maskedTarget,
            expiresIn: String(challenge.expiresInSeconds),
          },
        }),
    },
  );

  const onContinue = () => {
    setSubmitted(true);
    if (!passwordStrong || confirm !== password) return;
    void mutate({
      surname: params.surname,
      givenNames: params.givenNames,
      email: params.email,
      phone: params.phone,
      dateOfBirth: params.dateOfBirth,
      sex: params.sex,
      password,
    });
  };

  return (
    <AuthScaffold>
      <AuthHeader title={t('register.title')} subtitle={t('register.subtitle')} />

      <View style={styles.form}>
        <Input
          label={t('register.password')}
          required
          placeholder="••••••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          success={passwordStrong}
        />
        <Input
          label={t('register.reenterPassword')}
          required
          placeholder="••••••••••••"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          error={confirmMismatch}
          success={confirmSuccess}
        />
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.continue')} fullWidth loading={isLoading} onPress={onContinue} />
      <AuthPrompt
        text={t('common.alreadyHaveAccount')}
        actionLabel={t('common.login')}
        onPress={() => router.replace('/login')}
      />
      <TermsNotice />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: 20 },
  spacer: { flex: 1, minHeight: 24 },
});
