import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { accountService, authService, practitionerService, referenceService } from '@/api';
import { AuthHeader, TermsNotice } from '@/components/auth';
import { ErrorState } from '@/components/feedback';
import { Button, Input, Screen, Select, Spinner } from '@/components/ui';
import { AppConfig } from '@/constants';
import { useAsync, useMutation } from '@/hooks';
import { isPractitionerRole, useAuth } from '@/store';
import { useTheme } from '@/theme';
import type { PractitionerRegistrationInput } from '@/types';

/**
 * Practitioner registration (P7.T4 step 1) — `POST /v1/practitioners/register`.
 * Reached from the patient Profile tab by a signed-in patient; the backend
 * creates the profile in `incomplete` and GRANTS the doctor/nurse role, so on
 * success the session user is re-read (the role lives on the better-auth user)
 * and the pure role table (src/store/roles.ts) lands the new practitioner on
 * their console — where the profile's verification card picks the flow up at
 * the credentials step. A practitioner session has no business here and is
 * bounced back to the console.
 */

type Errors = Partial<Record<'role' | 'profession' | 'surname' | 'givenNames', string>>;

export default function PractitionerRegisterScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status, session, authenticate } = useAuth();

  const [role, setRole] = useState<'doctor' | 'nurse' | null>(null);
  const [professionId, setProfessionId] = useState<string | null>(null);
  const [surname, setSurname] = useState('');
  const [givenNames, setGivenNames] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  // The professions catalog drives the Select. A failure is retryable — the
  // form cannot be submitted without a profession.
  const professions = useAsync(() => referenceService.professions({ limit: 100 }), []);

  // Best-effort prefill from the base profile (created at account sign-up);
  // a 404 just means the fields stay empty — never an error surface here.
  useEffect(() => {
    let cancelled = false;
    accountService
      .getProfile()
      .then((profile) => {
        if (!cancelled) {
          setSurname(profile.surname);
          setGivenNames(profile.givenNames);
        }
      })
      .catch(() => {
        /* no profile yet — the fields stay editable */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useMutation(
    (input: PractitionerRegistrationInput) => practitionerService.register(input),
    {
      onSuccess: async (_created, input) => {
        // The role grant lives on the better-auth user — re-read the session so
        // every guard consuming the pure role table routes the console without
        // a restart. If the re-read is unavailable (offline) or still answers
        // the stale 'patient', the 201 response IS the server's grant, so the
        // just-granted role is applied directly — the console guard must never
        // bounce a freshly-registered practitioner.
        const granted = input.role;
        const fresh = await authService.me().catch(() => null);
        if (session) {
          const user = fresh
            ? { ...fresh, role: isPractitionerRole(fresh.role) ? fresh.role : granted }
            : { ...session.user, role: granted };
          await authenticate({ token: session.token, user });
        }
        // Never a bare success screen: the console profile's verification card
        // is the next step of the flow (credentials upload).
        router.replace('/practice');
      },
    },
  );

  const onSubmit = useCallback(() => {
    const next: Errors = {};
    if (!role) next.role = t('common.required');
    if (!professionId) next.profession = t('common.required');
    if (surname.trim().length === 0) next.surname = t('common.required');
    if (givenNames.trim().length === 0) next.givenNames = t('common.required');
    setErrors(next);
    if (Object.keys(next).length > 0 || !role || !professionId) return;
    void register.mutate({
      role,
      professionId,
      surname: surname.trim(),
      givenNames: givenNames.trim(),
      location: location.trim() === '' ? undefined : location.trim(),
      consentVersion: AppConfig.consentVersion,
      acceptTerms: true as const,
    });
  }, [role, professionId, surname, givenNames, location, register, t]);

  // Route guards (same predicates every layout consumes — no reimplementation).
  if (status === 'loading') return <Spinner />;
  if (status === 'unauthenticated') return <Redirect href="/login" />;
  if (isPractitionerRole(session?.user.role)) return <Redirect href="/practice" />;

  const professionOptions = (professions.data?.data ?? []).map((profession) => ({
    label: profession.nameEn,
    value: profession.id,
  }));

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <AuthHeader
        title={t('practitionerRegister.title')}
        subtitle={t('practitionerRegister.subtitle')}
      />

      {professions.error && professions.data === null ? (
        <ErrorState error={professions.error} onRetry={professions.refetch} />
      ) : (
        <View style={styles.form}>
          <Select<'doctor' | 'nurse'>
            label={t('practitionerRegister.roleLabel')}
            required
            title={t('practitionerRegister.roleLabel')}
            placeholder={t('select.placeholder')}
            value={role}
            onChange={setRole}
            options={[
              { label: t('practitionerRegister.roleDoctor'), value: 'doctor' },
              { label: t('practitionerRegister.roleNurse'), value: 'nurse' },
            ]}
            error={errors.role}
          />
          <Select<string>
            label={t('practitionerRegister.professionLabel')}
            required
            title={t('practitionerRegister.professionLabel')}
            placeholder={t('select.placeholder')}
            value={professionId}
            onChange={setProfessionId}
            options={professionOptions}
            error={errors.profession}
            disabled={professions.isLoading && professions.data === null}
          />
          <View style={styles.row}>
            <Input
              containerStyle={styles.col}
              label={t('practitionerRegister.surname')}
              required
              value={surname}
              onChangeText={setSurname}
              error={errors.surname}
              autoCapitalize="words"
              accessibilityLabel={t('practitionerRegister.surname')}
            />
            <Input
              containerStyle={styles.col}
              label={t('practitionerRegister.givenNames')}
              required
              value={givenNames}
              onChangeText={setGivenNames}
              error={errors.givenNames}
              autoCapitalize="words"
              accessibilityLabel={t('practitionerRegister.givenNames')}
            />
          </View>
          <Input
            label={t('practitionerRegister.locationLabel')}
            placeholder={t('practitionerRegister.locationPlaceholder')}
            value={location}
            onChangeText={setLocation}
            autoCapitalize="words"
            accessibilityLabel={t('practitionerRegister.locationLabel')}
          />

          {register.error ? (
            <ErrorState error={register.error} onRetry={onSubmit} />
          ) : null}

          <Button
            title={t('practitionerRegister.submit')}
            fullWidth
            loading={register.isLoading}
            onPress={onSubmit}
          />
          <TermsNotice />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
});
