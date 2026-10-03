import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { appointmentsService } from '@/api';
import { Banner, ErrorState } from '@/components/feedback';
import { Badge, Button, Card, Chip, Divider, Screen, Spinner, Text } from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useAsync, useMutation } from '@/hooks';
import { useTheme } from '@/theme';
import type { Appointment, ID } from '@/types';
import { formatClinicDate, groupSlotsByDay } from '@/utils';

import { statusPresentation } from '../(tabs)/appointments';

/**
 * Appointment detail (P4.T2): the booking's snapshot facts (when — clinic
 * time, what, price, cancellation terms) plus the two lifecycle actions,
 * cancel and reschedule, both behind confirmations. Times are clinic-local
 * (Africa/Douala); errors arrive localized from the backend.
 */

const DAY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function AppointmentDetailScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rescheduling, setRescheduling] = useState(false);
  const [justRescheduled, setJustRescheduled] = useState(false);

  const detail = useAsync(() => appointmentsService.get(id), [id]);
  const appointment = detail.data;

  const cancel = useMutation(appointmentsService.cancel, {
    onSuccess: () => void detail.refetch(),
  });

  const onPressCancel = useCallback(() => {
    if (!appointment) return;
    // Same rule as the backend policy engine: late = less notice remaining
    // than the snapshot window — but a 0 fee means cancelling is always free.
    const msRemaining = Date.parse(appointment.startsAt) - Date.now();
    const wouldBeLate =
      appointment.cancellationFeeXaf > 0 &&
      msRemaining < appointment.cancellationNoticeHours * 3_600_000;
    Alert.alert(
      t('appointments.cancelConfirmTitle'),
      wouldBeLate
        ? t('appointments.cancelConfirmLate', {
            hours: appointment.cancellationNoticeHours,
            fee: appointment.cancellationFeeXaf.toLocaleString(),
          })
        : t('booking.confirmPolicyFree', { hours: appointment.cancellationNoticeHours }),
      [
        { text: t('appointments.cancelKeep'), style: 'cancel' },
        {
          text: t('appointments.cancelConfirm'),
          style: 'destructive',
          onPress: () => void cancel.mutate(appointment.id),
        },
      ],
    );
  }, [appointment, cancel, t]);

  if (detail.isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (detail.error || !appointment) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <ErrorState
          error={detail.error ?? t('practitioner.notFound')}
          onRetry={detail.refetch}
        />
      </Screen>
    );
  }

  const status = statusPresentation(appointment.status);
  const actionable = appointment.status === 'pending' || appointment.status === 'confirmed';

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <BackButton />
      <View style={styles.header}>
        <Text variant="title">{t('appointments.detailTitle')}</Text>
        <View testID={`appointment-status-${appointment.status}`}>
          <Badge label={t(`appointments.${status.key}`)} tone={status.tone} />
        </View>
      </View>

      {cancel.error ? <Banner tone="error" message={cancel.error.message} /> : null}
      {justRescheduled ? (
        <Banner tone="success" message={t('appointments.rescheduledBanner')} />
      ) : null}
      {appointment.status === 'cancelled' ? (
        <Banner tone="info" message={t('appointments.cancelledBanner')} />
      ) : null}
      {appointment.status === 'cancelled' && appointment.lateCancellation ? (
        <Banner
          tone="warning"
          message={t('appointments.lateCancelBanner', {
            hours: appointment.cancellationNoticeHours,
            fee: appointment.cancellationFeeXaf.toLocaleString(),
          })}
        />
      ) : null}

      <Card>
        <Text variant="caption" color="textMuted">
          {t('booking.whenLabel')}
        </Text>
        <Text variant="bodyStrong">
          {formatClinicDate(appointment.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
        </Text>
        <Divider spacing={theme.spacing.sm} />
        <Text variant="caption" color="textMuted">
          {t('booking.offeringLabel')}
        </Text>
        <Text variant="bodyStrong">
          {t(`search.${CONSULTATION_TYPE_KEYS[appointment.consultationType]}`)}
        </Text>
        {appointment.dependentId !== null ? (
          <Text variant="caption" color="textMuted">
            {t('appointments.forDependent')}
          </Text>
        ) : null}
        <Divider spacing={theme.spacing.sm} />
        <Text variant="caption" color="textMuted">
          {t('appointments.priceLabel')}
        </Text>
        <Text variant="bodyStrong">{appointment.priceXaf.toLocaleString()} XAF</Text>
      </Card>

      {/* The booking's cancellation-policy snapshot — the terms this booking
          actually honors, not the practitioner's current settings. */}
      <Card>
        <Text variant="caption" color="textMuted">
          {appointment.cancellationFeeXaf > 0
            ? t('booking.confirmPolicyFee', {
                hours: appointment.cancellationNoticeHours,
                fee: appointment.cancellationFeeXaf.toLocaleString(),
              })
            : t('booking.confirmPolicyFree', { hours: appointment.cancellationNoticeHours })}
        </Text>
      </Card>

      {actionable ? (
        <>
          {rescheduling ? (
            <ReschedulePicker
              appointment={appointment}
              onDone={() => {
                setRescheduling(false);
                setJustRescheduled(true);
                void detail.refetch();
              }}
            />
          ) : (
            <Button
              title={t('appointments.rescheduleAction')}
              variant="outline"
              fullWidth
              onPress={() => setRescheduling(true)}
            />
          )}
          <Button
            title={t('appointments.cancelAction')}
            variant="danger"
            fullWidth
            loading={cancel.isLoading}
            disabled={cancel.isLoading}
            onPress={onPressCancel}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** Inline slot picker for moving the booking (same practitioner + offering). */
function ReschedulePicker({
  appointment,
  onDone,
}: {
  appointment: Appointment;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [slotKey, setSlotKey] = useState<string | null>(null);

  const slots = useAsync(
    () =>
      appointmentsService.openSlots(
        appointment.practitionerProfileId,
        new Date().toISOString(),
        new Date(Date.now() + DAY_WINDOW_MS).toISOString(),
      ),
    [appointment.practitionerProfileId],
  );

  // Only slots that fit THIS booking's offering (the backend re-validates).
  const days = useMemo(
    () =>
      groupSlotsByDay(
        (slots.data?.data ?? []).filter((slot) =>
          slot.consultationTypes.includes(appointment.consultationType),
        ),
      ),
    [slots.data, appointment.consultationType],
  );
  const activeDay = days.find((day) => day.key === dayKey) ?? days[0] ?? null;

  const reschedule = useMutation<Appointment, { id: ID; slotId: string }>(
    ({ id, slotId }) => appointmentsService.reschedule(id, { slotId }),
    { onSuccess: onDone },
  );

  if (slots.isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner />
      </View>
    );
  }
  if (slots.error) {
    return <Banner tone="error" message={slots.error.message} />;
  }

  return (
    <Card>
      <Text variant="subheading">{t('appointments.rescheduleTitle')}</Text>
      {days.length === 0 ? (
        <Text variant="body" color="textMuted">
          {t('appointments.rescheduleEmpty')}
        </Text>
      ) : (
        <>
          {reschedule.error ? <Banner tone="error" message={reschedule.error.message} /> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {days.map((day) => (
                <Chip
                  key={day.key}
                  testID={`reschedule-day-${day.key}`}
                  label={day.label}
                  selected={day.key === activeDay?.key}
                  onPress={() => setDayKey(day.key)}
                />
              ))}
            </View>
          </ScrollView>
          <View style={styles.slotWrap}>
            {(activeDay?.slots ?? []).map((slot) => (
              <Chip
                key={slot.key}
                testID={`reschedule-slot-${slot.key}`}
                label={formatClinicDate(slot.startsAt, { timeStyle: 'short' })}
                selected={slotKey === slot.key}
                onPress={() => setSlotKey(slot.key)}
              />
            ))}
          </View>
          <Button
            title={t('appointments.rescheduleConfirm')}
            fullWidth
            disabled={slotKey === null}
            loading={reschedule.isLoading}
            onPress={() => {
              if (slotKey === null) return;
              void reschedule.mutate({ id: appointment.id, slotId: slotKey });
            }}
          />
        </>
      )}
    </Card>
  );
}

function BackButton() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.goBack')}
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.back}
    >
      <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  chipRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  slotWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  back: { padding: 4, alignSelf: 'flex-start' },
});
