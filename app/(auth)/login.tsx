import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthHeader, AuthPrompt, AuthScaffold } from '@/components/auth';
import { Banner } from '@/components/feedback';
import { Button, Checkbox, Input, Link } from '@/components/ui';
import { useMutation } from '@/hooks';
import { maskEmail } from '@/api';
import { useAuth } from '@/store';
import type { Credentials } from '@/types';
import { isEmail, isNonEmpty } from '@/utils';

/**
 * Login. On success the AuthProvider status flips to authenticated and the
 * (auth) layout redirects into the app. Shows an optional success banner passed
 * via the `notice` param (e.g. after a password reset).
 *
 * If the backend replies 403 EMAIL_NOT_VERIFIED, `authService.login` has
 * already (re-)sent the OTP — route into the verification flow; verifying then
 * signs straight in with the credentials just entered.
 */
export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const { notice } = useLocalSearchParams<{ notice?: string }>();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});

  const { mutate, isLoading, error } = useMutation<void, Credentials>((c) => signIn(c), {
    onError: (mutationError) => {
      if (mutationError.code === 'EMAIL_NOT_VERIFIED') {
        router.push({
          pathname: '/verify-otp',
          params: {
            purpose: 'register',
            identifier: identifier.trim(),
            maskedTarget: maskEmail(identifier.trim()),
            expiresIn: '300',
          },
        });
      }
    },
  });

  const onSubmit = () => {
    const next = {
      identifier: isEmail(identifier) ? undefined : t('validation.email'),
      password: isNonEmpty(password) ? undefined : t('common.required'),
    };
    setErrors(next);
    if (next.identifier || next.password) return;
    void mutate({ identifier: identifier.trim(), password });
  };

  return (
    <AuthScaffold>
      {notice ? <Banner tone="success" message={notice} style={styles.banner} /> : null}

      <AuthHeader
        title={t('login.title')}
        subtitle={t('login.subtitle')}
        showBack={router.canGoBack()}
      />

      <View style={styles.form}>
        <Input
          label={t('login.identifier')}
          placeholder="johndoe@gmail.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={identifier}
          onChangeText={setIdentifier}
          error={errors.identifier}
        />
        <Input
          label={t('login.password')}
          placeholder="••••••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={errors.password}
        />

        <View style={styles.optionsRow}>
          <Checkbox checked={remember} onChange={setRemember} label={t('login.rememberMe')} />
          <Link label={t('login.forgotPassword')} onPress={() => router.push('/forgot-password')} />
        </View>

        {error ? (
          <Banner tone="error" message={error.message} />
        ) : null}
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.login')} fullWidth loading={isLoading} onPress={onSubmit} />
      <AuthPrompt
        text={t('login.newHere')}
        actionLabel={t('common.createAccountShort')}
        onPress={() => router.push('/register')}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  banner: { marginBottom: 16 },
  form: { gap: 16 },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  spacer: { flex: 1, minHeight: 24 },
});
