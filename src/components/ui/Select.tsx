import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { Divider } from './Divider';
import { FieldLabel } from './FieldLabel';
import { Text } from './Text';

export type SelectOption<T> = {
  label: string;
  value: T;
  /** Optional secondary line under the label. */
  description?: string;
};

export type SelectProps<T> = {
  options: SelectOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
  /** Heading shown at the top of the picker sheet (defaults to `label`). */
  title?: string;
  error?: string | null;
  disabled?: boolean;
  containerStyle?: ViewStyle;
};

/**
 * Generic, theme-aware dropdown/select.
 *
 * Reusable for ANY option type — pass `options` as `{ label, value }[]` and get
 * back the chosen `value` (typed) via `onChange`. Tapping opens a bottom-sheet
 * picker with the current selection checked.
 *
 *   <Select
 *     label="Language"
 *     value={code}
 *     onChange={setCode}
 *     options={LANGUAGES.map((l) => ({ label: l.label, value: l.code }))}
 *   />
 *
 * Note: selection matching uses `Object.is`, so prefer primitive values (or
 * stable object references) for `value`.
 */
export function Select<T>({
  options,
  value,
  onChange,
  label,
  required,
  placeholder = 'Select…',
  title,
  error,
  disabled = false,
  containerStyle,
}: SelectProps<T>) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const selected = options.find((option) => Object.is(option.value, value));
  const borderColor = error ? theme.colors.danger : theme.colors.border;

  const select = (next: T) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <FieldLabel label={label} required={required} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.control,
            paddingHorizontal: theme.spacing.lg,
          },
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Text variant="body" color={selected ? 'text' : 'textMuted'} numberOfLines={1} style={styles.value}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
      </Pressable>

      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]} onPress={() => setOpen(false)}>
          {/* Stop propagation so taps inside the sheet don't dismiss it. */}
          <Pressable
            onPress={() => {}}
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderTopLeftRadius: theme.radius.xl,
                borderTopRightRadius: theme.radius.xl,
                paddingBottom: insets.bottom + theme.spacing.md,
              },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: theme.colors.borderStrong }]} />
            {title || label ? (
              <Text variant="subheading" style={styles.sheetTitle}>
                {title ?? label}
              </Text>
            ) : null}

            <FlatList
              data={options}
              keyExtractor={(_, index) => String(index)}
              ItemSeparatorComponent={() => <Divider />}
              renderItem={({ item }) => {
                const isSelected = Object.is(item.value, value);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => select(item.value)}
                    style={({ pressed }) => [
                      styles.option,
                      { paddingVertical: theme.spacing.lg },
                      pressed && { backgroundColor: theme.colors.surfaceAlt },
                    ]}
                  >
                    <View style={styles.optionText}>
                      <Text variant="body" color={isSelected ? 'primary' : 'text'}>
                        {item.label}
                      </Text>
                      {item.description ? (
                        <Text variant="caption" color="textMuted">
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  error: { marginTop: 6 },
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  value: { flex: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 20, paddingTop: 8, maxHeight: '70%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  sheetTitle: { marginBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  optionText: { flex: 1, gap: 2 },
});
