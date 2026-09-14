import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Image,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Link, PageIndicator, Text } from '@/components/ui';
import {
  ONBOARDING_AUTOPLAY_MS,
  ONBOARDING_SLIDES,
  type OnboardingSlide,
} from '@/constants';
import { useCarousel } from '@/hooks';
import { useTheme } from '@/theme';

/**
 * Onboarding carousel: 4 swipeable slides that also auto-advance every 3s
 * (pausing while the user is dragging). The bottom action block is fixed — the
 * CTAs use the reusable <Button> / <Link> primitives.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const { listRef, index, scrollTo, onScrollBeginDrag, onMomentumScrollEnd } =
    useCarousel<OnboardingSlide>({
      count: ONBOARDING_SLIDES.length,
      itemWidth: width,
      intervalMs: ONBOARDING_AUTOPLAY_MS,
    });

  const imageHeight = height * 0.56;

  const onBack = () => {
    if (index > 0) scrollTo(index - 1);
    else if (router.canGoBack()) router.back();
    else router.replace('/language');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surface }]}>
      <StatusBar style="light" />

      <FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item, index: i }) => (
          <View style={{ width }}>
            <Image
              source={item.image}
              resizeMode="cover"
              style={{ width, height: imageHeight }}
            />
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  paddingHorizontal: theme.layout.screenPadding,
                },
              ]}
            >
              <Text variant="title" style={styles.slideTitle}>
                {t(`onboarding.slides.${item.key}.title`)}
              </Text>
              <Text variant="body" color="textMuted" style={styles.slideSubtitle}>
                {t(`onboarding.slides.${item.key}.subtitle`)}
              </Text>
              <PageIndicator
                count={ONBOARDING_SLIDES.length}
                index={i}
                style={styles.dots}
              />
            </View>
          </View>
        )}
      />

      {/* Back button, floating over the image. */}
      <View style={[styles.backButton, { top: insets.top + theme.spacing.sm }]}>
        <IconButton
          name="arrow-back"
          variant="overlay"
          accessibilityLabel={t('common.goBack')}
          onPress={onBack}
        />
      </View>

      {/* Fixed action block. */}
      <View
        style={[
          styles.actions,
          {
            backgroundColor: theme.colors.surface,
            paddingHorizontal: theme.layout.screenPadding,
            paddingBottom: insets.bottom + theme.spacing.lg,
            gap: theme.spacing.md,
          },
        ]}
      >
        <Button
          title={t('common.createAccount')}
          fullWidth
          onPress={() => router.push('/register')}
        />
        <Button
          title={t('common.login')}
          variant="outline"
          fullWidth
          onPress={() => router.push('/login')}
        />
        <View style={styles.footer}>
          <Text variant="caption" color="textMuted">
            {t('onboarding.practitionerPrompt')}{' '}
          </Text>
          <Link
            label={t('onboarding.signUp')}
            variant="caption"
            onPress={() => router.push('/register')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { flex: 1, paddingTop: 32, alignItems: 'center' },
  slideTitle: { textAlign: 'center' },
  slideSubtitle: { textAlign: 'center', marginTop: 12, maxWidth: 320 },
  dots: { marginTop: 20 },
  backButton: { position: 'absolute', left: 16 },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
