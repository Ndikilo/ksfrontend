import { useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
 * autofill "from Messages" all work); the cells are just a display — hidden
 * from assistive tech, which focuses the labelled input instead. Digit
 * progress is announced politely on every change (VoiceOver has no live
 * region; Android additionally uses the polite live region). Reusable for any
 * OTP/PIN screen.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  onComplete,
}: OtpInputProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length > 0) {
      AccessibilityInfo.announceForAccessibility(
        t('otp.digitsEntered', { count: next.length, total: length }),
      );
    }
    if (next.length === length) onComplete?.(next);
  };

  return (
    // Not itself focusable — screen readers land on the labelled input below,
    // not on an unlabeled "button" wrapper.
    <Pressable accessible={false} style={styles.row} onPress={() => inputRef.current?.focus()}>
      <View
        style={styles.cells}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
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
      </View>

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
        accessibilityLabel={t('otp.enterCode')}
        accessibilityHint={t('otp.a11yHint')}
        accessibilityLiveRegion="polite"
        style={styles.hiddenInput}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cells: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: { flex: 1, alignItems: 'center', gap: 8 },
  underline: { height: 3, width: 24, borderRadius: 2 },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 },
});
