import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  getPendingPhonePassword,
  maskEmail,
  phoneService,
  seedPendingRegistration,
  type PhoneDeliveryChannel,
} from '@/api';
import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Banner } from '@/components/feedback';
import { Button, OtpInput, Text } from '@/components/ui';
import { AppConfig } from '@/constants';
import { useCountdown, useMutation } from '@/hooks';

const OTP_LENGTH = 6;
/** Mirrors ksbackend OTP_LOCKOUT_MS (15 min) — the wait shown on OTP_LOCKED. */
const LOCKOUT_MINUTES = 15;

/**
 * Phone-OTP confirmation (P8.T6), shared by phone SIGNUP and ATTACH (the
 * `mode` param drives what success does). Reuses the email flow's OtpInput UX
 * (paste, autofill, digit announcements) and its countdown-powered resend —
 * the 60s cooldown is armed locally from the backend's `resendAfterSeconds`.
 *
 * Sandbox/dev only: when the start response carried a `devCode` (every
 * delivery channel unconfigured AND the backend env is not prod/staging) it
 * surfaces in a clearly-labeled sandbox banner so the flow works end-to-end
 * with zero providers configured.
 */
export default function VerifyPhoneScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    mode: string;
    phone: string;
    masked: string;
    channel?: string;
    resendAfter?: string;
    devCode?: string;
    email?: string;
    surname?: string;
    givenNames?: string;
  }>();
  const mode = params.mode === 'attach' ? 'attach' : 'signup';
  const resendAfterSeconds = Number(params.resendAfter ?? 60);

  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | undefined>(params.devCode);
  const [channel, setChannel] = useState<PhoneDeliveryChannel | undefined>(
    params.channel as PhoneDeliveryChannel | undefined,
  );
  const { mmss, isDone, restart } = useCountdown(resendAfterSeconds);

  const { mutate, isLoading, error } = useMutation<void, string>(async (value) => {
    const result = await phoneService.verify({ phone: params.phone, code: value });
    if (mode === 'attach') {
      // Signed in already — back to the profile with a success notice.
      phoneService.clearPending();
      router.replace({
        pathname: '/(tabs)/profile',
        params: { notice: t('phoneAuth.attachSuccess') },
      });
      return;
    }
    if (result.nextStep === 'verify-email') {
      // SMS/dev delivery leaves the signup email unverified: hand over to the
      // existing email-verification flow, seeded so it signs straight in.
      await seedPendingRegistration({
        email: params.email ?? '',
        password: getPendingPhonePassword(params.phone),
      });
      phoneService.clearPending();
      router.push({
        pathname: '/verify-otp',
        params: {
          purpose: 'register',
          identifier: params.email ?? '',
          maskedTarget: maskEmail(params.email ?? ''),
          expiresIn: String(AppConfig.otpExpiresInSeconds),
        },
      });
      return;
    }
    // nextStep 'sign-in' — the account can sign in right away.
    phoneService.clearPending();
    router.replace({ pathname: '/login', params: { notice: t('phoneAuth.signInNotice') } });
  });

  // Re-send runs through the same start endpoint after the cooldown. The 60s
  // countdown restarts ONLY on success — the backend arms its cooldown after a
  // successful send, so a failure (503, throttle) must leave retry open.
  const { mutate: resend, error: resendError } = useMutation(
    () =>
      phoneService.resend({
        phone: params.phone,
        mode,
        email: params.email ?? '',
        ...(mode === 'signup'
          ? { name: `${params.givenNames ?? ''} ${params.surname ?? ''}`.trim() }
          : {}),
      }),
    {
      onSuccess: (result) => {
        setCode('');
        setLocalError(null);
        setDevCode(result.devCode);
        setChannel(result.channel);
        restart(resendAfterSeconds);
      },
    },
  );

  const serverMessage =
    error === null
      ? null
      : error.code === 'OTP_LOCKED'
        ? // Richer, parameterized lockout copy (the wait) over the code fallback.
          t('phoneAuth.locked', { minutes: LOCKOUT_MINUTES })
        : error.message;
  const displayError = localError ?? serverMessage ?? resendError?.message ?? null;

  const onVerify = () => {
    setLocalError(null);
    if (code.length < OTP_LENGTH) {
      setLocalError(t('otp.enterCode', { length: OTP_LENGTH }));
      return;
    }
    void mutate(code);
  };

  // Delivery is dead or the number is locked — the honest way forward is the
  // email sign-up path (signup mode only; attach users simply retry later).
  const failingCode = error !== null ? error.code : resendError?.code;
  const showEmailFallback =
    mode === 'signup' &&
    failingCode !== undefined &&
    (failingCode === 'OTP_LOCKED' ||
      failingCode === 'OTP_DELIVERY_UNAVAILABLE' ||
      failingCode === 'OTP_SEND_THROTTLED');

  return (
    <AuthScaffold>
      <AuthHeader
        title={mode === 'attach' ? t('phoneAuth.titleAttach') : t('phoneAuth.titleSignup')}
        subtitle={t('phoneAuth.codeSentTo', { target: params.masked ?? params.phone ?? '' })}
        showBack={router.canGoBack()}
      />

      <View style={styles.body}>
        {devCode !== undefined && devCode !== '' ? (
          <Banner tone="info" message={t('phoneAuth.devCode', { code: devCode })} />
        ) : null}

        {channel === 'email' && params.email ? (
          <Banner tone="info" message={t('phoneAuth.sentByEmail', { target: params.email })} />
        ) : null}

        <OtpInput
          value={code}
          onChange={setCode}
          length={OTP_LENGTH}
          autoFocus
          onComplete={() => setLocalError(null)}
        />

        <View style={styles.resend}>
          {isDone ? (
            <AuthPrompt
              text={t('otp.notReceived')}
              actionLabel={t('otp.resend')}
              onPress={() => void resend(undefined)}
            />
          ) : (
            <Text variant="body" color="textMuted" align="center">
              {t('otp.resendIn', { time: mmss })}
            </Text>
          )}
        </View>

        {displayError ? <Banner tone="error" message={displayError} style={styles.error} /> : null}

        {showEmailFallback ? (
          <AuthPrompt
            text={t('phoneAuth.emailFallbackPrompt')}
            actionLabel={t('phoneAuth.emailFallbackAction')}
            onPress={() => router.push('/register')}
          />
        ) : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.verifyAccount')} fullWidth loading={isLoading} onPress={onVerify} />
      {mode === 'signup' ? (
        <AuthPrompt
          text={t('common.alreadyHaveAccount')}
          actionLabel={t('common.login')}
          onPress={() => router.replace('/login')}
        />
      ) : null}
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
