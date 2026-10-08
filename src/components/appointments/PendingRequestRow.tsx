import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AppointmentRow } from './AppointmentRow';
import { Button } from '@/components/ui';
import type { Appointment } from '@/types';

/**
 * A pending booking request on the practitioner agenda (P7.T3) — the shared
 * AppointmentRow (patient name leads the row and its a11y label) with the two
 * decisions the request waits on: Confirm (primary) and Decline (destructive;
 * the screen confirms the tap before firing — standard §2). Buttons are the
 * default md size: the 48dp minimum touch target rules here.
 *
 * While one request mutates, `actionsDisabled` pauses every sibling decision
 * so two lifecycle writes can never interleave; the in-flight button shows
 * its own spinner via `confirming`/`declining`.
 */
export const PendingRequestRow = memo(function PendingRequestRow({
  appointment,
  contextName,
  confirming,
  declining,
  actionsDisabled,
  onConfirm,
  onDecline,
}: {
  appointment: Appointment;
  /** The patient's display name (practitioner-scope list rows). */
  contextName?: string;
  /** This row's confirm is in flight — spinner on the Confirm button. */
  confirming: boolean;
  /** This row's decline is in flight — spinner on the Decline button. */
  declining: boolean;
  /** Any mutation is in flight — sibling decisions are disabled. */
  actionsDisabled: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();

  const actions = (
    <View style={styles.actions}>
      <Button
        title={t('practice.confirmRequest')}
        variant="primary"
        loading={confirming}
        disabled={actionsDisabled}
        onPress={onConfirm}
        style={styles.action}
      />
      <Button
        title={t('practice.declineRequest')}
        variant="danger"
        loading={declining}
        disabled={actionsDisabled}
        onPress={onDecline}
        style={styles.action}
      />
    </View>
  );

  return <AppointmentRow appointment={appointment} contextName={contextName} actions={actions} />;
});

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
