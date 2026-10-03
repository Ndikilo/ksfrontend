import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  appointmentsService,
  dependentsService,
  searchService,
  type PublicSlotsPage,
} from '@/api';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import { Button, Card, Divider, Screen, Select, Spinner, Text } from '@/components/ui';
import { useAsync, useMutation } from '@/hooks';
import { useAuth } from '@/store';
import { useTheme } from '@/theme';
import type { Appointment, ID, PublicSlot } from '@/types';
import { formatDate } from '@/utils';

/**
 * The booking flow (P4.T1): availability picker → confirm (offering, who the
 * appointment is for, policy notice) → success. One route, three steps —
 * selection state stays in memory, so back never loses the user's place.
 * Booking errors arrive localised from the backend (stable codes); a taken
 * slot keeps the user on confirm with the reason and a way back to the times.
 */

type Step = 'when' | 'confirm' | 'success';

/** A day's worth of open slots, keyed by its local calendar date. */
type SlotDay = { key: string; label: string; slots: PublicSlot[] };

const DAY_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** Minimum touch target (design standard §1) for the day/time chips. */
const CHIP_MIN_HEIGHT = 48;

/** Group open slots by calendar day (local time), soonest first — pure. */
export const groupSlotsByDay = (slots: PublicSlot[]): SlotDay[] => {
  const byDay = new Map<string, SlotDay>();
  for (const slot of slots) {
    const date = new Date(slot.startsAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
    const day = byDay.get(key) ?? {
      key,
      label: formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' }),
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

  const practitioner = practitionerState.data;
  const days = slotsState.data ? groupSlotsByDay(slotsState.data.data) : [];
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
  if (!session) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={48} color={theme.colors.textMuted} />}
          title={t('booking.signInRequired')}
          actionLabel={t('booking.signInAction')}
          onAction={() => router.push('/(auth)/login')}
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
    const when = formatDate(slot.startsAt, { dateStyle: 'full', timeStyle: 'short' });

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
              label: t(
                `search.${candidate.consultationType === 'in_person' ? 'inPerson' : candidate.consultationType}`,
              ),
              value: candidate.id,
              description: `${t('practitioner.minutes', { count: candidate.durationMin })} • ${candidate.priceXaf.toLocaleString()} XAF`,
            }))}
          />
        ) : null}

        <Select
          label={t('booking.whoLabel')}
          value={dependentId}
          onChange={(value) => setDependentId(value)}
          options={[
            { label: t('booking.forMyself'), value: null as ID | null },
            ...(dependentsState.data?.data ?? []).map((dependent) => ({
              label: `${dependent.givenNames} ${dependent.surname}`,
              value: dependent.id as ID | null,
            })),
          ]}
        />

        <Banner tone="info" message={t('booking.policyNotice')} />

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
          onPress={() => {
            booking.reset();
            setStep('when');
          }}
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
          actionLabel={t('common.retry')}
          onAction={() => void slotsState.refetch()}
        />
      ) : (
        <>
          <Text variant="subheading">{t('booking.pickDay')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
              {days.map((day) => {
                const selected = day.key === activeDay?.key;
                return (
                  <Pressable
                    key={day.key}
                    testID={`booking-day-${day.key}`}
                    onPress={() => setDayKey(day.key)}
                    style={{
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
                      borderRadius: theme.radius.control,
                      minHeight: CHIP_MIN_HEIGHT,
                      justifyContent: 'center',
                      paddingHorizontal: theme.spacing.lg,
                    }}
                  >
                    <Text variant="label" color={selected ? 'onPrimary' : 'text'} numberOfLines={1}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text variant="subheading">{t('booking.pickTime')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {(activeDay?.slots ?? []).map((candidate) => {
              const selected = slot?.key === candidate.key;
              return (
                <Pressable
                  key={candidate.key}
                  testID={`booking-slot-${candidate.key}`}
                  onPress={() => {
                    setSlot(candidate);
                    setOfferingId(null);
                  }}
                  style={{
                    backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderRadius: theme.radius.control,
                    minHeight: CHIP_MIN_HEIGHT,
                    justifyContent: 'center',
                    paddingHorizontal: theme.spacing.lg,
                  }}
                >
                  <Text variant="label" color={selected ? 'onPrimary' : 'text'}>
                    {formatDate(candidate.startsAt, { timeStyle: 'short' })}
                  </Text>
                </Pressable>
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
  const when = formatDate(appointment.startsAt, { dateStyle: 'full', timeStyle: 'short' });

  return (
    <Screen contentStyle={{ gap: theme.spacing.lg }}>
      <View style={[styles.centered, { gap: theme.spacing.md, paddingVertical: theme.spacing.xl }]}>
        <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
        <Text variant="title" align="center">
          {t('booking.successTitle')}
        </Text>
        <Text variant="body" color="textMuted" align="center">
          {t('booking.successWhen', { when: `${name} — ${when}` })}
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
  centered: { alignItems: 'center' },
});
