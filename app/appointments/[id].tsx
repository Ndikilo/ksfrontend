import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
        : t('appointments.cancelConfirmFree'),
      [
        { text: t('appointments.cancelKeep'), style: 'cancel' },
        {
          text: t('appointments.cancelConfirm'),
          style: 'destructive',
          onPress: () => {
            // A move that just succeeded is no longer news once cancelled.
            setJustRescheduled(false);
            void cancel.mutate(appointment.id);
          },
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
  // The backend rejects cancel/reschedule once the slot has started
  // (APPOINTMENT_STARTED) — hide the actions instead of promising a 409.
  const started = Date.parse(appointment.startsAt) <= Date.now();
  const actionable =
    (appointment.status === 'pending' || appointment.status === 'confirmed') && !started;

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
      {appointment.status === 'pending' ? (
        <Banner tone="info" message={t('appointments.pendingBanner')} />
      ) : null}
      {appointment.status === 'cancelled' ? (
        <Banner tone="info" message={t('appointments.cancelledBanner')} />
      ) : null}
      {appointment.status === 'cancelled' &&
      appointment.lateCancellation &&
      // The backend stamps lateCancellation regardless of fee; with a 0-fee
      // policy "0 XAF fee applies" is money-copy nonsense — no banner (the
      // cancelledBanner above already explains the state).
      appointment.cancellationFeeXaf > 0 ? (
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
              onClose={() => setRescheduling(false)}
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
  onClose,
}: {
  appointment: Appointment;
  onDone: () => void;
  /** Close the picker without moving (the pick is one-way otherwise). */
  onClose: () => void;
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

  // SLOT_TAKEN recovery (same rule as the booking flow, Review 005 A4): the
  // picked slot is dead — clear it and refetch availability, or keeping it
  // selected would guarantee a second 409. Other errors keep the selection
  // (the pick is still plausible; the Confirm button is the retry).
  const refetchSlots = slots.refetch;
  useEffect(() => {
    if (reschedule.error?.code === 'SLOT_TAKEN') {
      setSlotKey(null);
      void refetchSlots();
    }
  }, [reschedule.error, refetchSlots]);

  if (slots.isLoading) {
    return (
      <View style={styles.centered}>
        <Spinner />
      </View>
    );
  }
  if (slots.error) {
    return (
      <>
        <Banner tone="error" message={slots.error.message} />
        <Button
          title={t('common.retry')}
          variant="outline"
          fullWidth
          onPress={() => void refetchSlots()}
        />
        {/* Every picker branch keeps an exit (qc-007 minor): the sole escape
            must not be a back gesture that abandons the whole detail screen. */}
        <Button
          title={t('appointments.rescheduleKeepCurrent')}
          variant="outline"
          fullWidth
          onPress={onClose}
        />
      </>
    );
  }

  return (
    <Card>
      <Text variant="subheading">{t('appointments.rescheduleTitle')}</Text>
      {days.length === 0 ? (
        <>
          <Text variant="body" color="textMuted">
            {t('appointments.rescheduleEmpty')}
          </Text>
          {/* Availability may have changed since the screen opened — offer the
              refresh instead of a dead end. */}
          <Button
            title={t('appointments.rescheduleEmptyAction')}
            variant="outline"
            fullWidth
            onPress={() => void refetchSlots()}
          />
        </>
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
            {(activeDay?.slots ?? []).map((slot) => {
              const selected = slotKey === slot.key;
              const time = formatClinicDate(slot.startsAt, { timeStyle: 'short' });
              // Screen readers get time + type + state, not a bare "10:00"
              // (same rule as the booking flow's slot chips — shared keys).
              const types = slot.consultationTypes
                .map((type) => t(`search.${CONSULTATION_TYPE_KEYS[type]}`))
                .join(' / ');
              return (
                <Chip
                  key={slot.key}
                  testID={`reschedule-slot-${slot.key}`}
                  label={time}
                  selected={selected}
                  accessibilityLabel={t('booking.slotChipLabel', {
                    time,
                    types,
                    state: selected ? t('booking.chipSelected') : t('booking.chipNotSelected'),
                  })}
                  onPress={() => setSlotKey(slot.key)}
                />
              );
            })}
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
      {/* Rendered in BOTH the empty and populated branches (qc-007 minor):
          "Keep current time" was previously reachable only with slots loaded. */}
      <Button
        title={t('appointments.rescheduleKeepCurrent')}
        variant="outline"
        fullWidth
        disabled={reschedule.isLoading}
        onPress={onClose}
      />
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
