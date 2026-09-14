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
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
