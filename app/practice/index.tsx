import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { appointmentsService } from '@/api';
import { AppointmentRow } from '@/components/appointments';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Button, Chip, Screen, Spinner, Text } from '@/components/ui';
import { useAsync } from '@/hooks';
import { useTheme } from '@/theme';
import type { Appointment } from '@/types';
import { splitAppointments } from '@/utils';

/**
 * Practitioner agenda (P7.T1) — the console's home tab. A functional-but-
 * minimal overview of the professional calendar via the role-aware
 * `GET /v1/appointments?scope=practitioner`: upcoming/past segments, keyset
 * pagination, and the shared kit states. The full incoming-appointments
 * workflow (pending list, confirm/decline, day view) lands with P7.T3.
 */

type Segment = 'upcoming' | 'past';

/** Page size for the backend's keyset cursor — history is never capped. */
const PAGE_SIZE = 50;

export default function AgendaScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('upcoming');

  // The practitioner scope: the backend answers 403/404 for non-practitioners
  // — this route is unreachable for them (the console layout redirects), so a
  // failure here is surfaced as a normal retryable error state.
  const list = useAsync(
    () => appointmentsService.list({ scope: 'practitioner', limit: PAGE_SIZE }),
    [],
  );
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
  // true` — without the flag the call would return immediately (a dead tap).
  const loadMore = useCallback(async (isRetry = false) => {
    if (nextCursor === null || isLoadingMore || (loadMoreError && !isRetry)) return;
    setIsLoadingMore(true);
    try {
      const page = await appointmentsService.list({
        scope: 'practitioner',
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
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

  // Tabs stay mounted — refetch on every RE-focus so new bookings show up.
  // The initial focus is skipped: useAsync's mount effect already fired, and
  // two identical GETs is a wasted 3G request.
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

  // Stale-while-revalidate: a refocus refetch must keep the list mounted —
  // the full-screen Spinner is the FIRST load only.
  if (list.isLoading && list.data === null) {
    return (
      <Screen>
        <View testID="agenda-spinner" style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (list.error && list.data === null) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <Text variant="title">{t('practice.agendaTitle')}</Text>
        <ErrorState error={list.error} onRetry={list.refetch} />
      </Screen>
    );
  }

  const emptyState =
    segment === 'upcoming' ? (
      <EmptyState
        icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
        title={t('practice.upcomingEmptyTitle')}
        message={t('practice.upcomingEmptyMessage')}
      />
    ) : (
      <EmptyState
        icon={<Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />}
        title={t('practice.pastEmptyTitle')}
        message={t('practice.pastEmptyMessage')}
      />
    );

  return (
    // Not a ScrollView screen: the FlatList owns scrolling so virtualization
    // and onEndReached work (history is unbounded).
    <Screen scroll={false} contentStyle={{ gap: theme.spacing.lg }}>
      <Text variant="title">{t('practice.agendaTitle')}</Text>

      <View style={styles.segments}>
        <Chip
          testID="agenda-segment-upcoming"
          label={t('appointments.upcoming')}
          selected={segment === 'upcoming'}
          onPress={() => setSegment('upcoming')}
          style={styles.segment}
        />
        <Chip
          testID="agenda-segment-past"
          label={t('appointments.past')}
          selected={segment === 'past'}
          onPress={() => setSegment('past')}
          style={styles.segment}
        />
      </View>

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

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1 },
  list: { gap: 12, paddingBottom: 24, flexGrow: 1 },
  listFlex: { flex: 1 },
  footer: { alignItems: 'center', paddingVertical: 16 },
});
