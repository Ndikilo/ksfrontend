import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';
import { isPractitionerRole, useAuth } from '@/store';
import { useTheme } from '@/theme';

/**
 * Main patient app tabs — guarded so only authenticated patients get here.
 * P7.T1 route guard: a practitioner session is redirected to the
 * practitioner console (`/practice`), never the patient tabs. The guard runs
 * at session restore AND at sign-in, and a mid-session session change
 * re-renders this layout so the user moves to the right group.
 *
 * P8.T4 tab set (Homepage PRD §3.7): exactly Home, Appointments, Chats and
 * Health Record (both "coming soon" placeholders), and Account (the existing
 * profile). Find Care stays routable at `/search` for the home search entry
 * and category chips — it is just no longer a tab (`href: null`), so deep
 * links like `/search?category=nurses` keep working.
 */
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status, session } = useAuth();

  if (status === 'loading') return <Spinner />;
  if (status === 'unauthenticated') return <Redirect href="/login" />;
  if (isPractitionerRole(session?.user.role)) return <Redirect href="/practice" />;

  const iconColor = (focused: boolean) =>
    focused ? theme.colors.primary : theme.colors.textMuted;
  const TabHomeIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={iconColor(focused)} />
  );
  const TabAppointmentsIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={iconColor(focused)} />
  );
  const TabChatsIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
      size={22}
      color={iconColor(focused)}
    />
  );
  const TabHealthRecordIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? 'document-text' : 'document-text-outline'}
      size={22}
      color={iconColor(focused)}
    />
  );
  const TabAccountIcon = ({ focused }: { focused: boolean }) => (
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
        options={{ title: t('tabs.home'), tabBarIcon: TabHomeIcon }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: t('tabs.appointments'), tabBarIcon: TabAppointmentsIcon }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: t('tabs.chats'), tabBarIcon: TabChatsIcon }}
      />
      <Tabs.Screen
        name="health-record"
        options={{ title: t('tabs.healthRecord'), tabBarIcon: TabHealthRecordIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.account'), tabBarIcon: TabAccountIcon }}
      />
      {/* Routable but not a tab: reached from the home search entry + chips. */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
