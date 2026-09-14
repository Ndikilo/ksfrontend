import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { FieldLabel } from './FieldLabel';
import { Link } from './Link';
import { Text } from './Text';

export type DateFieldProps = {
  value: Date | null;
  onChange: (date: Date) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  error?: string | null;
  minimumDate?: Date;
  maximumDate?: Date;
  containerStyle?: ViewStyle;
};

const pad = (n: number) => String(n).padStart(2, '0');
const formatDDMMYYYY = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

/**
 * Date picker field showing `dd/mm/yyyy`. Opens the native picker — an inline
 * dialog on Android, a bottom-sheet spinner on iOS. Reusable for any date input.
 */
export function DateField({
  value,
  onChange,
  label,
  required,
  placeholder = 'dd/mm/yyyy',
  error,
  minimumDate,
  maximumDate,
  containerStyle,
}: DateFieldProps) {
  const theme = useTheme();
  const [show, setShow] = useState(false);
  const fallback = value ?? new Date(2000, 0, 1);

  const borderColor = error ? theme.colors.danger : theme.colors.border;

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (event.type === 'set' && date) onChange(date);
  };

  const picker = (
    <DateTimePicker
      value={fallback}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      onChange={handleChange}
    />
  );

  return (
    <View style={containerStyle}>
      {label ? <FieldLabel label={label} required={required} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Select date'}
        onPress={() => setShow(true)}
        style={[
          styles.trigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.control,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <Text variant="body" color={value ? 'text' : 'textMuted'}>
          {value ? formatDDMMYYYY(value) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
      </Pressable>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {show && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
            onPress={() => setShow(false)}
          >
            <Pressable
              onPress={() => {}}
              style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.sheetHeader}>
                <Link label="Done" onPress={() => setShow(false)} underline={false} />
              </View>
              {picker}
            </Pressable>
          </Pressable>
        </Modal>
      ) : show ? (
        picker
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  error: { marginTop: 6 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingBottom: 24 },
  sheetHeader: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 12 },
});
