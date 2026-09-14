import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { FieldLabel } from './FieldLabel';
import { Text } from './Text';

export type InputProps = TextInputProps & {
  label?: string;
  required?: boolean;
  /** Error message shown below the field; also drives the red border + icon. */
  error?: string | null;
  /** Marks the field valid (green border + check). Ignored when `error` is set. */
  success?: boolean;
  hint?: string;
  /** Custom trailing element, shown when there's no status icon or password eye. */
  rightAccessory?: ReactNode;
  containerStyle?: ViewStyle;
};

/**
 * Labelled text field with focus/error/success states, an automatic password
 * visibility toggle (when `secureTextEntry`), and inline status icons — all
 * driven by theme tokens. The single text-input primitive for the whole app.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    required,
    error,
    success,
    hint,
    rightAccessory,
    containerStyle,
    style,
    secureTextEntry,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  const borderColor = error
    ? theme.colors.danger
    : success
      ? theme.colors.success
      : focused
        ? theme.colors.primary
        : theme.colors.border;

  const renderAccessory = () => {
    if (error) {
      return <Ionicons name="alert-circle" size={22} color={theme.colors.danger} />;
    }
    if (success) {
      return <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />;
    }
    if (secureTextEntry) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          hitSlop={theme.layout.hitSlop}
          onPress={() => setHidden((h) => !h)}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={theme.colors.textMuted}
          />
        </Pressable>
      );
    }
    return rightAccessory ?? null;
  };

  const accessory = renderAccessory();

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <FieldLabel label={label} required={required} /> : null}

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surface,
            borderColor,
            borderRadius: theme.radius.control,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secureTextEntry ? hidden : false}
          style={[styles.input, { color: theme.colors.text }, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      </View>

      {error ? (
        <Text variant="caption" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: 0 },
  field: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  accessory: { marginLeft: 4 },
  helper: { marginTop: 6 },
});
