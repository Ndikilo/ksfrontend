import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import {
  appointmentsService,
  dependentsService,
  searchService,
  type PublicSlotsPage,
} from '@/api';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import { Button, Card, Chip, Divider, Screen, Select, Spinner, Text } from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useAsync, useMutation } from '@/hooks';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, ID, PublicSlot } from '@/types';
import { clinicDateKey, formatClinicDate } from '@/utils';

/**
 * The booking flow (P4.T1): availability picker → confirm (offering, who the
 * appointment is for, the practitioner's real cancellation policy) → success.
 * One route, three steps — selection state stays in memory, so in-flow back
 * navigation never loses the user's place (Android hardware back mid-confirm
 * returns to the picker). Booking errors arrive localised from the backend
 * (stable codes); a taken slot sends the user back to REFRESHED times with the
 * dead slot cleared. All times are rendered in the clinic's timezone
 * (Africa/Douala — design standard §5), never the device's.
 */

type Step = 'when' | 'confirm' | 'success';

/** A day's worth of open slots, keyed by its clinic-local calendar date. */
type SlotDay = { key: string; label: string; slots: PublicSlot[] };

const DAY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** Group open slots by clinic-local calendar day, soonest first — pure. */
export const groupSlotsByDay = (slots: PublicSlot[]): SlotDay[] => {
  const byDay = new Map<string, SlotDay>();
  for (const slot of slots) {
    const key = clinicDateKey(slot.startsAt);
    const day = byDay.get(key) ?? {
      key,
      label: formatClinicDate(slot.startsAt, { weekday: 'short', day: 'numeric', month: 'short' }),
      slots: [],
    };
    day.slots.push(slot);
    byDay.set(key, day);
  }
  return [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const practitionerName = (detail: {
  prefix: string | null;
  givenNames: string;
  surname: string;
} | null): string =>
  detail === null ? '' : [detail.prefix, detail.givenNames, detail.surname].filter(Boolean).join(' ');

export default function BookingScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();

  const [step, setStep] = useState<Step>('when');
  const [slot, setSlot] = useState<PublicSlot | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [offeringId, setOfferingId] = useState<ID | null>(null);
  const [dependentId, setDependentId] = useState<ID | null>(null);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const practitionerState = useAsync(() => searchService.practitioner(id), [id]);
  const slotsState = useAsync<PublicSlotsPage | null>(
    () =>
      session
        ? appointmentsService.openSlots(
            id,
            new Date().toISOString(),
            new Date(Date.now() + DAY_WINDOW_MS).toISOString(),
          )
        : Promise.resolve(null),
    [id, session],
  );
  const dependentsState = useAsync(
    () => (session ? dependentsService.list({ limit: 100 }) : Promise.resolve(null)),
    [session],
  );

  const booking = useMutation(appointmentsService.book, {
    onSuccess: (appointment) => {
      setBooked(appointment);
      setStep('success');
    },
  });

  // Recovery from a failed booking (SLOT_TAKEN): the selected slot is dead, so
  // clear it and refetch availability — returning to a picker that still shows
  // the dead slot selected would guarantee a second 409 (Review 005 A4).
  const { error: bookingError, reset: resetBooking } = booking;
  const refetchSlots = slotsState.refetch;
  const backToTimes = useCallback(() => {
    if (bookingError) {
      setSlot(null);
      void refetchSlots();
    }
    resetBooking();
    setStep('when');
  }, [bookingError, resetBooking, refetchSlots]);

  // Android hardware back mid-confirm mirrors "Back to times" (including the
  // SLOT_TAKEN recovery) instead of abandoning the flow.
  useEffect(() => {
    if (step !== 'confirm') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      backToTimes();
      return true;
    });
    return () => subscription.remove();
  }, [step, backToTimes]);

  const practitioner = practitionerState.data;
  // Day grouping walks every slot — memoise it (Review 005 E1).
  const days = useMemo(
    () => (slotsState.data ? groupSlotsByDay(slotsState.data.data) : []),
    [slotsState.data],
  );
  const activeDay = days.find((day) => day.key === dayKey) ?? days[0] ?? null;

  if (step === 'success' && booked) {
    return (
      <SuccessStep
        appointment={booked}
        practitionerName={practitionerName(practitioner)}
        onDone={() => router.replace('/(tabs)')}
      />
    );
  }

  // Signed-out users get a clear way forward instead of a guaranteed 401.
  // The redirect param returns them to THIS flow after signing in (A2).
  if (!session) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={theme.colors.textMuted} />}
          title={t('booking.signInRequired')}
          actionLabel={t('booking.signInAction')}
          onAction={() =>
            router.push({ pathname: '/(auth)/login', params: { redirect: `/booking/${id}` } })
          }
        />
      </Screen>
    );
  }

  if (practitionerState.isLoading || slotsState.isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (practitionerState.error || !practitioner) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <ErrorState
          error={practitionerState.error ?? t('practitioner.notFound')}
          onRetry={practitionerState.refetch}
        />
      </Screen>
    );
  }

  if (slotsState.error) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <ErrorState error={slotsState.error} onRetry={slotsState.refetch} />
      </Screen>
    );
  }

  const name = practitionerName(practitioner);

  if (step === 'confirm' && slot) {
    const offerings = practitioner.offerings.filter(
      (offering) => offering.active && slot.consultationTypes.includes(offering.consultationType),
    );
    const offering = offerings.find((candidate) => candidate.id === offeringId) ?? offerings[0];
    const when = formatClinicDate(slot.startsAt, { dateStyle: 'full', timeStyle: 'short' });
    // The practitioner's REAL policy, from their public profile (A5) — no
    // "shown once you book" hedge; the terms are known before committing.
    const policyNotice =
      practitioner.cancellationFeeXaf > 0
        ? t('booking.confirmPolicyFee', {
            hours: practitioner.cancellationNoticeHours,
            fee: practitioner.cancellationFeeXaf.toLocaleString(),
          })
        : t('booking.confirmPolicyFree', { hours: practitioner.cancellationNoticeHours });

    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <Text variant="title">{t('booking.confirmTitle')}</Text>

        {booking.error ? <Banner tone="error" message={booking.error.message} /> : null}

        <Card>
          <Text variant="caption" color="textMuted">
            {t('booking.withLabel')}
          </Text>
          <Text variant="bodyStrong">{name}</Text>
          <Divider spacing={theme.spacing.sm} />
          <Text variant="caption" color="textMuted">
            {t('booking.whenLabel')}
          </Text>
          <Text variant="bodyStrong">{when}</Text>
        </Card>

        {offerings.length > 0 ? (
          <Select
            label={t('booking.offeringLabel')}
            value={offering?.id ?? null}
            onChange={(value) => setOfferingId(value)}
            options={offerings.map((candidate) => ({
              // Typed type→key map — a new ConsultationType without a key is a
              // compile error, so raw keys can never reach the UI (A1).
              label: t(`search.${CONSULTATION_TYPE_KEYS[candidate.consultationType]}`),
              value: candidate.id,
              description: `${t('practitioner.minutes', { count: candidate.durationMin })} • ${candidate.priceXaf.toLocaleString()} XAF`,
            }))}
          />
        ) : null}

        <Select
          label={t('booking.whoLabel')}
          value={dependentId}
          onChange={(value) => setDependentId(value)}
          disabled={dependentsState.isLoading}
          options={[
            { label: t('booking.forMyself'), value: null as ID | null },
            ...(dependentsState.data?.data ?? []).map((dependent) => ({
              label: `${dependent.givenNames} ${dependent.surname}`,
              value: dependent.id as ID | null,
            })),
          ]}
        />
        {dependentsState.isLoading ? (
          <Text variant="caption" color="textMuted">{t('common.loading')}</Text>
        ) : null}

        <Banner tone="info" message={policyNotice} />

        {offerings.length === 0 ? (
          <Text variant="caption" color="textMuted">
            {t('booking.noOfferingMatch')}
          </Text>
        ) : null}

        <Button
          title={t('booking.confirm')}
          fullWidth
          loading={booking.isLoading}
          disabled={offerings.length === 0}
          onPress={() => {
            if (!offering) return;
            void booking.mutate({
              slotId: slot.key,
              offeringId: offering.id,
              ...(dependentId !== null ? { dependentId } : {}),
            });
          }}
        />
        <Button
          title={t('booking.backToSlots')}
          variant="outline"
          fullWidth
          disabled={booking.isLoading}
          onPress={backToTimes}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <Text variant="title">{t('booking.title')}</Text>
      <Text variant="body" color="textMuted">
        {name}
      </Text>

      {days.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="calendar-outline" size={48} color={theme.colors.textMuted} />}
          title={t('booking.slotsEmptyTitle')}
          message={t('booking.slotsEmptyMessage', { name })}
          actionLabel={t('booking.slotsEmptyAction')}
          onAction={() => void slotsState.refetch()}
        />
      ) : (
        <>
          <Text variant="subheading">{t('booking.pickDay')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
              {days.map((day) => (
                <Chip
                  key={day.key}
                  testID={`booking-day-${day.key}`}
                  label={day.label}
                  selected={day.key === activeDay?.key}
                  onPress={() => setDayKey(day.key)}
                />
              ))}
            </View>
          </ScrollView>

          <Text variant="subheading">{t('booking.pickTime')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {(activeDay?.slots ?? []).map((candidate) => {
              const selected = slot?.key === candidate.key;
              const time = formatClinicDate(candidate.startsAt, { timeStyle: 'short' });
              // Screen readers get time + type + state, not a bare "10:00" (D1).
              const types = candidate.consultationTypes
                .map((type) => t(`search.${CONSULTATION_TYPE_KEYS[type]}`))
                .join(' / ');
              return (
                <Chip
                  key={candidate.key}
                  testID={`booking-slot-${candidate.key}`}
                  label={time}
                  selected={selected}
                  accessibilityLabel={t('booking.slotChipLabel', {
                    time,
                    types,
                    state: selected ? t('booking.chipSelected') : t('booking.chipNotSelected'),
                  })}
                  onPress={() => {
                    setSlot(candidate);
                    setOfferingId(null);
                  }}
                />
              );
            })}
          </View>

          <Button
            title={t('booking.next')}
            fullWidth
            disabled={slot === null}
            onPress={() => setStep('confirm')}
          />
        </>
      )}
    </Screen>
  );
}

export function SuccessStep({
  appointment,
  practitionerName: name,
  onDone,
}: {
  appointment: Appointment;
  practitionerName: string;
  onDone: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const when = formatClinicDate(appointment.startsAt, { dateStyle: 'full', timeStyle: 'short' });

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={[styles.centered, { gap: theme.spacing.md, paddingVertical: theme.spacing.xl }]}>
        <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
        <Text variant="title" align="center">
          {t('booking.successTitle')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {`${name} — ${when}`}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {appointment.priceXaf.toLocaleString()} XAF
        </Text>
      </View>

      <Card>
        <Text variant="caption" color="textMuted">
          {appointment.cancellationFeeXaf > 0
            ? t('booking.successPolicyFee', {
                hours: appointment.cancellationNoticeHours,
                fee: appointment.cancellationFeeXaf.toLocaleString(),
              })
            : t('booking.successPolicyFree', { hours: appointment.cancellationNoticeHours })}
        </Text>
      </Card>

      <Button title={t('booking.done')} fullWidth onPress={onDone} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
