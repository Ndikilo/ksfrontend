import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Divider, Text } from '@/components/ui';
import { useAuth } from '@/store';
import { useThemeContext } from '@/theme';

/**
 * The profile body shared by the patient Profile tab and the practitioner
 * console profile (P7.T1): identity card, appearance preference and sign-out.
 * Reads the session itself — screens just mount it inside their <Screen>.
 */
export function ProfileView() {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { theme, preference, setPreference } = useThemeContext();
  const user = session?.user;

  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identity: { flex: 1, gap: 2 },
  options: { flexDirection: 'row', gap: 8 },
});
