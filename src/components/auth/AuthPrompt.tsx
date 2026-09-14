import { StyleSheet, View } from 'react-native';

import { Link, Text } from '@/components/ui';

/**
 * Centered "prompt + link" row, e.g. "Already have an account? Login" or
 * "New to KanaSanté? Create account". Reused across every auth screen.
 */
export function AuthPrompt({
  text,
  actionLabel,
  onPress,
}: {
  text: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="body" color="textMuted">
        {text}{' '}
      </Text>
      <Link label={actionLabel} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
});
