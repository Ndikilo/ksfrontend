import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The shared "go back" affordance for stack screens — one copy, a11y-labelled,
 * hit slop from the theme layout tokens (design standard §1).
 */
export function BackButton() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.goBack')}
      onPress={() => router.back()}
      hitSlop={theme.layout.hitSlop}
      style={styles.back}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { padding: 4, alignSelf: 'flex-start' },
});
