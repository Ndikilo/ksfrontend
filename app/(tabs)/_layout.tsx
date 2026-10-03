import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';

/** Main app tabs — guarded so only authenticated users get here. */
export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { status } = useAuth();

  if (status === 'loading') return <Spinner />;
  if (status === 'unauthenticated') return <Redirect href="/login" />;

  const iconColor = (focused: boolean) =>
    focused ? theme.colors.primary : theme.colors.textMuted;
  const TabHomeIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={iconColor(focused)} />
  );
  const TabAppointmentsIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={iconColor(focused)} />
  );
  const TabSearchIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons name={focused ? 'search' : 'search-outline'} size={22} color={iconColor(focused)} />
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
        options={{ title: t('tabs.home'), tabBarIcon: TabHomeIcon }}
      />
      <Tabs.Screen
        name="appointments"
        options={{ title: t('tabs.appointments'), tabBarIcon: TabAppointmentsIcon }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: t('tabs.search'), tabBarIcon: TabSearchIcon }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('tabs.profile'), tabBarIcon: TabProfileIcon }}
      />
    </Tabs>
  );
}
