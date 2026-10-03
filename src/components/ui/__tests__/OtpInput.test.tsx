import { AccessibilityInfo } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import '@/i18n'; // i18next instance for useTranslation (the app imports it at the root)
import { ThemeProvider } from '@/theme';

import { OtpInput } from '../OtpInput';

// The icon package drags in expo-font/expo-asset native modules — stub it.
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('OtpInput — accessibility (P2.T9)', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    announce.mockRestore();
  });

  const renderInput = (onChange = jest.fn(), onComplete = jest.fn()) =>
    render(
      <ThemeProvider>
        <OtpInput value="" onChange={onChange} onComplete={onComplete} />
      </ThemeProvider>,
    );

  it('labels + hints the hidden input so screen readers land on one meaningful field', () => {
    const { UNSAFE_root: root } = renderInput();
    const input = root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' });
    expect(input.props.accessibilityHint).toBe(
      'Type the 6 digits of the code we sent you. You can also paste the whole code.',
    );
    expect(input.props.accessibilityLiveRegion).toBe('polite');
  });

  it('hides the display cells from assistive tech (single focus target)', () => {
    const { UNSAFE_root: root } = renderInput();
    const cells = root.findByProps({ importantForAccessibility: 'no-hide-descendants' });
    expect(cells.props.accessibilityElementsHidden).toBe(true);
    // The row wrapper must not become an unlabeled focusable "button".
    expect(root.findByProps({ accessibilityElementsHidden: true }).parent.props.accessible).toBe(
      false,
    );
  });

  it('announces digit progress politely on every change', () => {
    const { UNSAFE_root: root } = renderInput();
    const input = root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' });

    fireEvent.changeText(input, '12');
    expect(announce).toHaveBeenLastCalledWith('2 of 6 digits entered');

    fireEvent.changeText(input, '123456');
    expect(announce).toHaveBeenLastCalledWith('6 of 6 digits entered');
  });

  it('fires onComplete when the last digit lands', () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    const { UNSAFE_root: root } = renderInput(onChange, onComplete);
    const input = root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' });

    fireEvent.changeText(input, '12a345678'); // non-digits stripped, capped at length
    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenLastCalledWith('123456');
  });

  it('does not announce when the field is cleared back to empty', () => {
    const { UNSAFE_root: root } = renderInput();
    const input = root.findByProps({ accessibilityLabel: 'Enter the 6-digit code' });

    fireEvent.changeText(input, '');
    expect(announce).not.toHaveBeenCalled();
  });
});
