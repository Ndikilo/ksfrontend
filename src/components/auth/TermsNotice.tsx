import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * "By registering, you acknowledge … Terms & Conditions and Privacy Policy."
 * Shown at the bottom of auth screens. Handlers are optional (wire to your
 * legal pages / WebView when available).
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
  const linkStyle = { color: theme.colors.text, textDecorationLine: 'underline' as const };

  return (
    <View style={styles.container}>
      <Text variant="caption" color="textMuted" align="center">
        {t('terms.prefix')}{' '}
        <Text variant="caption" style={linkStyle} onPress={onTerms}>
          {t('terms.terms')}
        </Text>{' '}
        {t('terms.and')}{' '}
        <Text variant="caption" style={linkStyle} onPress={onPrivacy}>
          {t('terms.privacy')}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20 },
});
