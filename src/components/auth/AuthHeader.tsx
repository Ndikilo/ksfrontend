import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export type AuthHeaderProps = {
  title: string;
  subtitle?: string;
  /** Defaults to `router.back()`. */
  onBack?: () => void;
  showBack?: boolean;
};

/** Back button + title + subtitle block shared by every auth screen. */
export function AuthHeader({ title, subtitle, onBack, showBack = true }: AuthHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {showBack ? (
        <IconButton
          name="arrow-back"
          variant="dark"
          accessibilityLabel={t('common.goBack')}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          style={{ marginBottom: theme.spacing.lg }}
        />
      ) : null}
      <Text variant="title">{title}</Text>
      {subtitle ? (
        <Text variant="body" color="textMuted" style={{ marginTop: theme.spacing.sm }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 24 },
});
