import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthHeader, AuthPrompt, AuthScaffold, TermsNotice } from '@/components/auth';
import { Button, DateField, Input, Select } from '@/components/ui';
import type { Sex } from '@/types';
import { isEmail, isNonEmpty, isPhone } from '@/utils';

const EIGHTEEN_YEARS_AGO = new Date(
  new Date().getFullYear() - 18,
  new Date().getMonth(),
  new Date().getDate(),
);

type Errors = Partial<Record<'surname' | 'givenNames' | 'email' | 'phone' | 'dob' | 'sex', string>>;

/**
 * Register — step 1 of 2 (profile). Validates locally, then carries the profile
 * to the password step. Built entirely from reusable field components.
 */
export default function RegisterScreen() {
  const { t } = useTranslation();
  const sexOptions: { label: string; value: Sex }[] = [
    { label: t('register.male'), value: 'male' },
    { label: t('register.female'), value: 'female' },
  ];

  const [surname, setSurname] = useState('');
  const [givenNames, setGivenNames] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState<Sex | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): boolean => {
    const next: Errors = {};
    if (!isNonEmpty(surname)) next.surname = t('common.required');
    if (!isNonEmpty(givenNames)) next.givenNames = t('common.required');
    if (!isEmail(email)) next.email = t('validation.email');
    if (!isPhone(phone)) next.phone = t('validation.phone');
    if (!dob) next.dob = t('common.required');
    if (!sex) next.sex = t('common.required');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onContinue = () => {
    if (!validate() || !dob || !sex) return;
    router.push({
      pathname: '/register-password',
      params: {
        surname: surname.trim(),
        givenNames: givenNames.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dob.toISOString(),
        sex,
      },
    });
  };

  return (
    <AuthScaffold>
      <AuthHeader title={t('register.title')} subtitle={t('register.subtitle')} />

      <View style={styles.form}>
        <View style={styles.row}>
          <Input
            containerStyle={styles.col}
            label={t('register.surname')}
            required
            placeholder="John"
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
        />

        <Input
          label={t('register.phone')}
          required
          placeholder="(+237) 65896720"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          error={errors.phone}
        />

        <View style={styles.row}>
          <DateField
            containerStyle={styles.col}
            label={t('register.dateOfBirth')}
            required
            value={dob}
            onChange={setDob}
            maximumDate={EIGHTEEN_YEARS_AGO}
            error={errors.dob}
          />
          <Select<Sex>
            containerStyle={styles.col}
            label={t('register.sex')}
            required
            title={t('register.selectSex')}
            placeholder={t('register.select')}
            value={sex}
            onChange={setSex}
            options={sexOptions}
            error={errors.sex}
          />
        </View>
      </View>

      <View style={styles.spacer} />

      <Button title={t('common.continue')} fullWidth onPress={onContinue} />
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
  form: { gap: 16 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  spacer: { flex: 1, minHeight: 24 },
});
