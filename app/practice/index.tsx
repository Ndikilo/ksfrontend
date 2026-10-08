import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { appointmentsService, isApiError } from '@/api';
import { AppointmentRow, PendingRequestRow } from '@/components/appointments';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import { Button, Chip, IconButton, Screen, Spinner, Text } from '@/components/ui';
import { useAsync } from '@/hooks';
import { useTheme } from '@/theme';
import type { ApiError, Appointment, ID } from '@/types';
import { clinicDateKey, formatClinicDate, splitAppointments } from '@/utils';

/**
 * Practitioner agenda (P7.T1/P7.T3) — the console's home tab, over the
 * role-aware `GET /v1/appointments?scope=practitioner`. Four segments:
 *
 * - Requests (P7.T3): incoming `status=pending` bookings, each row carrying
 *   its two decisions — Confirm (`POST /v1/appointments/{id}/confirm`) and
 *   Decline (`POST .../cancel`, which is what a practitioner decline IS on
 *   the backend: pending + practitioner actor = the `declined` lifecycle
 *   scenario). Both run optimistically with rollback; a 409 state conflict
 *   (the patient cancelled meanwhile) refetches the true state.
 * - Day (P7.T3): one clinic-local date at a time (prev/next, default today),
 *   in time order with a now/next anchor.
 * - Upcoming / Past: the P7.T1 split.
 *
 * One fetch serves every segment (the status filter would cost a second
 * request on 3G for the same rows); each decision lands in the segment it
 * belongs to the moment its optimistic status flips.
 */

type Segment = 'pending' | 'day' | 'upcoming' | 'past';

/** One FlatList row: a booking, or the day view's now/next anchor. */
type AgendaItem =
  | { kind: 'appointment'; appointment: Appointment }
  | { kind: 'now' };

/** Page size for the backend's keyset cursor — history is never capped. */
const PAGE_SIZE = 50;

// Calendar-key helpers (same convention as the availability editor): a
// `YYYY-MM-DD` clinic-local key is moved with device calendar arithmetic and
// rendered at UTC noon, so it shows the same date on every device.
const shiftDayKey = (key: string, days: number): string => {
  const [year = 2000, month = 1, day = 1] = key.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + days);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-${String(shifted.getDate()).padStart(2, '0')}`;
};

/** A `YYYY-MM-DD` key rendered at UTC noon — the same calendar date everywhere. */
const formatDayKey = (key: string): string =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'utc' }).format(
    new Date(`${key}T12:00:00Z`),
  );

/** Long weekday name of a `YYYY-MM-DD` key, in the UI language. */
const weekdayOfDayKey = (key: string): string =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long', timeZone: 'utc' }).format(
    new Date(`${key}T12:00:00Z`),
  );

export default function AgendaScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [segment, setSegment] = useState<Segment>('upcoming');

  // The practitioner's clock: captured on mount and refreshed on focus /
  // day navigation — enough for the day view's now anchor, without a timer.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dayKey, setDayKey] = useState(() => clinicDateKey(Date.now()));

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
  // two identical GETs is a wasted 3G request. Skipped while a decision is in
  // flight too, so the refresh cannot clobber an optimistic row (the
  // availability-editor pattern).
  const { refetch: refetchList } = list;
  const busyRef = useRef(false);
  const hasFocused = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasFocused.current && !busyRef.current) {
        void refetchList();
        setNowMs(Date.now());
      }
      hasFocused.current = true;
    }, [refetchList]),
  );

  // --- Incoming-request decisions (P7.T3) -----------------------------------
  // Optimistic rows by appointment id: a confirm/decline writes the new status
  // here FIRST (the row moves segments instantly), rolls back on failure, and
  // merges the server response on success. Single-appointment responses carry
  // no persona names (list-only data), so those never overwrite the row's.
  const [patches, setPatches] = useState<Record<ID, Appointment>>({});
  const [inFlightId, setInFlightId] = useState<ID | null>(null);
  const [inFlightAction, setInFlightAction] = useState<'confirm' | 'decline' | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runRequestAction = useCallback(
    async (appointment: Appointment, action: 'confirm' | 'decline') => {
      if (busyRef.current) return;
      busyRef.current = true;
      setMutationError(null);
      setInFlightId(appointment.id);
      setInFlightAction(action);
      setPatches((prev) => ({
        ...prev,
        [appointment.id]: {
          ...appointment,
          status: action === 'confirm' ? 'confirmed' : 'cancelled',
        },
      }));
      try {
        const settled =
          action === 'confirm'
            ? await appointmentsService.confirm(appointment.id)
            : await appointmentsService.cancel(appointment.id);
        setPatches((prev) => ({
          ...prev,
          [appointment.id]: {
            ...appointment,
            ...settled,
            patientName: appointment.patientName,
            practitionerName: appointment.practitionerName,
          },
        }));
      } catch (err) {
        // Roll back to the last-known true state before anything is said.
        setPatches((prev) => {
          const next = { ...prev };
          delete next[appointment.id];
          return next;
        });
        const error: ApiError = isApiError(err) ? err : { status: 0, message: '' };
        if (error.code === 'APPOINTMENT_STARTED') {
          setMutationError(t('practice.requestErrors.started'));
          void refetchList();
        } else if (error.code === 'APPOINTMENT_STATE_INVALID') {
          // Someone moved first — typically the patient cancelled while the
          // decision was in flight. Say so, then show the REAL current state.
          setMutationError(t('practice.requestErrors.stateConflict'));
          void refetchList();
        } else {
          setMutationError(t('practice.requestErrors.actionFailed'));
        }
      } finally {
        busyRef.current = false;
        setInFlightId(null);
        setInFlightAction(null);
      }
    },
    [refetchList, t],
  );

  const pressDecline = useCallback(
    (appointment: Appointment) => {
      // Destructive actions confirm (standard §2), consequence spelled out.
      Alert.alert(t('practice.declineConfirmTitle'), t('practice.declineConfirmMessage'), [
        { text: t('practice.declineKeepAction'), style: 'cancel' },
        {
          text: t('practice.declineRequest'),
          style: 'destructive',
          onPress: () => {
            void runRequestAction(appointment, 'decline');
          },
        },
      ]);
    },
    [runRequestAction, t],
  );

  const navigateDay = useCallback((days: number) => {
    setNowMs(Date.now());
    setDayKey((prev) => shiftDayKey(prev, days));
  }, []);

  // --- Segment data ----------------------------------------------------------
  const all = useMemo(
    () => (list.data ? [...list.data.data, ...olderPages] : []),
    [list.data, olderPages],
  );
  const patched = useMemo(
    () => all.map((appointment) => patches[appointment.id] ?? appointment),
    [all, patches],
  );
  const { upcoming, past } = useMemo(() => splitAppointments(patched, nowMs), [patched, nowMs]);
  // Requests: pending AND still ahead of their start — the state machine ends
  // a pending request at its start time, so one of those is history, not a
  // decision (its decline would be APPOINTMENT_STARTED, not a decline).
  // An in-flight row STAYS pinned here with its new badge until the mutation
  // settles (or rolls back) — the optimistic flip must be visible on the row
  // the practitioner acted on, not a silent disappearance.
  const pendingRequests = useMemo(
    () =>
      upcoming.filter(
        (appointment) =>
          appointment.status === 'pending' ||
          (inFlightId === appointment.id && patches[appointment.id] !== undefined),
      ),
    [upcoming, inFlightId, patches],
  );

  // Day view: the selected clinic-local date in time order, with a now/next
  // anchor between the day's ended and still-ongoing bookings (today only).
  const dayItems = useMemo<AgendaItem[]>(() => {
    const rows = patched
      .filter((appointment) => clinicDateKey(appointment.startsAt) === dayKey)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    if (clinicDateKey(nowMs) === dayKey) {
      const nextIndex = rows.findIndex((appointment) => Date.parse(appointment.endsAt) > nowMs);
      if (nextIndex !== -1) {
        return [
          ...rows.slice(0, nextIndex).map((appointment): AgendaItem => ({ kind: 'appointment', appointment })),
          { kind: 'now' },
          ...rows.slice(nextIndex).map((appointment): AgendaItem => ({ kind: 'appointment', appointment })),
        ];
      }
    }
    return rows.map((appointment): AgendaItem => ({ kind: 'appointment', appointment }));
  }, [patched, dayKey, nowMs]);

  const shown = useMemo<AgendaItem[]>(() => {
    switch (segment) {
      case 'pending':
        return pendingRequests.map((appointment) => ({ kind: 'appointment', appointment }));
      case 'day':
        return dayItems;
      case 'upcoming':
        return upcoming.map((appointment) => ({ kind: 'appointment', appointment }));
      case 'past':
        return past.map((appointment) => ({ kind: 'appointment', appointment }));
    }
  }, [segment, pendingRequests, dayItems, upcoming, past]);

  const isToday = dayKey === clinicDateKey(nowMs);

  const renderItem = useCallback(
    ({ item }: { item: AgendaItem }) => {
      if (item.kind === 'now') {
        const time = formatClinicDate(nowMs, { timeStyle: 'short' });
        return (
          <View
            testID="agenda-now-marker"
            accessibilityLabel={t('practice.nowLabel', { time })}
            style={styles.nowRow}
          >
            <View style={[styles.nowLine, { backgroundColor: theme.colors.borderStrong }]} />
            <Text variant="caption" color="textMuted">
              {t('practice.nowLabel', { time })}
            </Text>
            <View style={[styles.nowLine, { backgroundColor: theme.colors.borderStrong }]} />
          </View>
        );
      }
      const { appointment } = item;
      if (segment === 'pending') {
        return (
          <PendingRequestRow
            appointment={appointment}
            // WHO each request is for — the persona-naming rule (Review 012).
            contextName={appointment.patientName ?? undefined}
            confirming={inFlightId === appointment.id && inFlightAction === 'confirm'}
            declining={inFlightId === appointment.id && inFlightAction === 'decline'}
            actionsDisabled={inFlightId !== null}
            onConfirm={() => void runRequestAction(appointment, 'confirm')}
            onDecline={() => pressDecline(appointment)}
          />
        );
      }
      return (
        <AppointmentRow
          appointment={appointment}
          contextName={appointment.patientName ?? undefined}
        />
      );
    },
    [segment, inFlightId, inFlightAction, runRequestAction, pressDecline, nowMs, t, theme],
  );

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

  const emptyState = (() => {
    switch (segment) {
      case 'pending':
        return (
          <EmptyState
            icon={<Ionicons name="mail-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.pendingEmptyTitle')}
            message={t('practice.pendingEmptyMessage')}
          />
        );
      case 'day':
        return (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.dayEmptyTitle', { date: formatDayKey(dayKey) })}
            message={t('practice.dayEmptyMessage')}
          />
        );
      case 'upcoming':
        return (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.upcomingEmptyTitle')}
            message={t('practice.upcomingEmptyMessage')}
          />
        );
      case 'past':
        return (
          <EmptyState
            icon={<Ionicons name="time-outline" size={48} color={theme.colors.textMuted} />}
            title={t('practice.pastEmptyTitle')}
            message={t('practice.pastEmptyMessage')}
          />
        );
    }
  })();

  return (
    // Not a ScrollView screen: the FlatList owns scrolling so virtualization
    // and onEndReached work (history is unbounded).
    <Screen scroll={false} contentStyle={{ gap: theme.spacing.lg }}>
      <View style={styles.headerRow}>
        <Text variant="title">{t('practice.agendaTitle')}</Text>
        {/* One-tap entry to calendar management (P7.T2) — the Doctolib-style
            availability affordance lives in the agenda header. */}
        <IconButton
          name="calendar-outline"
          variant="ghost"
          accessibilityLabel={t('practice.manageAvailability')}
          onPress={() => router.push('/practice/availability')}
        />
      </View>

      <View style={styles.segments}>
        <Chip
          testID="agenda-segment-pending"
          label={t('practice.segmentRequests')}
          selected={segment === 'pending'}
          onPress={() => setSegment('pending')}
          style={styles.segment}
        />
        <Chip
          testID="agenda-segment-day"
          label={t('practice.segmentDay')}
          selected={segment === 'day'}
          onPress={() => {
            setNowMs(Date.now());
            setSegment('day');
          }}
          style={styles.segment}
        />
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

      {/* Refetch failure while stale rows stay mounted must be visible, not
          silent (the patient-tab pattern, codified standard §2). A failed
          decision says what happened + what to do next under it. */}
      {list.error ? <Banner message={list.error.message} tone="error" /> : null}
      {mutationError ? <Banner message={mutationError} tone="error" /> : null}

      <FlatList
        style={styles.listFlex}
        data={shown}
        keyExtractor={(item) => (item.kind === 'now' ? 'now-marker' : item.appointment.id)}
        renderItem={renderItem}
        ListHeaderComponent={
          segment === 'day' ? (
            <View style={styles.dayNav} testID="agenda-day-nav">
              <IconButton
                name="chevron-back"
                variant="ghost"
                accessibilityLabel={t('practice.dayPrev')}
                onPress={() => navigateDay(-1)}
              />
              <View style={styles.dayLabelBox}>
                <Text variant="subheading" align="center">
                  {formatDayKey(dayKey)}
                </Text>
                <Text variant="caption" color="textMuted" align="center">
                  {isToday ? t('practice.todayLabel') : weekdayOfDayKey(dayKey)}
                </Text>
              </View>
              <IconButton
                name="chevron-forward"
                variant="ghost"
                accessibilityLabel={t('practice.dayNext')}
                onPress={() => navigateDay(1)}
              />
            </View>
          ) : null
        }
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segments: { flexDirection: 'row', gap: 8 },
  // Four segments share the row: the pill's own 16pt padding shrinks to the
  // 4pt scale step so every label survives on a narrow screen.
  segment: { flex: 1, paddingHorizontal: 4 },
  list: { gap: 12, paddingBottom: 24, flexGrow: 1 },
  listFlex: { flex: 1 },
  footer: { alignItems: 'center', paddingVertical: 16 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabelBox: { flex: 1, gap: 2 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  nowLine: { flex: 1, height: 1 },
});
