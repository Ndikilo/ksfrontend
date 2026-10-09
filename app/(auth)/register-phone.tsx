import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { maskPhone, normalizePhoneE164, phoneService } from '@/api';
import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Banner } from '@/components/feedback';
import { Button, Input } from '@/components/ui';
import { useMutation } from '@/hooks';
import { useAuth } from '@/store';
import type { PhoneStartResult } from '@/api';
import { isEmail, isNonEmpty, isStrongPassword } from '@/utils';

type Errors = Partial<
  Record<'phone' | 'surname' | 'givenNames' | 'email' | 'password' | 'confirm', string>
>;

/**
 * Phone-number registration (P8.T6) — the "Continue with phone number" path.
 * Signup mode collects the account fields the backend's start contract
 * requires (email/names/password, same policies as the email flow) plus the
 * Cameroon-first phone; attach mode (signed in, from the Profile tab) collects
 * only the phone — the session account supplies the rest. On success the OTP
 * step takes over at /verify-phone; a sandbox/dev `devCode` is carried there
 * for the clearly-labeled sandbox banner.
 */
export default function RegisterPhoneScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const mode = modeParam === 'attach' ? 'attach' : 'signup';

  const [phone, setPhone] = useState('');
  const [surname, setSurname] = useState('');
  const [givenNames, setGivenNames] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const passwordStrong = isStrongPassword(password);
  const confirmMismatch = confirm.length > 0 && confirm !== password;

  const { mutate, isLoading, error } = useMutation<PhoneStartResult, string>(
    (e164) =>
      mode === 'attach'
        ? phoneService.start({
            phone: e164,
            mode: 'attach',
            // Identity fields the attach contract carries but ignores — the
            // session account owns them server-side.
            email: session?.user.email ?? '',
            name: session?.user.fullName ?? '',
          })
        : phoneService.start({
            phone: e164,
            mode: 'signup',
            email: email.trim(),
            name: `${givenNames} ${surname}`.trim(),
            password,
          }),
    {
      onSuccess: (result) => {
        // email doubles as the delivery-fallback target the verify screen can
        // name (the backend falls back to the account email when SMS is
        // unconfigured — the session email on the attach path).
        const fallbackEmail = mode === 'signup' ? email.trim() : (session?.user.email ?? '');
        router.push({
          pathname: '/verify-phone',
          params: {
            mode,
            phone: result.phone,
            masked: maskPhone(result.phone),
            channel: result.channel,
            resendAfter: String(result.resendAfterSeconds),
            email: fallbackEmail,
            ...(result.devCode !== undefined ? { devCode: result.devCode } : {}),
            ...(mode === 'signup'
              ? { surname: surname.trim(), givenNames: givenNames.trim() }
              : {}),
          },
        });
      },
    },
  );

  const validate = (): boolean => {
    const next: Errors = {};
    if (normalizePhoneE164(phone) === null) next.phone = t('phoneAuth.phoneInvalid');
    if (mode === 'signup') {
      if (!isNonEmpty(surname)) next.surname = t('common.required');
      if (!isNonEmpty(givenNames)) next.givenNames = t('common.required');
      if (!isEmail(email)) next.email = t('validation.email');
      if (!passwordStrong) next.password = t('validation.password');
      if (confirmMismatch) next.confirm = t('validation.passwordMismatch');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    if (!validate()) return;
    void mutate(normalizePhoneE164(phone) ?? phone);
  };

  // The 503/throttle family means delivery is unavailable — the honest way
  // forward is the email sign-up path (signup mode only; attach simply retries).
  const showEmailFallback =
    mode === 'signup' &&
    error !== null &&
    (error.code === 'OTP_DELIVERY_UNAVAILABLE' || error.code === 'OTP_SEND_THROTTLED');

  return (
    <AuthScaffold>
      <AuthHeader
        title={mode === 'attach' ? t('phoneAuth.titleAttach') : t('phoneAuth.titleSignup')}
        subtitle={mode === 'attach' ? t('phoneAuth.subtitleAttach') : t('phoneAuth.subtitleSignup')}
        showBack={router.canGoBack()}
      />

      <View style={styles.form}>
        <Input
          label={t('register.phone')}
          required
          placeholder="(+237) 670123456"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
        />

        {mode === 'signup' ? (
          <>
            <View style={styles.row}>
              <Input
                containerStyle={styles.col}
                label={t('register.surname')}
                required
                placeholder="John"
                autoComplete="family-name"
                value={surname}
                onChangeText={setSurname}
                error={errors.surname}
                autoCapitalize="words"
              />
              <Input
                containerStyle={styles.col}
                label={t('register.givenNames')}
                required
                placeholder="doe"
                autoComplete="given-name"
                value={givenNames}
                onChangeText={setGivenNames}
                error={errors.givenNames}
                autoCapitalize="words"
              />
            </View>

            <Input
              label={t('register.email')}
              required
              placeholder="johndoe@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              hint={t('phoneAuth.emailHint')}
            />

            <Input
              label={t('register.password')}
              required
              placeholder="••••••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              success={passwordStrong}
            />
            <Input
              label={t('register.reenterPassword')}
              required
              placeholder="••••••••••••"
              secureTextEntry
              autoComplete="new-password"
              value={confirm}
              onChangeText={setConfirm}
              error={confirmMismatch ? t('validation.passwordMismatch') : null}
              success={passwordStrong && confirm.length > 0 && !confirmMismatch}
            />
          </>
        ) : null}

        {error ? <Banner tone="error" message={error.message} /> : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.continue')} fullWidth loading={isLoading} onPress={onContinue} />

      {showEmailFallback ? (
        <AuthPrompt
          text={t('phoneAuth.emailFallbackPrompt')}
          actionLabel={t('phoneAuth.emailFallbackAction')}
          onPress={() => router.push('/register')}
        />
      ) : null}

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
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  spacer: { flex: 1, minHeight: 24 },
});
