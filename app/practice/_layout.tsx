import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';
import { isPractitionerRole, useAuth } from '@/store';
import { useTheme } from '@/theme';

/**
 * Practitioner console (P7.T1) — the tab group a doctor/nurse session lands
 * on. Guarded from both sides: signed-out goes to login, patient (or admin —
 * out of mobile scope, they act as plain users) goes to the patient tabs.
 * Calendar management (P7.T2) and the incoming-appointments view (P7.T3)
 * join this group.
 */
export default function PracticeLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status, session } = useAuth();

  if (status === 'loading') return <Spinner />;
  if (status === 'unauthenticated') return <Redirect href="/login" />;
  if (!isPractitionerRole(session?.user.role)) return <Redirect href="/(tabs)" />;

  const iconColor = (focused: boolean) =>
    focused ? theme.colors.primary : theme.colors.textMuted;
  const TabAgendaIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={iconColor(focused)} />
  );
  const TabProfileIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={iconColor(focused)} />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('practice.tabAgenda'), tabBarIcon: TabAgendaIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('practice.tabProfile'), tabBarIcon: TabProfileIcon }}
      />
    </Tabs>
  );
}
