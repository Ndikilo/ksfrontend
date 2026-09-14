import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Divider, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store';
import { useThemeContext } from '@/theme';

/**
 * Profile screen. Shows the signed-in user and demonstrates reading/writing
 * global state: theme preference (ThemeProvider) and sign-out (AuthProvider).
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { theme, preference, setPreference } = useThemeContext();
  const user = session?.user;

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <Text variant="title">{t('profile.title')}</Text>

      <Card>
        <View style={styles.row}>
          <Avatar name={user?.fullName ?? t('profile.guestUser')} uri={user?.avatarUrl} size={56} />
          <View style={styles.identity}>
            <Text variant="subheading">{user?.fullName ?? t('profile.guestUser')}</Text>
            <Text variant="caption" color="textMuted">
              {user?.email ?? t('profile.notSignedIn')}
            </Text>
          </View>
        </View>
      </Card>

      <Card>
        <Text variant="subheading">{t('profile.appearance')}</Text>
        <Divider spacing={theme.spacing.md} />
        <View style={styles.options}>
          {(['system', 'light', 'dark'] as const).map((option) => (
            <Button
              key={option}
              title={t(`profile.${option}`)}
              variant={preference === option ? 'primary' : 'outline'}
              size="sm"
              onPress={() => setPreference(option)}
            />
          ))}
        </View>
      </Card>

      <Button title={t('profile.signOut')} variant="danger" fullWidth onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identity: { flex: 1, gap: 2 },
  options: { flexDirection: 'row', gap: 8 },
});
