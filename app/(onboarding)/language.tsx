import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Logo, Watermark } from '@/components/brand';
import { accountService } from '@/api';
import { Button, Screen, Select, Text } from '@/components/ui';
import { LANGUAGES, type LanguageCode } from '@/constants';
import { changeAppLanguage } from '@/i18n';
import { useAuth } from '@/store';

/**
 * Language selection (first-run onboarding). The dropdown defaults to the
 * device/OS language (resolved by i18n), and choosing one switches the whole
 * app + persists the preference. When signed in, the choice is also mirrored
 * to the backend so its emails match (best-effort).
 */
export default function LanguageScreen() {
  const { t, i18n } = useTranslation();
  const { status } = useAuth();
  const [language, setLanguage] = useState<LanguageCode>((i18n.language as LanguageCode) ?? 'en');
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    setSaving(true);
    await changeAppLanguage(language);
    if (status === 'authenticated') {
      void accountService.updateLocale(language).catch(() => undefined);
    }
    router.replace(status === 'authenticated' ? '/(tabs)' : '/onboarding');
  };

  return (
    <Screen scroll={false}>
      <Watermark />

      <View style={styles.content}>
        <View style={styles.header}>
          <Logo width={160} />
          <Text variant="title" align="center" style={styles.title}>
            {t('language.title')}
          </Text>
          <View style={styles.subtitle}>
            <Text variant="body" color="textMuted" align="center">
              {t('language.subtitleEn')}
            </Text>
            <Text variant="body" color="textMuted" align="center">
              {t('language.subtitleFr')}
            </Text>
          </View>
        </View>

        <Select<LanguageCode>
          title={t('language.title')}
          value={language}
          onChange={setLanguage}
          options={LANGUAGES.map((item) => ({ label: item.label, value: item.code }))}
          containerStyle={styles.select}
        />
      </View>

      <Button title={t('common.continue')} fullWidth loading={saving} onPress={onContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  header: { alignItems: 'center', marginTop: 56 },
  title: { marginTop: 40 },
  subtitle: { marginTop: 12 },
  select: { marginTop: 36 },
});
