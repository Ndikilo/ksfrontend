import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { authService } from '@/api';
import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Banner } from '@/components/feedback';
import { Button, Input } from '@/components/ui';
import { useMutation } from '@/hooks';
import { isStrongPassword } from '@/utils';

/**
 * Reset password — final step: set a new password using the emailed OTP from
 * the verification step (validated server-side by this call), then return to
 * Login with a success banner.
 */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { otp, identifier } = useLocalSearchParams<{ otp: string; identifier: string }>();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const passwordStrong = isStrongPassword(password);
  const passwordError =
    (submitted || password.length > 0) && !passwordStrong ? t('validation.password') : null;
  const confirmMismatch =
    confirm.length > 0 && confirm !== password ? t('validation.passwordMismatch') : null;
  const confirmSuccess = passwordStrong && confirm.length > 0 && confirm === password;

  const { mutate, isLoading, error } = useMutation<void, string>(
    (newPassword) => authService.resetPassword({ email: identifier, otp, password: newPassword }),
    {
      onSuccess: () =>
        router.replace({ pathname: '/login', params: { notice: t('login.resetSuccess') } }),
    },
  );

  const onSubmit = () => {
    setSubmitted(true);
    if (!passwordStrong || confirm !== password) return;
    void mutate(password);
  };

  return (
    <AuthScaffold>
      <AuthHeader title={t('reset.title')} subtitle={t('reset.subtitle')} />

      <View style={styles.form}>
        <Input
          label={t('reset.password')}
          required
          placeholder="••••••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          success={passwordStrong}
        />
        <Input
          label={t('reset.reenterPassword')}
          required
          placeholder="••••••••••••"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          error={confirmMismatch}
          success={confirmSuccess}
        />
        {error ? <Banner tone="error" message={error.message} /> : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.resetPassword')} fullWidth loading={isLoading} onPress={onSubmit} />
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
