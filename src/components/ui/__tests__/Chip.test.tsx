import { fireEvent, render } from '@testing-library/react-native';
import { PixelRatio, StyleSheet, Text as RNText } from 'react-native';

import { ThemeProvider } from '@/theme';

import { Chip } from '../Chip';

/**
 * Chip conventions under test (Review 013 MAJOR-3, standard §7): the label is
 * NEVER rewritten or cut in the tree — truncation is a native layout concern —
 * so the assertions pin (a) the FULL label being present and (b) the line
 * clamp the native ellipsizer will honor. RTL renders text unscaled, so the
 * OS large-text regime is expressed by mocking the font scale the OS reports;
 * the structural clamp is what decides "ellipsized at 1 line" vs "wrapped on
 * 2 lines" under that regime.
 */

// "Demandes" is the longest of the agenda's four French segment labels — the
// one that ellipsized at Android font scale ~1.5-2.0 on a 360dp screen.
const FRENCH_LABEL = 'Demandes';

const renderChip = (props: { numberOfLines?: number } = {}) =>
  render(
    <ThemeProvider>
      <Chip label={FRENCH_LABEL} testID="chip" onPress={() => {}} {...props} />
    </ThemeProvider>,
  );

describe('Chip (ui kit)', () => {
  it('renders the full label and keeps it pressable', () => {
    const screen = renderChip();
    expect(screen.getByText(FRENCH_LABEL)).toBeTruthy();
    fireEvent.press(screen.getByTestId('chip'));
  });

  it('defaults to a single-line clamp (secondary chips)', () => {
    const screen = renderChip();
    const label = screen.UNSAFE_getByType(RNText);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.children).toBe(FRENCH_LABEL);
  });

  it('a primary nav chip at font scale 2 keeps the FULL label with a 2-line clamp', () => {
    // Force the OS large-text regime (Android "largest" ≈ 2.0).
    const fontScale = jest.spyOn(PixelRatio, 'getFontScale').mockReturnValue(2);
    const screen = renderChip({ numberOfLines: 2 });

    // The whole label is present — nothing pre-truncated at the copy level…
    const label = screen.UNSAFE_getByType(RNText);
    expect(label.props.children).toBe(FRENCH_LABEL);
    // …and the clamp is 2 lines, so the native ellipsizer wraps instead of
    // cutting "Demandes" at font scale × French.
    expect(label.props.numberOfLines).toBe(2);
    fontScale.mockRestore();
  });

  it('the pill is a minHeight touch target — a second line grows it, never clips', () => {
    const screen = renderChip({ numberOfLines: 2 });
    const style = StyleSheet.flatten(screen.getByTestId('chip').props.style);
    // 48dp minimum touch target as a MINIMUM only: with no fixed height the
    // container auto-heightens around the two text lines (style reasoning
    // pinned here so a future fixed-height regression fails this test).
    expect(style.minHeight).toBe(48);
    expect(style.height).toBeUndefined();
    expect(style.overflow).not.toBe('hidden');
  });
});
