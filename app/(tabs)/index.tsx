import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { searchService } from '@/api';
import { PractitionerCardView, professionLabelOf } from '@/components/practitioners';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import { Card, Chip, Link, Screen, Text } from '@/components/ui';
import { useAsync } from '@/hooks';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';
import type { GreetingBucket } from '@/utils';
import { firstNameOf, greetingBucketForDate, nearbyHasLocation, nearbyQuery } from '@/utils';

/**
 * Patient home (P8 — Homepage PRD). Composition top to bottom:
 *   1. time-of-day greeting with the session's first name (P8.T1);
 *   2. search entry (deep-links to Find Care);
 *   3. quick-category chips that pre-filter the search results (P8.T2);
 *   4. "Doctors near you" carousel — 6–8 cards, best-rated, with the
 *      documented graceful fallback (P8.T3, see `nearbyQuery`);
 *   5. three static health tips (P8.T5).
 * Every async surface has its loading / error / empty / stale-refetch state
 * from the feedback kit; the full-screen-free layout keeps stale content
 * mounted and reports a failed refresh with a Banner (standard §2).
 */

// No city source exists yet — the auth user carries identity fields only and
// the patient profile has no city — so the carousel runs the top-rated
// fallback branch. When a city source lands, plug it in here and the header
// + query switch to the city branch (see `nearbyQuery`).
const USER_CITY: string | null = null;

/** PRD spec: the carousel shows 6–8 practitioner cards. */
const NEARBY_MAX = 8;

const GREETING_KEYS: Record<GreetingBucket, `home.greeting${Capitalize<GreetingBucket>}`> = {
  morning: 'home.greetingMorning',
  afternoon: 'home.greetingAfternoon',
  evening: 'home.greetingEvening',
};

const GREETING_NAMELESS_KEYS: Record<
  GreetingBucket,
  `home.greeting${Capitalize<GreetingBucket>}Nameless`
> = {
  morning: 'home.greetingMorningNameless',
  afternoon: 'home.greetingAfternoonNameless',
  evening: 'home.greetingEveningNameless',
};

const HOME_CATEGORIES = ['doctors', 'nurses', 'cardiologist', 'dentists'] as const;

/** Static, localized tips (P8.T5) — no article routes exist in the MVP, so
 *  the cards are informational, never a dead-tapping "button to nowhere". */
const HEALTH_TIPS = [
  { key: 'sugar', icon: 'nutrition' },
  { key: 'sleep', icon: 'moon' },
  { key: 'soda', icon: 'water' },
] as const;

export default function HomeScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language === 'fr';
  const { session } = useAuth();

  // The greeting tracks the user's moment: recomputed on every focus so an
  // app left open across noon greets correctly on return (device-local —
  // see `greeting.ts` for why a greeting is not clinic-local).
  const [bucket, setBucket] = useState(() => greetingBucketForDate(new Date()));

  const nearby = useAsync(() => searchService.practitioners(nearbyQuery(USER_CITY)), []);
  const { refetch: refetchNearby } = nearby;
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      setBucket(greetingBucketForDate(new Date()));
      // Refetch on RE-focus (bookings elsewhere change availability); the
      // mount effect already fired, and two identical GETs is a wasted 3G
      // request. A failed refetch keeps the stale cards mounted below.
      if (hasFocused.current) void refetchNearby();
      hasFocused.current = true;
    }, [refetchNearby]),
  );

  const firstName = firstNameOf(session?.user.fullName);
  const greeting = t(
    firstName !== '' ? GREETING_KEYS[bucket] : GREETING_NAMELESS_KEYS[bucket],
    firstName !== '' ? { name: firstName } : {},
  );

  const nearbyItems = nearby.data ? nearby.data.data.slice(0, NEARBY_MAX) : [];
  const nearbyTitle = nearbyHasLocation(USER_CITY)
    ? t('home.nearby.titleCity', { city: USER_CITY })
    : t('home.nearby.titleRated');

  return (
    <Screen contentStyle={{ gap: theme.spacing.xl }}>
      {/* 1 — Greeting (P8.T1). */}
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          {greeting}
        </Text>
        <Text variant="body" color="textMuted">
          {t('home.subtitle')}
        </Text>
      </View>

      {/* 2 — Search entry. A pill that navigates to Find Care (Airbnb-style
          search affordance) rather than a second, duplicate input. */}
      <Pressable
        testID="home-search-entry"
        accessibilityRole="button"
        accessibilityLabel={t('home.searchAction')}
        onPress={() => router.push('/search')}
        style={({ pressed }) => [
          styles.searchEntry,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.control,
          },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />
        <Text variant="body" color="textMuted" numberOfLines={1}>
          {t('home.searchPlaceholder')}
        </Text>
      </Pressable>

      {/* 3 — Quick categories (P8.T2): each chip lands on pre-filtered
          search results; navigation chips clamp to 2 lines so OS font
          scaling × French expansion never clips (standard §7). */}
      <View style={styles.section}>
        <Text variant="subheading" accessibilityRole="header">
          {t('home.categoriesTitle')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {HOME_CATEGORIES.map((category) => (
            <Chip
              key={category}
              label={t(`home.categories.${category}`)}
              numberOfLines={2}
              style={styles.categoryChip}
              onPress={() =>
                router.push({ pathname: '/search', params: { category } })
              }
            />
          ))}
        </ScrollView>
      </View>

      {/* 4 — "Doctors near you" carousel (P8.T3). */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text variant="subheading" accessibilityRole="header">
            {nearbyTitle}
          </Text>
          <Link
            label={t('home.nearby.seeAll')}
            onPress={() => router.push('/search')}
            variant="label"
          />
        </View>

        {nearby.error && nearby.data !== null ? (
          // A refresh that failed while stale cards stay mounted — never a
          // silent failure the user can't tell apart from fresh data.
          <Banner message={t('home.nearby.refetchFailed')} tone="error" />
        ) : null}

        {nearby.isLoading && nearby.data === null ? (
          // First load: skeletons in the final card shape (3G manners —
          // standard §5), never a generic pulse box.
          <View testID="nearby-skeleton" style={styles.carousel}>
            {[0, 1].map((index) => (
              <Card key={index} elevation="none" style={styles.carouselItem}>
                <View style={styles.skeletonRow}>
                  <View
                    style={[
                      styles.skeletonAvatar,
                      { backgroundColor: theme.colors.surfaceAlt },
                    ]}
                  />
                  <View style={styles.skeletonLines}>
                    <View
                      style={[
                        styles.skeletonLine,
                        { backgroundColor: theme.colors.surfaceAlt },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonLine,
                        { backgroundColor: theme.colors.surfaceAlt },
                      ]}
                    />
                    <View
                      style={[
                        styles.skeletonLineShort,
                        { backgroundColor: theme.colors.surfaceAlt },
                      ]}
                    />
                  </View>
                </View>
              </Card>
            ))}
          </View>
        ) : null}

        {!nearby.isLoading && nearby.error && nearby.data === null ? (
          <ErrorState error={nearby.error} onRetry={nearby.refetch} />
        ) : null}

        {!nearby.isLoading && !nearby.error && nearbyItems.length === 0 ? (
          // Window honesty (standard §7): with no location filter, a
          // successful empty page IS the full window — the claim "none yet"
          // is provable, not a window artifact.
          <EmptyState
            title={t('home.nearby.emptyTitle')}
            message={t('home.nearby.emptyMessage')}
            icon={
              <Ionicons name="people-outline" size={48} color={theme.colors.textMuted} />
            }
            actionLabel={t('home.nearby.browseAll')}
            onAction={() => router.push('/search')}
          />
        ) : null}

        {!nearby.isLoading && nearbyItems.length > 0 ? (
          <FlatList
            testID="nearby-list"
            horizontal
            data={nearbyItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.carouselItem}>
                <PractitionerCardView
                  item={item}
                  professionLabel={professionLabelOf(item.profession, isFrench)}
                  onPress={() => router.push(`/practitioner/${item.id}`)}
                />
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            // Bleed to the screen edges so cards scroll edge-to-edge under
            // the section padding.
            style={styles.carouselBleed}
            contentContainerStyle={styles.carousel}
          />
        ) : null}
      </View>

      {/* 5 — Health tips (P8.T5): three static localized cards. */}
      <View style={styles.section}>
        <Text variant="subheading" accessibilityRole="header">
          {t('home.tips.title')}
        </Text>
        <View style={styles.tipsColumn}>
          {HEALTH_TIPS.map((tip) => (
            <Card key={tip.key} elevation="none">
              <View style={styles.tipRow}>
                <View
                  style={[styles.tipIcon, { backgroundColor: theme.colors.primaryMuted }]}
                >
                  <Ionicons name={tip.icon} size={22} color={theme.colors.primary} />
                </View>
                <View style={styles.tipBody}>
                  <Text variant="bodyStrong">{t(`home.tips.${tip.key}Title`)}</Text>
                  <Text variant="caption" color="textMuted">
                    {t(`home.tips.${tip.key}Body`)}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  searchEntry: {
    minHeight: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.85 },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  chipRow: { gap: 8, paddingRight: 24 },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 16 },
  carousel: { gap: 12, paddingHorizontal: 24 },
  carouselItem: { width: 280 },
  carouselBleed: { marginHorizontal: -24 },
  skeletonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  // Circles use the pill radius (999) like the chips — never a one-off arc.
  skeletonAvatar: { width: 52, height: 52, borderRadius: 999 },
  skeletonLines: { flex: 1, gap: 8 },
  skeletonLine: { height: 12, borderRadius: 6 },
  skeletonLineShort: { height: 12, borderRadius: 6, width: '55%' },
  tipsColumn: { gap: 12 },
  tipRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipBody: { flex: 1, gap: 2 },
});
