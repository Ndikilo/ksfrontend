import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback';
import { Avatar, Button, Card, Divider, Text } from '@/components/ui';
import { useAuth } from '@/store';
import { useThemeContext } from '@/theme';
import { logger } from '@/utils';

/**
 * The profile body shared by the patient Profile tab and the practitioner
 * console profile (P7.T1): identity card, appearance preference, sign-out and
 * account deletion. Reads the session itself — screens just mount it inside
 * their <Screen>.
 *
 * Deletion is the one destructive action here: it confirms through a dialog
 * that spells out the consequences (standard §2) and only clears the session
 * when the SERVER confirmed the deletion — a failed call keeps the user
 * signed in and shows a retryable banner.
 */
export function ProfileView() {
  const { t } = useTranslation();
  const { session, signOut, deleteAccount } = useAuth();
  const { theme, preference, setPreference } = useThemeContext();
  const [deleting, setDeleting] = useState(false);
  const [deletionFailed, setDeletionFailed] = useState(false);
  // Re-entrancy guard for the dialog's confirm press (Android has double-fired
  // Alert onPress on fast taps; a second concurrent DELETE must never run).
  const deleteInFlight = useRef(false);
  const user = session?.user;

  const confirmDeleteAccount = () => {
    if (deleteInFlight.current) return;
    Alert.alert(
      t('profile.deleteAccountConfirmTitle'),
      t('profile.deleteAccountConfirmMessage'),
      [
        { text: t('profile.cancel'), style: 'cancel' },
        {
          text: t('profile.deleteAccountAction'),
          style: 'destructive',
          onPress: () => {
            if (deleteInFlight.current) return;
            deleteInFlight.current = true;
            setDeleting(true);
            setDeletionFailed(false);
            void deleteAccount()
              .catch((error: unknown) => {
                logger.warn('auth', 'Account deletion failed; session kept for retry', error);
                setDeletionFailed(true);
              })
              .finally(() => {
                deleteInFlight.current = false;
                setDeleting(false);
              });
          },
        },
      ],
    );
  };

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

      <Button
        title={t('profile.signOut')}
        variant="danger"
        fullWidth
        disabled={deleting}
        onPress={() => void signOut()}
      />
      <Button
        title={t('profile.deleteAccount')}
        variant="ghost-danger"
        fullWidth
        loading={deleting}
        onPress={confirmDeleteAccount}
      />
      {deletionFailed ? (
        <Banner
          tone="error"
          message={t('profile.deleteAccountFailed')}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identity: { flex: 1, gap: 2 },
  options: { flexDirection: 'row', gap: 8 },
});
