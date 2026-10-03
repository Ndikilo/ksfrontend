import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { appointmentsService } from '@/api';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Badge, Chip, Screen, Spinner, Text } from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useAsync } from '@/hooks';
import { useTheme } from '@/theme';
import type { Appointment } from '@/types';
import { formatClinicDate } from '@/utils';

/**
 * Appointments tab (P4.T2): upcoming/past lists replacing the placeholder.
 * Both lists come from the one role-aware listing, split client-side by the
 * clinic clock; the detail route owns cancel/reschedule. Refetches on every
 * focus so a booking/cancellation made elsewhere is reflected immediately.
 */

type Segment = 'upcoming' | 'past';

const ACTIVE_STATUSES = new Set(['pending', 'confirmed']);

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

  const list = useAsync(() => appointmentsService.list({ limit: 100 }), []);
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

  const { upcoming, past } = useMemo(
    () => splitAppointments(list.data?.data ?? [], Date.now()),
    [list.data],
  );
  const shown = segment === 'upcoming' ? upcoming : past;

  if (list.isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (list.error) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <Text variant="title">{t('appointments.title')}</Text>
        <ErrorState error={list.error} onRetry={list.refetch} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
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

      {shown.length === 0 ? (
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
        )
      ) : (
        <View style={styles.list}>
          {shown.map((appointment) => (
            <AppointmentRow key={appointment.id} appointment={appointment} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const status = statusPresentation(appointment.status);

  return (
    <Pressable
      testID={`appointment-row-${appointment.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${formatClinicDate(appointment.startsAt, {
        dateStyle: 'full',
        timeStyle: 'short',
      })}, ${t(`appointments.${status.key}`)}`}
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
        <Text variant="bodyStrong">
          {t(`search.${CONSULTATION_TYPE_KEYS[appointment.consultationType]}`)}
        </Text>
        <Text variant="body" color="textMuted">
          {formatClinicDate(appointment.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
        </Text>
        <Text variant="caption" color="textMuted">
          {appointment.priceXaf.toLocaleString()} XAF
        </Text>
      </View>
      <Badge label={t(`appointments.${status.key}`)} tone={status.tone} />
    </Pressable>
  );
}

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
  list: { gap: 12 },
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
