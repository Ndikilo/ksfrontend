import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  AppState,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';

import { appointmentsService, isApiError, paymentsService } from '@/api';
import { Banner, EmptyState, ErrorState } from '@/components/feedback';
import {
  BackButton,
  Button,
  Card,
  Input,
  Screen,
  Select,
  Spinner,
  Text,
} from '@/components/ui';
import { useAsync, useMutation } from '@/hooks';
import { spacing, useTheme } from '@/theme';
import type { Payment, PaymentProvider } from '@/types';
import { formatClinicDate } from '@/utils';
import { isPhone } from '@/utils/validators';

/**
 * Checkout (P5.T5): pay for a pending appointment. Method sheet (MoMo / Orange
 * Money) + wallet number → charge initiation → pending state with status
 * polling (the backend reconciles with the provider on read) → success with
 * the receipt, or a failure state whose Try again re-enters the method step
 * (a `failed` charge allows a fresh attempt server-side).
 *
 * Money-flow honesty bar (design standard §3): the receipt renders from the
 * PAYMENT record (amount, rail, paid-at, receipt number) with the appointment's
 * price snapshot only as a fallback; "due" vs "paid" labels match the charge
 * status; the spinner spins only while the loop is actually polling — at the
 * cap it stops and says so; a resumed charge never interpolates state the
 * record doesn't carry (the payer's phone is NOT in PaymentResponse); and the
 * outcome is announced to screen readers, not only shown.
 */

/** Status-poll cadence once the charge is live (the webhook is the push path). */
export const POLL_INTERVAL_MS = 3_000;
/** Auto-polls before we stop the loop and hand control back to the user. */
export const MAX_AUTO_POLLS = 10;

type Phase = 'select' | 'polling' | 'success' | 'failed';

export default function CheckoutScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
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
  /** True once the auto-poll budget is spent — the loop is STOPPED; say so. */
  const [exhausted, setExhausted] = useState(false);

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
    if (
      existing?.status === 'succeeded' ||
      detail.data?.status === 'confirmed'
    ) {
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
  }, [
    bootstrapped,
    detail.isLoading,
    detail.data,
    existingCharge.isLoading,
    existingCharge.data,
  ]);

  // Payment outcomes are ANNOUNCED, not only shown (the OfflineBanner pattern:
  // explicit announcement + polite live region on the status container below).
  const prevPhase = useRef<Phase>(phase);
  useEffect(() => {
    if (prevPhase.current === phase) return;
    if (phase === 'success') {
      AccessibilityInfo.announceForAccessibility(t('payments.successTitle'));
    }
    if (phase === 'failed') {
      AccessibilityInfo.announceForAccessibility(t('payments.failureTitle'));
    }
    prevPhase.current = phase;
  }, [phase, t]);

  // Status polling: the backend polls the provider ON READ, so driving this
  // endpoint alone moves the charge to a decision. Provider/network trouble
  // never fails the flow — the tick just tries again (up to the auto-poll cap,
  // then the explicit "check again" button takes over).
  useEffect(() => {
    if (phase !== 'polling' || charge === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;

    // ONE status read; applies a decided outcome, swallows transient trouble.
    const checkOnce = async () => {
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
    };

    const tick = async () => {
      if (cancelled) return;
      await checkOnce();
      if (cancelled) return;
      tries += 1;
      if (tries >= MAX_AUTO_POLLS) {
        // Cap reached: STOP the loop and stop the spinner — a forever-spinner
        // over a stopped loop reads as "my money vanished".
        setExhausted(true);
        return;
      }
      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    // Foreground recovery — backgrounding mid-poll is the NORMAL mobile-money
    // flow (the user leaves to approve the SIM push). Coming back to the app
    // immediately re-checks once and grants a fresh auto-poll budget.
    const subscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (cancelled || state !== 'active') return;
        tries = 0;
        setExhausted(false);
        void checkOnce();
      },
    );

    // First check immediately (the charge may have decided while the app was
    // backgrounded), then keep a 3 s cadence up to the auto-poll cap.
    void tick();
    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      subscription.remove();
    };
  }, [phase, charge, pollKick]);

  const onPressPay = useCallback(() => {
    if (appointment === null || provider === null) return;
    if (!isPhone(phone)) {
      setPhoneError(t('payments.phoneInvalid'));
      return;
    }
    setPhoneError(null);
    void initiate.mutate({
      appointmentId: appointment.id,
      provider,
      payerPhone: phone,
    });
  }, [appointment, provider, phone, initiate, t]);

  // "Check again" re-kicks the poll effect (fresh immediate check + a fresh
  // auto-poll budget) — it must keep working from the exhausted state too.
  const onPressCheckAgain = useCallback(() => {
    setExhausted(false);
    setPollKick((k) => k + 1);
  }, []);

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
        <ErrorState
          error={detail.error ?? t('practitioner.notFound')}
          onRetry={detail.refetch}
        />
      </Screen>
    );
  }

  // The charge amount is authoritative once a charge exists; the appointment's
  // price snapshot is only the pre-charge fallback. Integer XAF, no floats.
  const amountXaf = charge?.amountXaf ?? appointment.priceXaf;
  const formatXaf = (value: number) =>
    `${value.toLocaleString(i18n.language)} XAF`;

  if (phase === 'success') {
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <EmptyState
          icon={
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={theme.colors.success}
            />
          }
          title={t('payments.successTitle')}
          message={t('payments.successMessage')}
        />
        <Card>
          {/* Paid — label says PAID (the "due" label belongs to pending). */}
          <Text variant="caption" color="textMuted">
            {t('payments.amountPaid')}
          </Text>
          <Text variant="bodyStrong">{formatXaf(amountXaf)}</Text>
          {charge !== null ? (
            <>
              <ReceiptRow
                label={t('payments.paidWith')}
                value={
                  charge.provider === 'momo'
                    ? t('payments.momo')
                    : t('payments.orange')
                }
              />
              {charge.receiptNumber !== null ? (
                <ReceiptRow
                  label={t('payments.receiptLabel')}
                  value={charge.receiptNumber}
                />
              ) : null}
              {charge.receiptIssuedAt !== null ? (
                <ReceiptRow
                  label={t('payments.paidAt')}
                  value={formatClinicDate(charge.receiptIssuedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                />
              ) : null}
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
    // A resumed charge has NO payer phone in PaymentResponse — never
    // interpolate an empty {{phone}} ("sent to ."). Say it phone-free instead.
    let statusMessage: string;
    if (exhausted) statusMessage = t('payments.pollExhausted');
    else if (phone === '')
      statusMessage = t('payments.processingMessageNoPhone');
    else statusMessage = t('payments.processingMessage', { phone });

    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        {/* Polite live region: Android announces message changes here (the
            explicit announce above covers VoiceOver on the outcome itself). */}
        <View style={styles.centered} accessibilityLiveRegion="polite">
          {exhausted ? (
            <Ionicons
              name="hourglass-outline"
              size={64}
              color={theme.colors.textMuted}
            />
          ) : (
            <Spinner />
          )}
          <Text variant="title" style={styles.centerText}>
            {t('payments.processingTitle')}
          </Text>
          <Text variant="body" color="textMuted" style={styles.centerText}>
            {statusMessage}
          </Text>
        </View>
        <Card>
          <Text variant="caption" color="textMuted">
            {t('payments.amountLabel')}
          </Text>
          <Text variant="bodyStrong">{formatXaf(amountXaf)}</Text>
        </Card>
        <Button
          title={t('payments.processingAction')}
          variant="outline"
          fullWidth
          onPress={onPressCheckAgain}
        />
      </Screen>
    );
  }

  // Failure: either the charge was refused (provider said no), the auto-poll
  // window closed on a refusal, or an admin refunded the charge (its own
  // branch — "no money was taken" would be FALSE there; the money came back).
  // Try again re-enters the method step — the backend allows a fresh charge
  // after `failed`.
  if (phase === 'failed') {
    const refunded = charge?.status === 'refunded';
    return (
      <Screen contentStyle={{ gap: theme.spacing.md }}>
        <BackButton />
        <EmptyState
          icon={
            <Ionicons
              name="alert-circle"
              size={64}
              color={theme.colors.danger}
            />
          }
          title={t('payments.failureTitle')}
          message={
            refunded
              ? t('payments.refundedMessage')
              : t('payments.failureMessage')
          }
        />
        {charge?.failureReason ? (
          <Card>
            <Text variant="caption" color="textMuted">
              {t('payments.failureReasonLabel')}
            </Text>
            <Text variant="body">{charge.failureReason}</Text>
          </Card>
        ) : null}
        {initiate.error ? (
          <Banner tone="error" message={initiate.error.message} />
        ) : null}
        {refunded ? null : (
          <Button
            title={t('payments.retryAction')}
            fullWidth
            onPress={() => {
              initiate.reset();
              setPhase('select');
            }}
          />
        )}
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
          else) — say so and offer the way out instead of rendering a form
          that cannot succeed. */}
      {appointment.status !== 'pending' ? (
        <>
          <Banner tone="info" message={t('payments.notPayable')} />
          <Button
            title={t('payments.viewAppointment')}
            variant="outline"
            fullWidth
            onPress={() => router.replace(`/appointments/${appointment.id}`)}
          />
        </>
      ) : (
        <>
          <Card>
            <Text variant="caption" color="textMuted">
              {t('payments.amountLabel')}
            </Text>
            <Text variant="bodyStrong">{formatXaf(appointment.priceXaf)}</Text>
            <Text variant="caption" color="textMuted">
              {formatClinicDate(appointment.startsAt, {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </Text>
          </Card>

          {initiate.error ? (
            <Banner tone="error" message={initiate.error.message} />
          ) : null}

          <Select<PaymentProvider>
            label={t('payments.methodLabel')}
            placeholder={t('payments.methodPlaceholder')}
            options={[
              {
                label: t('payments.momo'),
                value: 'momo',
                description: t('payments.momoDescription'),
              },
              {
                label: t('payments.orange'),
                value: 'orange_money',
                description: t('payments.orangeDescription'),
              },
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
            title={t('payments.payNow', {
              amount: appointment.priceXaf.toLocaleString(i18n.language),
            })}
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

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
      <Text variant="bodyStrong">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  centerText: { textAlign: 'center' },
  row: { marginTop: spacing.sm },
});
