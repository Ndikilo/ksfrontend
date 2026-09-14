import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/store';

/** Auth group — bounce already-signed-in users straight into the app. */
export default function AuthLayout() {
  const { status } = useAuth();
  if (status === 'authenticated') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
