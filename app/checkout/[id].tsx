import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { appointmentsService, isApiError, paymentsService } from '@/api';
import { Banner, ErrorState } from '@/components/feedback';
import { Button, Card, Input, Screen, Select, Spinner, Text } from '@/components/ui';
import { useAsync, useMutation } from '@/hooks';
import { useTheme } from '@/theme';
import type { Payment, PaymentProvider } from '@/types';
import { formatClinicDate } from '@/utils';
import { isPhone } from '@/utils/validators';

/**
 * Checkout (P5.T5): pay for a pending appointment. Method sheet (MoMo / Orange
 * Money) + wallet number → charge initiation → pending state with status
 * polling (the backend reconciles with the provider on read) → success with
 * the receipt, or a failure state whose Try again re-enters the method step
 * (a `failed` charge allows a fresh attempt server-side).
 */

const POLL_INTERVAL_MS = 3_000;
/** Auto-polls before we stop and hand control back to the user. */
const MAX_AUTO_POLLS = 10;

type Phase = 'select' | 'polling' | 'success' | 'failed';

export default function CheckoutScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const detail = useAsync(() => appointmentsService.get(id), [id]);
  const appointment = detail.data;

  // Resume support: a charge may already exist (app killed mid-payment). A 404
  // is the backend's "no charge yet" — mapped to null, never shown as an error.
  const existingCharge = useAsync(async () => {
    try {
      return await paymentsService.byAppointment(id);
    } catch (err) {
      if (isApiError(err) && err.status === 404) return null;
      throw err;
    }
  }, [id]);

  const [phase, setPhase] = useState<Phase>('select');
  const [charge, setCharge] = useState<Payment | null>(null);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pollKick, setPollKick] = useState(0);

  const initiate = useMutation(paymentsService.initiate, {
    onSuccess: (created) => {
      setCharge(created);
      if (created.status === 'succeeded') setPhase('success');
      else if (created.status === 'failed') setPhase('failed');
      else setPhase('polling');
    },
  });

  // Decide the starting phase ONCE both reads settle (fresh checkout vs
  // resumed pending charge vs already-paid appointment).
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (bootstrapped || detail.isLoading || existingCharge.isLoading) return;
    setBootstrapped(true);
    const existing = existingCharge.data;
    if (existing?.status === 'succeeded' || detail.data?.status === 'confirmed') {
      if (existing !== null) setCharge(existing);
      setPhase('success');
    } else if (
      existing !== null &&
      (existing.status === 'pending' || existing.status === 'initiated')
    ) {
      setCharge(existing);
      setPhase('polling');
    }
    // Anything else (fresh checkout, failed/refunded charge, or an appointment
    // that can no longer be paid at all) lands on the method step — which
    // renders a not-payable notice instead of a form for those appointments.
  }, [bootstrapped, detail.isLoading, detail.data, existingCharge.isLoading, existingCharge.data]);

  // Status polling: the backend polls the provider ON READ, so driving this
  // endpoint alone moves the charge to a decision. Provider/network trouble
  // never fails the flow — the tick just tries again (up to the auto-poll cap,
  // then the explicit "check again" button takes over).
  useEffect(() => {
    if (phase !== 'polling' || charge === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      try {
        const latest = await paymentsService.get(charge.id);
        if (cancelled) return;
        if (latest.status === 'succeeded') {
          setCharge(latest);
          setPhase('success');
          return;
        }
        if (latest.status === 'failed' || latest.status === 'refunded') {
          setCharge(latest);
          setPhase('failed');
          return;
        }
      } catch {
        // Transient (offline/timeout): keep waiting — the webhook is the
        // authoritative push path; this is only the pull path.
      }
      tries += 1;
      if (!cancelled && tries < MAX_AUTO_POLLS) {
        timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
      }
    };
    // First check immediately (the charge may have decided while the app was
    // backgrounded), then keep a 3 s cadence up to the auto-poll cap.
    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
    };
  }, [phase, charge, pollKick]);

  const onPressPay = useCallback(() => {
    if (appointment === null || provider === null) return;
    if (!isPhone(phone)) {
      setPhoneError(t('payments.phoneInvalid'));
      return;
    }
    setPhoneError(null);
    void initiate.mutate({ appointmentId: appointment.id, provider, payerPhone: phone });
  }, [appointment, provider, phone, initiate, t]);

  if (detail.isLoading || existingCharge.isLoading) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  if (detail.error || appointment === null) {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <ErrorState error={detail.error ?? t('practitioner.notFound')} onRetry={detail.refetch} />
      </Screen>
    );
  }

  const amount = `${appointment.priceXaf.toLocaleString()} XAF`;

  if (phase === 'success') {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
          <Text variant="title" style={styles.centerText}>
            {t('payments.successTitle')}
          </Text>
          <Text variant="body" color="textMuted" style={styles.centerText}>
            {t('payments.successMessage')}
          </Text>
        </View>
        <Card>
          <Text variant="caption" color="textMuted">
            {t('payments.amountLabel')}
          </Text>
          <Text variant="bodyStrong">{amount}</Text>
          {charge?.receiptNumber !== null && charge?.receiptNumber !== undefined ? (
            <>
              <View style={styles.spacer} />
              <Text variant="caption" color="textMuted">
                {t('payments.receiptLabel')}
              </Text>
              <Text variant="bodyStrong">{charge.receiptNumber}</Text>
            </>
          ) : null}
        </Card>
        <Button
          title={t('payments.viewAppointment')}
          fullWidth
          onPress={() => router.replace(`/appointments/${appointment.id}`)}
        />
      </Screen>
    );
  }

  if (phase === 'polling') {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <View style={styles.centered}>
          <Spinner />
          <Text variant="title" style={styles.centerText}>
            {t('payments.processingTitle')}
          </Text>
          <Text variant="body" color="textMuted" style={styles.centerText}>
            {t('payments.processingMessage', { phone })}
          </Text>
        </View>
        <Card>
          <Text variant="caption" color="textMuted">
            {t('payments.amountLabel')}
          </Text>
          <Text variant="bodyStrong">{amount}</Text>
        </Card>
        <Button
          title={t('payments.processingAction')}
          variant="outline"
          fullWidth
          onPress={() => setPollKick((k) => k + 1)}
        />
      </Screen>
    );
  }

  // Failure: either the charge was refused (provider said no) or the auto-poll
  // window closed. Try again re-enters the method step — the backend allows a
  // fresh charge after `failed`.
  if (phase === 'failed') {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.danger} />
          <Text variant="title" style={styles.centerText}>
            {t('payments.failureTitle')}
          </Text>
          <Text variant="body" color="textMuted" style={styles.centerText}>
            {t('payments.failureMessage')}
          </Text>
        </View>
        {initiate.error ? <Banner tone="error" message={initiate.error.message} /> : null}
        <Button
          title={t('payments.retryAction')}
          fullWidth
          onPress={() => {
            initiate.reset();
            setPhase('select');
          }}
        />
        <Button
          title={t('payments.viewAppointment')}
          variant="outline"
          fullWidth
          onPress={() => router.replace(`/appointments/${appointment.id}`)}
        />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: theme.spacing.md }}>
      <BackButton />
      <Text variant="title">{t('payments.title')}</Text>

      {/* Only a PENDING appointment can be paid (the backend 409s anything
          else) — say so instead of rendering a form that cannot succeed. */}
      {appointment.status !== 'pending' ? (
        <Banner tone="info" message={t('payments.notPayable')} />
      ) : (
        <>
          <Card>
            <Text variant="caption" color="textMuted">
              {t('payments.amountLabel')}
            </Text>
            <Text variant="bodyStrong">{amount}</Text>
            <Text variant="caption" color="textMuted">
              {formatClinicDate(appointment.startsAt, { dateStyle: 'full', timeStyle: 'short' })}
            </Text>
          </Card>

          {initiate.error ? <Banner tone="error" message={initiate.error.message} /> : null}

          <Select<PaymentProvider>
            label={t('payments.methodLabel')}
            placeholder={t('payments.methodPlaceholder')}
            options={[
              { label: t('payments.momo'), value: 'momo' },
              { label: t('payments.orange'), value: 'orange_money' },
            ]}
            value={provider}
            onChange={(value) => setProvider(value)}
          />

          <Input
            label={t('payments.phoneLabel')}
            hint={t('payments.phoneHint')}
            accessibilityLabel={t('payments.phoneLabel')}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
            error={phoneError}
          />

          <Button
            title={t('payments.payNow', { amount: appointment.priceXaf.toLocaleString() })}
            fullWidth
            disabled={provider === null || initiate.isLoading}
            loading={initiate.isLoading}
            onPress={onPressPay}
          />
        </>
      )}
    </Screen>
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  centerText: { textAlign: 'center' },
  back: { padding: 4, alignSelf: 'flex-start' },
  spacer: { height: 12 },
});
