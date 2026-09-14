import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { authService } from '@/api';
import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Button, OtpInput, Text } from '@/components/ui';
import { useCountdown, useMutation } from '@/hooks';
import { useAuth } from '@/store';
import type { OtpPurpose } from '@/types';

const OTP_LENGTH = 6;

/**
 * OTP confirmation, shared by registration and password reset (the `purpose`
 * param drives the copy and what happens on success). Includes a resend timer
 * powered by `useCountdown`.
 */
export default function VerifyOtpScreen() {
  const { t } = useTranslation();
  const { authenticate } = useAuth();
  const params = useLocalSearchParams<{
    purpose: OtpPurpose;
    identifier: string;
    maskedTarget: string;
    expiresIn?: string;
  }>();
  const purpose = params.purpose ?? 'register';
  const expiresIn = Number(params.expiresIn ?? 120);

  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const { mmss, isDone, restart } = useCountdown(expiresIn);

  const { mutate, isLoading, error } = useMutation<void, string>(async (value) => {
    if (purpose === 'register') {
      const session = await authService.verifyRegistration({ identifier: params.identifier, code: value });
      await authenticate(session); // the (auth) layout then redirects into the app
    } else {
      // The backend validates the code during the final reset call — carry it over.
      const { otp } = await authService.verifyReset({ identifier: params.identifier, code: value });
      router.push({ pathname: '/reset-password', params: { otp, identifier: params.identifier } });
    }
  });

  const onVerify = () => {
    setLocalError(null);
    if (code.length < OTP_LENGTH) {
      setLocalError(t('otp.enterCode'));
      return;
    }
    void mutate(code);
  };

  const onResend = async () => {
    setCode('');
    setLocalError(null);
    try {
      await authService.resendOtp({ identifier: params.identifier, purpose });
    } finally {
      restart(expiresIn);
    }
  };

  const subtitle =
    purpose === 'register'
      ? t('otp.subtitleRegister', { target: params.maskedTarget ?? '' })
      : t('otp.subtitleReset', { target: params.maskedTarget ?? '' });
  const displayError = localError ?? error?.message ?? null;

  return (
    <AuthScaffold>
      <AuthHeader title={t('otp.title')} subtitle={subtitle} />

      <View style={styles.body}>
        <OtpInput value={code} onChange={setCode} length={OTP_LENGTH} autoFocus onComplete={() => setLocalError(null)} />

        <View style={styles.resend}>
          {isDone ? (
            <AuthPrompt text={t('otp.notReceived')} actionLabel={t('otp.resend')} onPress={onResend} />
          ) : (
            <Text variant="body" color="textMuted" align="center">
              {t('otp.resendIn', { time: mmss })}
            </Text>
          )}
        </View>

        {displayError ? (
          <Text variant="caption" color="danger" align="center" style={styles.error}>
            {displayError}
          </Text>
        ) : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.verifyAccount')} fullWidth loading={isLoading} onPress={onVerify} />
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
  body: { gap: 20, marginTop: 8 },
  resend: { marginTop: 4 },
  error: { marginTop: 4 },
  spacer: { flex: 1, minHeight: 24 },
});
