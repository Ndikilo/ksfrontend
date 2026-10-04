import { router } from 'expo-router';
import { memo } from 'react';
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
 */
export const AppointmentRow = memo(function AppointmentRow({
  appointment,
}: {
  appointment: Appointment;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const status = statusPresentation(appointment.status);
  const type = t(`search.${CONSULTATION_TYPE_KEYS[appointment.consultationType]}`);
  // Row density: `medium` reads better than `full` at this size, especially
  // with French expansion (Review 006 minor).
  const when = formatClinicDate(appointment.startsAt, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Pressable
      testID={`appointment-row-${appointment.id}`}
      accessibilityRole="button"
      // Type + when + price + state — not just the date (Review 006 minor).
      accessibilityLabel={`${type}, ${when}, ${appointment.priceXaf.toLocaleString()} XAF, ${t(`appointments.${status.key}`)}`}
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
        <Text variant="bodyStrong">{type}</Text>
        <Text variant="body" color="textMuted">
          {when}
        </Text>
        <Text variant="caption" color="textMuted">
          {appointment.priceXaf.toLocaleString()} XAF
        </Text>
      </View>
      <Badge label={t(`appointments.${status.key}`)} tone={status.tone} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
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
