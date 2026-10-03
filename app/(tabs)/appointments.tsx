import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { appointmentsService } from '@/api';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import { Badge, Button, Chip, Screen, Spinner, Text } from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useAsync } from '@/hooks';
import { useTheme } from '@/theme';
import type { Appointment } from '@/types';
import { formatClinicDate } from '@/utils';

/**
 * Appointments tab (P4.T2): upcoming/past lists replacing the placeholder.
 * One role-aware cursor-paginated listing (FlatList + keyset `nextCursor`),
 * split client-side by the clinic clock; the detail route owns
 * cancel/reschedule. Refetches on re-focus without discarding visible
 * content (stale-while-revalidate: the full-screen Spinner is first load
 * only).
 */

type Segment = 'upcoming' | 'past';

const ACTIVE_STATUSES = new Set(['pending', 'confirmed']);

/** Page size for the backend's keyset cursor — history is never capped. */
const PAGE_SIZE = 50;

/** Split a booking list into upcoming (future, still active) and past — pure. */
export const splitAppointments = (
  appointments: readonly Appointment[],
  nowMs: number,
): { upcoming: Appointment[]; past: Appointment[] } => {
  const upcoming: Appointment[] = [];
  const past: Appointment[] = [];
  for (const appointment of appointments) {
    // A cancelled/finished booking is history even if its start is still ahead.
    if (ACTIVE_STATUSES.has(appointment.status) && Date.parse(appointment.startsAt) > nowMs) {
      upcoming.push(appointment);
    } else {
      past.push(appointment);
    }
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt)); // soonest first
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt)); // most recent first
  return { upcoming, past };
};

export default function AppointmentsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('upcoming');

  // First page via useAsync; later pages accumulate below, driven by the
  // backend keyset cursor (loading everything in one request would cap
  // history at the page size — Review 006 MAJOR 1).
  const list = useAsync(() => appointmentsService.list({ limit: PAGE_SIZE }), []);
  const [olderPages, setOlderPages] = useState<Appointment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // A fresh first page (mount, focus refetch, retry) resets the accumulation.
  useEffect(() => {
    setOlderPages([]);
    setNextCursor(list.data?.meta.nextCursor ?? null);
    setLoadMoreError(false);
  }, [list.data]);

  // `isRetry` bypasses the loadMoreError guard (qc-007 MAJOR): the Retry tap
  // runs while this closure still observes the captured `loadMoreError ===
  // true` — without the flag the call returned immediately and the retry
  // button hid itself doing nothing.
  const loadMore = useCallback(async (isRetry = false) => {
    if (nextCursor === null || isLoadingMore || (loadMoreError && !isRetry)) return;
    setIsLoadingMore(true);
    try {
      const page = await appointmentsService.list({ limit: PAGE_SIZE, cursor: nextCursor });
      setOlderPages((prev) => [...prev, ...page.data]);
      setNextCursor(page.meta.nextCursor);
    } catch {
      // Best-effort pagination: the loaded history stays usable; the footer
      // offers an explicit retry instead of failing the whole screen.
      setLoadMoreError(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore, loadMoreError]);

  const retryLoadMore = useCallback(() => {
    setLoadMoreError(false);
    void loadMore(true);
  }, [loadMore]);

  // Tabs stay mounted — refetch on every RE-focus so bookings/cancellations
  // made elsewhere show up. The initial focus is skipped: useAsync's mount
  // effect already fired, and two identical GETs is a wasted 3G request.
  const { refetch: refetchList } = list;
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current) void refetchList();
      hasFocused.current = true;
    }, [refetchList]),
  );

  const all = useMemo(
    () => (list.data ? [...list.data.data, ...olderPages] : []),
    [list.data, olderPages],
  );
  const { upcoming, past } = useMemo(() => splitAppointments(all, Date.now()), [all]);
  const shown = segment === 'upcoming' ? upcoming : past;

  // Stale-while-revalidate (Review 006 MAJOR 2): a refocus refetch must keep
  // the list mounted — the full-screen Spinner is the FIRST load only.
  if (list.isLoading && list.data === null) {
    return (
      <Screen>
        <View testID="appointments-spinner" style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (list.error && list.data === null) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <Text variant="title">{t('appointments.title')}</Text>
        <ErrorState error={list.error} onRetry={list.refetch} />
      </Screen>
    );
  }

  const emptyState =
    segment === 'upcoming' ? (
      <EmptyState
        icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
        title={t('appointments.upcomingEmptyTitle')}
        message={t('appointments.upcomingEmptyMessage')}
        actionLabel={t('appointments.upcomingEmptyAction')}
        onAction={() => router.push('/search')}
      />
    ) : (
      <EmptyState
        icon={<Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />}
        title={t('appointments.pastEmptyTitle')}
        message={t('appointments.pastEmptyMessage')}
      />
    );

  return (
    // Not a ScrollView screen: the FlatList owns scrolling so virtualization
    // and onEndReached work (history is unbounded).
    <Screen scroll={false} contentStyle={{ gap: theme.spacing.lg }}>
      <Text variant="title">{t('appointments.title')}</Text>

      <View style={styles.segments}>
        <Chip
          testID="appointments-segment-upcoming"
          label={t('appointments.upcoming')}
          selected={segment === 'upcoming'}
          onPress={() => setSegment('upcoming')}
          style={styles.segment}
        />
        <Chip
          testID="appointments-segment-past"
          label={t('appointments.past')}
          selected={segment === 'past'}
          onPress={() => setSegment('past')}
          style={styles.segment}
        />
      </View>

      {list.error ? <Banner message={list.error.message} tone="error" /> : null}

      <FlatList
        style={styles.listFlex}
        data={shown}
        keyExtractor={(appointment) => appointment.id}
        renderItem={({ item }) => <AppointmentRow appointment={item} />}
        ListEmptyComponent={emptyState}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <Spinner />
            </View>
          ) : loadMoreError ? (
            <Button title={t('common.retry')} variant="outline" onPress={retryLoadMore} />
          ) : null
        }
        onEndReached={nextCursor !== null ? () => void loadMore() : undefined}
        onEndReachedThreshold={0.25}
        contentContainerStyle={shown.length === 0 ? { flexGrow: 1 } : styles.list}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

/** A practitioner row in the appointments list — memoized (FlatList rows). */
const AppointmentRow = memo(function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const status = statusPresentation(appointment.status);
  const type = t(`search.${CONSULTATION_TYPE_KEYS[appointment.consultationType]}`);
  // Row density: `medium` reads better than `full` at this size, especially
  // with French expansion (Review 006 minor).
  const when = formatClinicDate(appointment.startsAt, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Pressable
      testID={`appointment-row-${appointment.id}`}
      accessibilityRole="button"
      // Type + when + price + state — not just the date (Review 006 minor).
      accessibilityLabel={`${type}, ${when}, ${appointment.priceXaf.toLocaleString()} XAF, ${t(`appointments.${status.key}`)}`}
      onPress={() => router.push(`/appointments/${appointment.id}`)}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rowMain}>
        <Text variant="bodyStrong">{type}</Text>
        <Text variant="body" color="textMuted">
          {when}
        </Text>
        <Text variant="caption" color="textMuted">
          {appointment.priceXaf.toLocaleString()} XAF
        </Text>
      </View>
      <Badge label={t(`appointments.${status.key}`)} tone={status.tone} />
    </Pressable>
  );
});

/** Maps the lifecycle status to a localized label key + badge tone. */
export const statusPresentation = (
  status: Appointment['status'],
): { key: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' } => {
  switch (status) {
    case 'pending':
      return { key: 'statusPending', tone: 'warning' };
    case 'confirmed':
      return { key: 'statusConfirmed', tone: 'success' };
    case 'cancelled':
      return { key: 'statusCancelled', tone: 'neutral' };
    case 'completed':
      return { key: 'statusCompleted', tone: 'primary' };
    default:
      return { key: 'statusNoShow', tone: 'danger' };
  }
};

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1 },
  list: { gap: 12, paddingBottom: 24, flexGrow: 1 },
  listFlex: { flex: 1 },
  footer: { alignItems: 'center', paddingVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    padding: 16,
  },
  pressed: { opacity: 0.85 },
  rowMain: { flex: 1, gap: 2 },
});
