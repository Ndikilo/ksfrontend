import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { env } from '@/config/env';
import { useTheme } from '@/theme';

/**
 * "By registering, you acknowledge … Terms & Conditions and Privacy Policy."
 * Opens the approved public legal URLs supplied in the build environment.
 */
export function TermsNotice({
  onTerms,
  onPrivacy,
}: {
  onTerms?: () => void;
  onPrivacy?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [linkError, setLinkError] = useState(false);
  const openDocument = async (value: string) => {
    setLinkError(false);
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') throw new Error('Invalid legal URL');
      await Linking.openURL(url.toString());
    } catch {
      setLinkError(true);
    }
  };
  const linkStyle = { color: theme.colors.text, textDecorationLine: 'underline' as const };

  return (
    <View style={styles.container}>
      <Text variant="caption" color="textMuted" align="center">
        {t('terms.prefix')}{' '}
        <Text
          variant="caption"
          accessibilityRole="link"
          style={linkStyle}
          onPress={onTerms ?? (() => { void openDocument(env.termsUrl); })}
        >
          {t('terms.terms')}
        </Text>{' '}
        {t('terms.and')}{' '}
        <Text
          variant="caption"
          accessibilityRole="link"
          style={linkStyle}
          onPress={onPrivacy ?? (() => { void openDocument(env.privacyUrl); })}
        >
          {t('terms.privacy')}
        </Text>
      </Text>
      {linkError ? (
        <Text variant="caption" color="textMuted" align="center" accessibilityRole="alert">
          {t('terms.unavailable')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
});
