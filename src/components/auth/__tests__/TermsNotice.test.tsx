import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { ThemeProvider } from '@/theme';

import { TermsNotice } from '../TermsNotice';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/config/env', () => ({
  env: {
    termsUrl: 'https://kanasante.test/terms',
    privacyUrl: 'https://kanasante.test/privacy',
  },
}));

afterEach(() => { jest.restoreAllMocks(); });

it.each([
  ['terms.terms', 'https://kanasante.test/terms'],
  ['terms.privacy', 'https://kanasante.test/privacy'],
])('opens the configured document for %s', async (label, url) => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const screen = render(<ThemeProvider><TermsNotice /></ThemeProvider>);
  fireEvent.press(screen.getByText(label));
  await waitFor(() => expect(open).toHaveBeenCalledWith(url));
});

it('shows a translated message when a document cannot open', async () => {
  jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('Unavailable'));
  const screen = render(<ThemeProvider><TermsNotice /></ThemeProvider>);
  fireEvent.press(screen.getByText('terms.privacy'));
  await waitFor(() => expect(screen.getByText('terms.unavailable')).toBeTruthy());
});
