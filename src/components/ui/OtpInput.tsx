import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './Text';

export type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
  /** Fired when the last digit is entered (e.g. to auto-submit). */
  onComplete?: (code: string) => void;
};

/**
 * Fixed-length numeric one-time-code entry rendered as underline cells.
 *
 * A single hidden TextInput captures the code (so paste, backspace and the OS
 * autofill "from Messages" all work); the cells are just a display. Reusable
 * for any OTP/PIN screen.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  onComplete,
}: OtpInputProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i];
        const active = focused && i === Math.min(value.length, length - 1);
        return (
          <View key={i} style={styles.cell}>
            <Text variant="title">{char ?? ''}</Text>
            <View
              style={[
                styles.underline,
                { backgroundColor: active || char ? theme.colors.primary : theme.colors.borderStrong },
              ]}
            />
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        style={styles.hiddenInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cell: { flex: 1, alignItems: 'center', gap: 8 },
  underline: { height: 3, width: 24, borderRadius: 2 },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
