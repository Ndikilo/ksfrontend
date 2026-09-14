import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { authService } from '@/api';
import { AuthHeader, AuthScaffold } from '@/components/auth';
import { Banner } from '@/components/feedback';
import { Button, Input } from '@/components/ui';
import { useMutation } from '@/hooks';
import type { OtpChallenge } from '@/types';
import { isNonEmpty } from '@/utils';

/**
 * Reset password — step 1: enter the email/phone on the account. Sends an OTP
 * and continues to the shared verification screen (purpose = reset).
 */
export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { mutate, isLoading, error } = useMutation<OtpChallenge, string>(
    authService.forgotPassword,
    {
      onSuccess: (challenge) =>
        router.push({
          pathname: '/verify-otp',
          params: {
            purpose: 'reset',
            identifier: challenge.identifier,
            maskedTarget: challenge.maskedTarget,
            expiresIn: String(challenge.expiresInSeconds),
          },
        }),
    },
  );

  const onSubmit = () => {
    if (!isNonEmpty(identifier)) {
      setFieldError(t('common.required'));
      return;
    }
    setFieldError(null);
    void mutate(identifier.trim());
  };

  return (
    <AuthScaffold>
      <AuthHeader title={t('forgot.title')} subtitle={t('forgot.subtitle')} />

      <View style={styles.form}>
        <Input
          label={t('forgot.identifier')}
          placeholder="johndoe@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
          error={fieldError}
        />
        {error ? <Banner tone="error" message={error.message} /> : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.sendCode')} fullWidth loading={isLoading} onPress={onSubmit} />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  spacer: { flex: 1, minHeight: 24 },
});
