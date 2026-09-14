import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Logo, Watermark } from '@/components/brand';
import { StorageKeys } from '@/constants';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';
import { storage } from '@/utils';

/** Minimum time the splash stays up so it doesn't flash on fast cold starts. */
const MIN_SPLASH_MS = 1600;

/**
 * Branded splash + routing gate. It shows the logo while it (a) waits a minimum
 * duration, (b) lets auth restore, and (c) reads the saved language — then sends
 * the user to language selection (first run) or into the app.
 */
export default function SplashRoute() {
  const { status } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  // undefined = not read yet; null = read but not set; string = chosen language.
  const [language, setLanguage] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void SplashScreen.hideAsync();
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    storage.get(StorageKeys.language).then(setLanguage);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const ready = minElapsed && status !== 'loading' && language !== undefined;
    if (!ready) return;

    if (!language) {
      router.replace('/language');
    } else {
      router.replace(status === 'authenticated' ? '/(tabs)' : '/onboarding');
    }
  }, [minElapsed, status, language]);

  return <SplashView />;
}

function SplashView() {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Watermark />
      <Animated.View style={{ opacity }}>
        <Logo width={190} card />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
