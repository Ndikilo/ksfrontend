import { router } from 'expo-router';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Text } from '@/components/ui';
import { CONSULTATION_TYPE_KEYS } from '@/constants';
import { useTheme } from '@/theme';
import type { Appointment } from '@/types';
import { formatClinicDate, statusPresentation } from '@/utils';

/**
 * A booking row shared by the patient appointments tab and the practitioner
 * agenda (P7.T1) — memoized for FlatList reuse. Opens the appointment detail
 * route, which the backend authorizes for both parties.
 *
 * Persona surfaces name WHO each row belongs to (design standard §2): pass
 * `contextName` — the patient name on the practitioner agenda, the
 * practitioner name on the patient tab — and it renders as the row's primary
 * line and leads the accessibility label.
 */
export const AppointmentRow = memo(function AppointmentRow({
  appointment,
  contextName,
  actions,
}: {
  appointment: Appointment;
  /** The counterparty's display name (list rows only — backend P7.T1). */
  contextName?: string;
  /**
   * Optional row-level controls rendered inside the card under the booking
   * info (P7.T3: the pending-request Confirm/Decline decisions). Plain list
   * rows pass nothing and render exactly as before.
   */
  actions?: ReactNode;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const status = statusPresentation(appointment.status);
  const type = t(`search.${CONSULTATION_TYPE_KEYS[appointment.consultationType]}`);
  // Row density: `medium` reads better than `full` at this size, especially
  // with French expansion (Review 006 minor).
  const when = formatClinicDate(appointment.startsAt, { dateStyle: 'medium', timeStyle: 'short' });
  // Money formatting follows the UI language, like every other surface
  // (checkout pins `toLocaleString(i18n.language)` — Review 012 minor 3).
  const price = `${appointment.priceXaf.toLocaleString(i18n.language)} XAF`;

  return (
    <Pressable
      testID={`appointment-row-${appointment.id}`}
      accessibilityRole="button"
      // WHO + type + when + price + state — the persona name leads (Review 012).
      accessibilityLabel={`${contextName ? `${contextName}, ` : ''}${type}, ${when}, ${price}, ${t(`appointments.${status.key}`)}`}
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
      <View style={styles.contentRow}>
        <View style={styles.rowMain}>
          {contextName ? (
            <>
              <Text variant="bodyStrong">{contextName}</Text>
              <Text variant="body" color="textMuted">
                {type}
              </Text>
            </>
          ) : (
            <Text variant="bodyStrong">{type}</Text>
          )}
          <Text variant="body" color="textMuted">
            {when}
          </Text>
          <Text variant="caption" color="textMuted">
            {price}
          </Text>
        </View>
        <Badge label={t(`appointments.${status.key}`)} tone={status.tone} />
      </View>
      {actions ? actions : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  rowMain: { flex: 1, gap: 2 },
});
